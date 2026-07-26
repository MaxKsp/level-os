const fs = require('fs');

const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const realProjectRoot = fs.realpathSync.native(projectRoot);
const config = getDefaultConfig(projectRoot);
const existingBlockList = config.resolver.blockList;

config.watchFolders = Array.from(new Set([
  ...config.watchFolders,
  realProjectRoot,
]));
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList
      ? [existingBlockList]
      : []),
  /[/\\]\.cxx[/\\].*/,
  /[/\\]android[/\\](?:app[/\\])?build[/\\].*/,
];

module.exports = config;
