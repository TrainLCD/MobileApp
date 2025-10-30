const { getDefaultConfig } = require("@react-native/metro-config");
const { withSentryConfig } = require("@sentry/react-native/metro");
const config = getDefaultConfig(__dirname);

// Add .d.ts to source extensions
config.resolver.sourceExts.push('d.ts');

module.exports = withSentryConfig(config);