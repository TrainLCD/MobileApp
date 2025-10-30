const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const baseConfig = getSentryExpoConfig(__dirname);

// Add .d.ts to source extensions
baseConfig.resolver.sourceExts.push('d.ts');

module.exports = baseConfig;