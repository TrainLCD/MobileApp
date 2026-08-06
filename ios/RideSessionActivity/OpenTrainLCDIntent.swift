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
// 両方のターゲットに所属させること。コントロールから起動されるAppIntentがExtension側にしか
// 存在しないと、システムがアプリ側でインテントを実行できず長押ししても何も起きない。
//
// NOTE: openAppWhenRunだけではコントロール経由の起動が失敗する既知の不具合があるため、
// OpenURLIntentによるディープリンクも併せて返す。ユニバーサルリンクはiOS 18.0で
// ブラウザが開いてしまう不具合があったため、登録済みのカスタムURLスキームを使う。
@available(iOS 18.0, *)
struct OpenTrainLCDIntent: AppIntent {
  // 文字列リソースが引けない場合でもキー名が露出しないようdefaultValueを添える
  static var title: LocalizedStringResource {
    LocalizedStringResource("openApp", defaultValue: "Open TrainLCD")
  }
  static let openAppWhenRun = true

  func perform() async throws -> some IntentResult & OpensIntent {
    .result(opensIntent: OpenURLIntent(Self.deepLinkURL))
  }

  // Canary/Prodで登録済みのURLスキームを出し分ける。スキーム名はアプリ・Extension双方の
  // Info.plistのCURRENT_SCHEME_NAMEから解決する
  private static var deepLinkURL: URL {
    let schemeName =
      Bundle.main.object(forInfoDictionaryKey: "CURRENT_SCHEME_NAME") as? String
    let urlString =
      schemeName == "CanaryTrainLCD" ? "trainlcd-canary://" : "trainlcd://"
    // 固定文字列のためURL化は必ず成功する
    return URL(string: urlString)!
  }
}
