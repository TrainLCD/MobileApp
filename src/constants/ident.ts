export const DEV_APP_BUNDLE_IDENTIFIER = 'me.tinykitten.trainlcd.dev';
export const DEV_CLIP_BUNDLE_IDENTIFIER = 'me.tinykitten.trainlcd.dev.Clip';
// ローカル検証専用の Android ビルド（android/app/build.gradle の local フレーバー）。
// ストア配信の Canary と applicationId を分けただけの同じ検証用ビルドなので、
// 参照する外部サービスは Canary に合わせる
export const LOCAL_APP_BUNDLE_IDENTIFIER = 'me.tinykitten.trainlcd.local';
