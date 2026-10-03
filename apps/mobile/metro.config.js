const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..', '..');

const config = getDefaultConfig(projectRoot);

// pnpm monorepo: real package files live in the workspace root store
// (../../node_modules/.pnpm), outside the app folder. Metro must be
// allowed to watch and resolve from there.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// NOTE: do NOT enable unstable_enableSymlinks here — with a pnpm store it
// sends Metro's crawler into .pnpm symlink cycles and the first bundle hangs.

module.exports = config;
