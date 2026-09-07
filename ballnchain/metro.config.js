const { getDefaultConfig } = require("expo/metro-config"); // or 'metro-config' if not using Expo

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("wasm");
config.resolver.sourceExts.push("ts", "tsx", "js", "jsx", "json");

module.exports = config;
