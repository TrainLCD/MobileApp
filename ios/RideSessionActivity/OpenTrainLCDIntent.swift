//
//  OpenTrainLCDIntent.swift
//  TrainLCD
//
//  Created by Tsubasa SEKIGUCHI on 2026/08/06.
//  Copyright © 2026 Facebook. All rights reserved.
//

import AppIntents
import Foundation

// ロック画面コントロールのタップでTrainLCD本体を開くインテント。
//
// NOTE: このファイルはアプリ本体（Canary/Prod）とRideSessionActivity Extensionの
// 両方のターゲットに所属させること。openAppWhenRunを立てたAppIntentはExtensionプロセスでは
// 実行できず、システムはアプリ側の定義を使って実行する。アプリ側に定義が無いと実行先が
// 見つからず、コントロールを長押ししても何も起きない。
//
// NOTE: openAppWhenRunはiOS 26でsupportedModes(.foreground(.immediate))へ置き換えられたが、
// supportedModes自体がiOS 26以降のAPIで、本コントロールはiOS 18以降を対象とするため移行できない。
// supportedModesを宣言しない場合の既定実装がopenAppWhenRunの値を引き継ぐ。
//
// NOTE: OpenURLIntentによるディープリンク併用は見送っている。OpenURLIntentはUniversal Linkを
// 前提としたAPIで、本アプリはassociated-domainsを設定していない（applinksを持つのはApp Clipのみ）ため、
// trainlcd://のようなカスタムスキームを渡しても確実な起動経路にならない。
@available(iOS 18.0, *)
struct OpenTrainLCDIntent: AppIntent {
  // 文字列リソースが引けない場合でもキー名が露出しないようdefaultValueを添える
  static var title: LocalizedStringResource {
    LocalizedStringResource("openApp", defaultValue: "Open TrainLCD")
  }
  static let openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    .result()
  }
}
