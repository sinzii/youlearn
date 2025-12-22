const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add HTML to asset extensions so it can be bundled and loaded via expo-asset
config.resolver.assetExts.push('html');

module.exports = config;
