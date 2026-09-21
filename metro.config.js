const path = require("node:path");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const config = getSentryExpoConfig(__dirname);

// Add .d.ts to source extensions
config.resolver.sourceExts.push('d.ts');

// cross-fetch の CommonJS ponyfill は Expo の live bindings 変換と噛み合わず、
// `import * as` の評価で TypeError になるため ES モジュールの shim へ差し替える。
// 詳細は src/lib/crossFetchShim.ts を参照。
const crossFetchShim = path.resolve(__dirname, 'src/lib/crossFetchShim.ts');
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'cross-fetch') {
    return { type: 'sourceFile', filePath: crossFetchShim };
  }
  return upstreamResolveRequest
    ? upstreamResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
