const { getDefaultConfig } = require('expo/metro-config');
const { withSentryConfig } = require('@sentry/react-native/metro');

const baseConfig = getDefaultConfig(__dirname);
const useSentry = process.env.NODE_ENV === 'production';
module.exports = useSentry ? withSentryConfig(baseConfig) : baseConfig;
