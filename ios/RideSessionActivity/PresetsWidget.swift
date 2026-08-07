//
//  PresetsWidget.swift
//  RideSessionActivity
//
//  Copyright © 2026 Facebook. All rights reserved.
//

import SwiftUI
import WidgetKit

// アプリ内で登録したプリセットをホーム画面に並べるウィジェット。
// 行をタップすると `trainlcd://?preset=<SavedRoute.id>` のディープリンクでアプリが起動し、
// 該当プリセットの行き先選択が開く(JS側のuseDeepLink)。
//
// 表示データはPresetsWidgetModuleがApp Groupへ書き込んだJSONを読む。
// 体裁はアプリ内のプリセットカード(PresetCard.tsx)を踏襲し、
// 路線色のナンバリングサークル + プリセット名 + 始発駅→終着駅 で構成する。

// 乗車中ウィジェット(HomeScreenWidget)と同じsystemSmall / systemMediumに加え、
// 一覧をまとめて見たい向けにsystemLargeも選べるようにしている。
// systemSmallとsystemMediumは高さが同じなので収まる行数も同じ
private let compactRowCount = 2
private let largeRowCount = 5

// 行の左に置くナンバリングサークルの直径。
// systemSmallの幅でも駅名に十分な余地が残るよう、乗車中ウィジェット(48pt)より小さくしている
private let rowCircleDiameter: CGFloat = 30

struct PresetsWidgetItem: Codable, Identifiable {
  let id: String
  let name: String
  let fromStationName: String
  let toStationName: String
  let lineName: String
  let lineColor: String
  let lineSymbol: String

  // JS側(PresetsWidgetItem)は路線色・路線記号が引けない場合に空文字を送ってくる
  var displayLineColor: String {
    lineColor.isEmpty ? LockScreenEntry.fallbackLineColor : lineColor
  }

  // 路線記号が無い路線はロック画面ウィジェットと同様に路線名の先頭1文字で代替する
  var displayLineSymbol: String {
    if !lineSymbol.isEmpty {
      return lineSymbol
    }
    return lineName.isEmpty ? "?" : String(lineName.prefix(1))
  }

  // 駅名が未取得のプリセットでは路線名だけでも出す
  var routeDescription: String {
    if fromStationName.isEmpty || toStationName.isEmpty {
      return lineName
    }
    return "\(fromStationName) → \(toStationName)"
  }
}

struct PresetsEntry: TimelineEntry {
  // PresetsWidgetModule.presetsStorageKeyと一致させること
  static let storageKey = "presets"

  let date: Date
  let presets: [PresetsWidgetItem]

  static var empty: PresetsEntry {
    PresetsEntry(date: Date(), presets: [])
  }

  static var placeholder: PresetsEntry {
    PresetsEntry(
      date: Date(),
      presets: [
        PresetsWidgetItem(
          id: "placeholder-1",
          name: "通勤",
          fromStationName: "東京",
          toStationName: "新宿",
          lineName: "山手線",
          lineColor: "80C241",
          lineSymbol: "JY"
        ),
        PresetsWidgetItem(
          id: "placeholder-2",
          name: "帰宅",
          fromStationName: "新宿",
          toStationName: "東京",
          lineName: "中央線快速",
          lineColor: "F15A22",
          lineSymbol: "JC"
        ),
      ]
    )
  }

  static func current() -> PresetsEntry {
    let appGroupID =
      Bundle.main.object(forInfoDictionaryKey: "APP_GROUP_ID") as? String
      ?? "group.me.tinykitten.trainlcd"

    guard let defaults = UserDefaults(suiteName: appGroupID),
      let json = defaults.string(forKey: storageKey),
      let data = json.data(using: .utf8),
      let presets = try? JSONDecoder().decode([PresetsWidgetItem].self, from: data)
    else {
      return .empty
    }

    return PresetsEntry(date: Date(), presets: presets)
  }
}

struct PresetsProvider: TimelineProvider {
  func placeholder(in context: Context) -> PresetsEntry {
    .placeholder
  }

  func getSnapshot(in context: Context, completion: @escaping (PresetsEntry) -> Void) {
    // ウィジェットギャラリーのプレビューは実データが無いとほぼ空になるためダミーを見せる
    completion(context.isPreview ? .placeholder : .current())
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PresetsEntry>) -> Void) {
    // 表示内容はアプリがApp Groupへ書き込んだ際のreloadTimelinesでのみ変わる
    completion(Timeline(entries: [.current()], policy: .never))
  }
}

struct PresetsWidgetRow: View {
  let preset: PresetsWidgetItem

