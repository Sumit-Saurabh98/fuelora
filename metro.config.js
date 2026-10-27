// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Drizzle migrations import .sql files.
config.resolver.sourceExts.push('sql');

module.exports = config;
