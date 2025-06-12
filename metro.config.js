const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

module.exports = mergeConfig(getDefaultConfig(__dirname), config);