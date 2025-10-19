const { getDefaultConfig } = require('expo/metro-config');
const { withSentryConfig } = require('@sentry/react-native/metro');

const baseConfig = getDefaultConfig(__dirname);

// Add .d.ts to source extensions
baseConfig.resolver.sourceExts.push('d.ts');

const useSentry = process.env.NODE_ENV === 'production';
module.exports = useSentry ? withSentryConfig(baseConfig) : baseConfig;
