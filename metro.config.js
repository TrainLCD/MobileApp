const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  getSentryConfig
} = require("@sentry/react-native/metro");

const config = getSentryConfig(__dirname);
module.exports = mergeConfig(getDefaultConfig(__dirname), config);