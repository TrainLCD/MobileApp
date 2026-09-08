#import <React/RCTBridgeModule.h>

// VOICEVOX CORE で日本語アナウンスを端末内で合成するモジュール。
// 本体アプリ (ProdTrainLCD / CanaryTrainLCD) のターゲットにだけ含める。
// App Clip は非圧縮 15MB の上限があり、依存する xcframework (約 18MB) を
// 埋め込めないため、App Clip ターゲットにはこのモジュールもフレームワークも追加しない。
// JS 側は NativeModules.VoicevoxTTSModule の有無で利用可否を判定する。
@interface RCT_EXTERN_MODULE(VoicevoxTTSModule, NSObject)

RCT_EXTERN_METHOD(setup:
                  (NSDictionary *) options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(synthesize:
                  (NSDictionary *) options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(release:
                  (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(sha256:
                  (NSString *) path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

RCT_EXTERN_METHOD(setExcludedFromBackup:
                  (NSString *) path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )

@end
