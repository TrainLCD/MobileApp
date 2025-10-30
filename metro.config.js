const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const config = getSentryExpoConfig(__dirname);

// Add .d.ts to source extensions
config.resolver.sourceExts.push('d.ts');

module.exports = config;