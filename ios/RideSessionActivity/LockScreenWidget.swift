//
//  LockScreenWidget.swift
//  RideSessionActivity
//
//  Created by Tsubasa SEKIGUCHI on 2026/08/06.
//  Copyright © 2026 Facebook. All rights reserved.
//

import SwiftUI
import WidgetKit

// ライブアクティビティ・ロック画面ウィジェット・ホーム画面ウィジェット・
// プリセットウィジェット・ロック画面コントロールを同一Extensionで配信するためのバンドル
@main
struct RideSessionWidgetBundle: WidgetBundle {
  var body: some Widget {
    RideSessionWidget()
    LockScreenWidget()
    HomeScreenWidget()
    PresetsWidget()
    // ControlWidgetはiOS 18以降のみ。Extensionのデプロイターゲットは16.1のため条件付きで追加する
    if #available(iOS 18.0, *) {
      LockScreenControl()
    }
  }
}

struct LockScreenEntry: TimelineEntry {
  // 未乗車時やApp GroupのlineColorが空のときに使うTrainLCDのブランドカラー
  static let fallbackLineColor = "277BC0"

  let date: Date
  let loaded: Bool
  let lineColor: String
  let lineName: String
  let lineSymbol: String
  let boundFor: String

  // Color(hex:)は空文字を渡すとほぼ透明になるため、描画に使う路線色は必ずここを経由する
  var displayLineColor: String {
    lineColor.isEmpty ? Self.fallbackLineColor : lineColor
  }

  static var notLoaded: LockScreenEntry {
    LockScreenEntry(
      date: Date(),
      loaded: false,
      lineColor: fallbackLineColor,
      lineName: String(localized: "lineNotSet"),
      lineSymbol: "?",
      boundFor: String(localized: "destinationNotSet")
    )
  }

  // ロック画面ウィジェット・ホーム画面ウィジェット・ロック画面コントロールで共通のApp Group読み出し
  static func current() -> LockScreenEntry {
    let appGroupID =
      Bundle.main.object(forInfoDictionaryKey: "APP_GROUP_ID") as? String
      ?? "group.me.tinykitten.trainlcd"

    guard let defaults = UserDefaults(suiteName: appGroupID),
      defaults.bool(forKey: "loaded")
    else {
      return .notLoaded
    }

    let lineName = defaults.string(forKey: "lineName") ?? ""
    let lineSymbol = defaults.string(forKey: "lineSymbol") ?? ""

    return LockScreenEntry(
      date: Date(),
      loaded: true,
      lineColor: defaults.string(forKey: "lineColor") ?? "",
      lineName: lineName,
      lineSymbol: lineSymbol.isEmpty ? String(lineName.prefix(1)) : lineSymbol,
      boundFor: defaults.string(forKey: "boundStationName") ?? ""
    )
  }
}

struct LockScreenProvider: TimelineProvider {
  func placeholder(in context: Context) -> LockScreenEntry {
    .notLoaded
  }

  func getSnapshot(
    in context: Context, completion: @escaping (LockScreenEntry) -> Void
  ) {
    completion(.current())
  }

  func getTimeline(
    in context: Context, completion: @escaping (Timeline<LockScreenEntry>) -> Void
  ) {
    // 表示内容はアプリ側がApp Groupへ書き込んだ時点のWidgetCenter経由リロードでのみ変わるため、
    // 時刻ベースの再生成は行わない。ホーム画面ウィジェットもこのProviderを共有する
    completion(Timeline(entries: [.current()], policy: .never))
  }
}

struct LockScreenNumberingCircle: View {
  let lineColor: String
  let lineSymbol: String

  var body: some View {
    ZStack {
      AccessoryWidgetBackground()
      Circle()
        .stroke(Color(hex: lineColor), lineWidth: 6)
        .widgetAccentable()
      Text(lineSymbol)
        .font(.system(.body, design: .rounded))
        .fontWeight(.bold)
        .minimumScaleFactor(0.5)
        .padding(12)
    }
  }
}

struct LockScreenWidgetEntryView: View {
  let entry: LockScreenEntry

  @Environment(\.widgetFamily) var family

  var body: some View {
    switch family {
    case .accessoryCircular:
      circularView
    case .accessoryRectangular:
      rectangularView
    case .accessoryInline:
      inlineView
    default:
      EmptyView()
    }
  }

  var circularView: some View {
    LockScreenNumberingCircle(
      lineColor: entry.displayLineColor,
      lineSymbol: entry.lineSymbol
    )
  }

  var rectangularView: some View {
    HStack(spacing: 8) {
      RoundedRectangle(cornerRadius: 2)
        .fill(Color(hex: entry.displayLineColor))
        .frame(width: 4)
        .widgetAccentable()
      VStack(alignment: .leading, spacing: 2) {
        Text(entry.lineName)
          .font(.headline)
          .fontWeight(.bold)
          .widgetAccentable()
        Text(entry.boundFor)
          .font(.caption)
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  var inlineView: some View {
    Text(
      entry.loaded
        ? String(format: String(localized: "ridingOn"), entry.lineName)
        : "TrainLCD"
    )
  }
}

extension View {
  // containerBackgroundはiOS 17以降必須だが、Extensionのデプロイターゲットが16.1のため互換ラップする
  @ViewBuilder
  fileprivate func lockScreenContainerBackground() -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(.fill.tertiary, for: .widget)
    } else {
      self
    }
  }
}

struct LockScreenWidget: Widget {
  let kind: String = "LockScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LockScreenProvider()) { entry in
      LockScreenWidgetEntryView(entry: entry)
        .lockScreenContainerBackground()
    }
    .configurationDisplayName("TrainLCD")
    .description("TrainLCD")
    .supportedFamilies(
      [
        .accessoryCircular,
        .accessoryRectangular,
        .accessoryInline,
      ]
    )
  }
}

struct LockScreenWidget_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      LockScreenWidgetEntryView(
        entry: LockScreenEntry(
          date: .now,
          loaded: true,
          lineColor: "80C241",
          lineName: "山手線",
          lineSymbol: "JY",
          boundFor: "新宿・渋谷方面"
        )
      )
      .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
    }
  }
}