  var body: some View {
    HStack(spacing: 10) {
      // ホーム画面ウィジェット(乗車中)と同じサークル。路線の見分けが一目で付くようにする
      HomeScreenNumberingCircle(
        lineColor: preset.displayLineColor,
        lineSymbol: preset.displayLineSymbol,
        diameter: rowCircleDiameter
      )
      VStack(alignment: .leading, spacing: 1) {
        Text(preset.name)
          .font(.subheadline)
          .fontWeight(.bold)
          .lineLimit(1)
        Text(preset.routeDescription)
          .font(.caption2)
          .foregroundStyle(.secondary)
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    // 行全体をタップ領域にする。Spacerだけでは透明部分がヒットしない
    .contentShape(Rectangle())
  }
}

struct PresetsWidgetEntryView: View {
  let entry: PresetsEntry

  @Environment(\.widgetFamily) var family

  private var schemeName: String? {
    Bundle.main.infoDictionary?["CURRENT_SCHEME_NAME"] as? String
  }

  private var urlScheme: String {
    schemeName == "CanaryTrainLCD" ? "trainlcd-canary" : "trainlcd"
  }

  // systemSmallはウィジェット全体が単一のタップ領域で、行ごとのLinkが効かない。
  // 行を並べるとタップ先と見た目が食い違うため、1件だけ出してwidgetURLで開く
  private var isSingleTapTarget: Bool {
    family == .systemSmall
  }

  private var rowCount: Int {
    if isSingleTapTarget {
      return 1
    }
    return family == .systemLarge ? largeRowCount : compactRowCount
  }

  private var visiblePresets: [PresetsWidgetItem] {
    Array(entry.presets.prefix(rowCount))
  }

  private func presetURL(_ preset: PresetsWidgetItem) -> URL? {
    guard
      let encoded = preset.id.addingPercentEncoding(
        withAllowedCharacters: .alphanumerics)
    else {
      return nil
    }
    return URL(string: "\(urlScheme)://?preset=\(encoded)")
  }

  // ロック画面コントロール・乗車中ウィジェットと同じtramシンボルで見た目を揃える
  private var header: some View {
    HStack(spacing: 4) {
      Image(systemName: "tram.fill")
      Text("presetsWidgetTitle")
      Spacer(minLength: 0)
    }
    .font(.caption2)
    .fontWeight(.bold)
    .foregroundStyle(.secondary)
  }

  private var emptyView: some View {
    VStack(alignment: .leading, spacing: 6) {
      header
      Spacer(minLength: 0)
      Text("presetsWidgetEmpty")
        .font(.caption)
        .foregroundStyle(.secondary)
        .lineLimit(3)
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    // プリセット未登録時はウィジェット全体をアプリ起動のタップ領域にする
    .widgetURL(URL(string: "\(urlScheme)://"))
  }

  private var listView: some View {
    VStack(alignment: .leading, spacing: 6) {
      header
      ForEach(visiblePresets) { preset in
        // systemSmallではLinkが個別のタップ領域にならないので包まない。
        // 代わりにウィジェット全体へwidgetURLを張る
        if !isSingleTapTarget, let url = presetURL(preset) {
          Link(destination: url) {
            PresetsWidgetRow(preset: preset)
          }
        } else {
          PresetsWidgetRow(preset: preset)
        }
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }

  var body: some View {
    if entry.presets.isEmpty {
      emptyView
    } else if isSingleTapTarget {
      // 表示している唯一のプリセットをウィジェット全体のタップ先にする。
      // URLを組めなかった場合はアプリ起動へ倒す
      listView
        .widgetURL(
          visiblePresets.first.flatMap(presetURL) ?? URL(string: "\(urlScheme)://")
        )
    } else {
      listView
    }
  }
}

extension View {
  // HomeScreenWidgetと同じくiOS 16.1のデプロイターゲットに合わせて互換ラップする
  @ViewBuilder
  fileprivate func presetsContainerBackground() -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(.fill.tertiary, for: .widget)
    } else {
      padding()
    }
  }
}

struct PresetsWidget: Widget {
  // PresetsWidgetModule側のpresetsWidgetKindと一致させること
  let kind: String = "PresetsWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: PresetsProvider()) { entry in
      PresetsWidgetEntryView(entry: entry)
        .presetsContainerBackground()
    }
    .configurationDisplayName(String(localized: "presetsWidgetTitle"))
    .description(String(localized: "presetsWidgetDescription"))
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

struct PresetsWidget_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      PresetsWidgetEntryView(entry: .placeholder)
        .previewContext(WidgetPreviewContext(family: .systemSmall))
      PresetsWidgetEntryView(entry: .placeholder)
        .previewContext(WidgetPreviewContext(family: .systemMedium))
      PresetsWidgetEntryView(entry: .placeholder)
        .previewContext(WidgetPreviewContext(family: .systemLarge))
      PresetsWidgetEntryView(entry: .empty)
        .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
  }
}
