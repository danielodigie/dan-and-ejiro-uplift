# Generates Uplift PWA icons (brand: sunrise on warm yellow) into apps/web/public/icons/.
# Run: powershell -ExecutionPolicy Bypass -File scripts/gen-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'apps/web/public/icons'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$yellow = [System.Drawing.ColorTranslator]::FromHtml('#FFC400')
$orange = [System.Drawing.ColorTranslator]::FromHtml('#FF4D00')
$ink = [System.Drawing.ColorTranslator]::FromHtml('#111111')

function New-UpliftIcon([int]$size, [string]$path, [switch]$maskable) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear($yellow)

  $pad = [int]($size * 0.06)
  $pen = New-Object System.Drawing.Pen($ink, [Math]::Max(4, $size * 0.035))
  $g.DrawRectangle($pen, $pad, $pad, $size - 2 * $pad - 1, $size - 2 * $pad - 1)

  # Art box: full-bleed normally, 80% centered for maskable safe zone.
  if ($maskable) {
    $m = [int]($size * 0.10)
    $ax = $m; $ay = $m; $aw = $size - 2 * $m; $ah = $size - 2 * $m
  } else {
    $ax = 0; $ay = 0; $aw = $size; $ah = $size
  }

  # Sun: orange disc above a horizon bar, three rays.
  $sunR = $aw * 0.20
  $cx = $ax + $aw / 2
  $cy = $ay + $ah * 0.44
  $brush = New-Object System.Drawing.SolidBrush($orange)
  $g.FillEllipse($brush, $cx - $sunR, $cy - $sunR, $sunR * 2, $sunR * 2)
  $horizonY = $ay + $ah * 0.62
  $barH = [Math]::Max(4, $size * 0.045)
  $g.FillRectangle((New-Object System.Drawing.SolidBrush($ink)), $ax + $aw * 0.18, $horizonY, $aw * 0.64, $barH)
  $rayPen = New-Object System.Drawing.Pen($ink, [Math]::Max(3, $size * 0.03))
  $rayPen.StartCap = 'Round'; $rayPen.EndCap = 'Round'
  $r1 = $sunR * 1.35; $r2 = $sunR * 1.68
  foreach ($deg in @(210, 270, 330)) {
    $rad = $deg * [Math]::PI / 180
    $g.DrawLine($rayPen,
      ($cx + [Math]::Cos($rad) * $r1), ($cy + [Math]::Sin($rad) * $r1),
      ($cx + [Math]::Cos($rad) * $r2), ($cy + [Math]::Sin($rad) * $r2))
  }

  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "wrote $path"
}

function Resize-Png([string]$src, [int]$size, [string]$dst) {
  $img = [System.Drawing.Image]::FromFile($src)
  $small = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($small)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $size, $size)
  $g.Dispose(); $img.Dispose()
  $small.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $small.Dispose()
  Write-Output "wrote $dst"
}

$big = Join-Path $outDir 'icon-512.png'
New-UpliftIcon -size 512 -path $big
New-UpliftIcon -size 512 -path (Join-Path $outDir 'icon-maskable-512.png') -maskable
Resize-Png -src $big -size 192 -dst (Join-Path $outDir 'icon-192.png')
Resize-Png -src $big -size 180 -dst (Join-Path $outDir 'icon-180.png')
