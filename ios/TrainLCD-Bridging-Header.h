#import <React/RCTBridgeModule.h>

// ios/Modules/VitsTTS の Swift から ONNX Runtime の C API を呼ぶためのヘッダ。
// 実体はリポジトリに含めず、scripts/fetch-voicevox-frameworks.mjs が
// ios/Frameworks/onnxruntime-headers/ へ取得する（HEADER_SEARCH_PATHS に登録済み）。
// リンク先は VOICEVOX 用に埋め込んである voicevox_onnxruntime.framework で、
// 公開シンボル OrtGetApiBase から C API の全関数ポインタを引く。
#import "onnxruntime_c_api.h"
