# Builds a signed debug APK for Dan and Ejiro Uplift on Windows (no admin needed).
# Usage:  powershell -ExecutionPolicy Bypass -File scripts/build-apk.ps1
#
# What it does:
#   1. Stages the repo to C:\uplift when the repo path is too long
#      (Windows MAX_PATH breaks the NDK build past ~260 chars).
#   2. pnpm install (hoisted layout + SDK 51 version pins from package.json).
#   3. `expo prebuild` (creates apps/mobile/android) + applies 3 patches:
#        a. settings.gradle: anchored require.resolve for the RN gradle plugin
#           (avoids duplicate includeBuild under pnpm).
#        b. gradle.properties: kotlin.jvm.target.validation.mode=warning.
#        c. root build.gradle: force Kotlin jvmTarget 17 (matches JDK 17).
#   4. Runs Gradle assembleDebug with the live Render API baked in.
#   5. Verifies (apksigner + aapt + SHA-256) and stages dist-apk/uplift-<ver>-debug.apk.
#
# One-time machine setup (also no admin): JDK 17 + Android SDK via
#   scripts gen steps documented in DOC/70-launch-checklist.md, or simply:
#   - Temurin 17 zip -> %LOCALAPPDATA%\Android\jdk17\<ver>
#   - cmdline-tools -> %LOCALAPPDATA%\Android\Sdk, then install
#     "platform-tools" "platforms;android-34" "build-tools;34.0.0", accept licenses.
$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
$ShortRoot = 'C:\uplift'
$ApiUrl = 'https://uplift-api-dkln.onrender.com'

$JdkHome = Get-ChildItem "$env:LOCALAPPDATA\Android\jdk17\jdk-*" -Directory | Select-Object -First 1 -ExpandProperty FullName
if (-not $JdkHome) { throw "JDK 17 not found under %LOCALAPPDATA%\Android\jdk17" }
$env:JAVA_HOME = $JdkHome
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
if (-not (Test-Path "$env:ANDROID_HOME\build-tools\34.0.0\apksigner.bat")) { throw "Android SDK 34.0.0 not found under $env:ANDROID_HOME" }
$env:EXPO_PUBLIC_API_URL = $ApiUrl
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;" + $env:Path

# 1. Work from a short path (MAX_PATH). Copy tracked sources if needed.
$WorkRoot = $RepoRoot
if ($RepoRoot.Length -gt 20 -or $RepoRoot -match ' ') {
  Write-Output "Repo path is long; staging a short-path copy at $ShortRoot ..."
  New-Item -ItemType Directory -Path $ShortRoot -Force | Out-Null
  robocopy $RepoRoot $ShortRoot /E /XD node_modules .git .expo build .gradle /XF "*.log" /NFL /NDL /NJH /NJS | Out-Null
  $WorkRoot = $ShortRoot
}
Set-Location $WorkRoot

# 2. Install (uses committed .npmrc + pnpm.overrides + mobile pins).
& "$env:APPDATA\npm\pnpm.cmd" install
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }

# 3. Prebuild + patches (idempotent).
if (-not (Test-Path "apps/mobile/android/gradlew.bat")) {
  Push-Location "apps/mobile"
  $env:CI = '1'
  & ".\node_modules\.bin\expo.cmd" prebuild --platform android
  Pop-Location
}
$settings = "apps/mobile/android/settings.gradle"
(Get-Content $settings -Raw) -replace `
  "require.resolve\('@react-native/gradle-plugin/package\.json'\)", `
  "require.resolve('@react-native/gradle-plugin/package.json', { paths: [require.resolve('react-native/package.json')] })" |
  Set-Content $settings -NoNewline
if (-not (Select-String -Path "apps/mobile/android/gradle.properties" -Pattern "kotlin.jvm.target.validation.mode" -Quiet)) {
  Add-Content "apps/mobile/android/gradle.properties" "`nkotlin.jvm.target.validation.mode=warning"
}
$rootGradle = "apps/mobile/android/build.gradle"
$t = Get-Content $rootGradle -Raw
if ($t -notmatch 'KotlinCompile') {
  $t = $t -replace '// Top-level build file', "import org.jetbrains.kotlin.gradle.tasks.KotlinCompile`n`n// Top-level build file"
  $t = $t -replace 'apply plugin: "com.facebook.react.rootproject"',
    "apply plugin: `"com.facebook.react.rootproject`"`n`nsubprojects {`n    tasks.withType(KotlinCompile).configureEach {`n        kotlinOptions.jvmTarget = '17'`n    }`n}"
  Set-Content $rootGradle $t -NoNewline
}
"sdk.dir=$($env:ANDROID_HOME -replace '\\','/')" | Set-Content "apps/mobile/android/local.properties" -Encoding Ascii

# 4. Build (release variant: embedded production JS, standalone - the debug
# variant only loads JS from a dev server and cannot run on its own).
Push-Location "apps/mobile/android"
& ".\gradlew.bat" assembleRelease --console=plain
if ($LASTEXITCODE -ne 0) { throw "Gradle assembleRelease failed - see output above" }
Pop-Location

# 5. Verify + stage.
$apk = "apps/mobile/android/app/build/outputs/apk/release/app-release.apk"
$bt = "$env:ANDROID_HOME\build-tools\34.0.0"
& "$bt\apksigner.bat" verify --print-certs $apk
if ($LASTEXITCODE -ne 0) { throw "apksigner verification failed" }
& "$bt\aapt.exe" dump badging $apk | Select-String -Pattern "^(package|launchable-activity)"
$ver = (Get-Content "apps/mobile/app.json" | ConvertFrom-Json).expo.version
New-Item -ItemType Directory -Path "dist-apk" -Force | Out-Null
$out = "dist-apk/uplift-v$ver-release.apk"
Copy-Item $apk $out -Force
Write-Output "SHA-256: $((Get-FileHash $out -Algorithm SHA256).Hash)"
Write-Output "STAGED: $WorkRoot\$out"
