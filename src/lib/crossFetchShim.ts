// metro.config.js で `cross-fetch` の解決先をこのファイルへ差し替えている。
// cross-fetch の react-native-ponyfill は CommonJS で列挙可能な `default` を生やすため、
// Expo の importExportLiveBindings が生成する `_interopNamespace` が `default` を
// getter で写した後に `n.default = e` を代入して TypeError になり、graphql-request の
// `import * as CrossFetch from 'cross-fetch'` の評価で起動が止まる。
// ES モジュールとして出せば `__esModule` が付き、ラッパーを通らずにそのまま返る。
export const fetch = globalThis.fetch;
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
export default fetch;
