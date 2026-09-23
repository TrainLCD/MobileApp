#import <React/RCTBridgeModule.h>

// VITS で英語アナウンスを端末内で合成するモジュール。
// 本体アプリ (ProdTrainLCD / CanaryTrainLCD) のターゲットにだけ含める。
// 推論には VOICEVOX と同じ voicevox_onnxruntime.framework を使うため、その
// framework を埋め込めない App Clip では利用できない (非圧縮 15MB の上限)。
// JS 側は NativeModules.VitsTTSModule の有無で利用可否を判定する。
@interface RCT_EXTERN_MODULE(VitsTTSModule, NSObject)

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
