//
//  LockScreenControl.swift
//  RideSessionActivity
//
//  Created by Tsubasa SEKIGUCHI on 2026/08/06.
//  Copyright © 2026 Facebook. All rights reserved.
//

import SwiftUI
import WidgetKit

// ロック画面最下部（懐中電灯・カメラと同じ列）とコントロールセンターに置ける円形コントロール。
// iOS 18で追加されたControlWidgetを利用するため、旧OSではWidgetBundleから除外される。

// ロック画面ウィジェットと同じApp Groupの値をコントロール表示用に整形する
@available(iOS 18.0, *)
struct LockScreenControlValue: Sendable {
  // 未乗車時やApp Groupが空のときに使うTrainLCDのブランドカラー
  private static let fallbackLineColor = "277BC0"

  let loaded: Bool
  let lineName: String
  let lineColor: String
  let boundFor: String

  init(entry: LockScreenEntry) {
    loaded = entry.loaded
    lineName = entry.lineName
    lineColor = entry.lineColor
    boundFor = entry.boundFor
  }

  // コントロールセンターでのタイトル。未乗車時は路線名の代わりにアプリ名を出す
  var title: String {
    loaded ? lineName : "TrainLCD"
  }

  var subtitle: String {
    boundFor
  }

  var symbolName: String {
    loaded ? "tram.fill" : "tram"
  }

  // Color(hex:)は空文字を渡すとほぼ透明になるため、必ず既定色へフォールバックする
  var tint: Color {
    Color(hex: lineColor.isEmpty ? Self.fallbackLineColor : lineColor)
  }
}

@available(iOS 18.0, *)
struct LockScreenControlProvider: ControlValueProvider {
  var previewValue: LockScreenControlValue {
    LockScreenControlValue(entry: .notLoaded)
  }

  func currentValue() async throws -> LockScreenControlValue {
    LockScreenControlValue(entry: .current())
  }
}

// タップ時に実行するOpenTrainLCDIntentはアプリ本体とも共有するためOpenTrainLCDIntent.swiftに置く
@available(iOS 18.0, *)
struct LockScreenControl: ControlWidget {
  // LiveActivityModule側のreloadControls(ofKind:)と一致させること
  static let kind = "me.tinykitten.trainlcd.LockScreenControl"

  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(
      kind: Self.kind,
      provider: LockScreenControlProvider()
    ) { value in
      ControlWidgetButton(action: OpenTrainLCDIntent()) {
        Label {
          Text(value.title)
        } icon: {
          Image(systemName: value.symbolName)
        }
        Text(value.subtitle)
      }
      .tint(value.tint)
    }
    .displayName("TrainLCD")
    .description(
      LocalizedStringResource(
        "controlDescription",
        defaultValue: "Opens TrainLCD from the Lock Screen or Control Center."
      )
    )
  }
}
