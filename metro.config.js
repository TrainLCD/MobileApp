const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  getSentryConfig
} = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryConfig(__dirname);

module.exports = mergeConfig(getDefaultConfig(__dirname), config);