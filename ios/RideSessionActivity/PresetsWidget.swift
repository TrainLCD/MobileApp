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
//
// systemMedium / systemLargeは高さに収まるだけ行を並べる(PresetsWidgetRow)。
// systemSmallはウィジェット全体が単一のタップ領域で1件しか開けないため、
// 行を並べず1件を縦に積んで見せる(PresetsWidgetFeatured)。

// 乗車中ウィジェット(HomeScreenWidget)と同じsystemSmall / systemMediumに加え、
// 一覧をまとめて見たい向けにsystemLargeも選べるようにしている。

// 一覧の1行あたりの高さと行間。表示件数はこの値と実際のウィジェット高から導出するため、
// 行の見た目を変えたらこちらも合わせること
private let rowHeight: CGFloat = 40
private let rowSpacing: CGFloat = 6

// ヘッダー(caption2 + アイコン)の高さと、ヘッダーと一覧の間隔
private let headerHeight: CGFloat = 18
private let headerSpacing: CGFloat = 6

// 一覧の行に置くナンバリングサークルの直径
private let rowCircleDiameter: CGFloat = 30

// systemSmallは1件だけを縦に積んで見せる。下に駅名2行と矢印が入るぶん、
// 乗車中ウィジェットのsystemSmall(48pt)よりは小さくする
private let featuredCircleDiameter: CGFloat = 36

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

  var hasStations: Bool {
    !fromStationName.isEmpty && !toStationName.isEmpty
  }

  // 駅名が未取得のプリセットでは路線名だけでも出す
  var routeDescription: String {
    hasStations ? "\(fromStationName) → \(toStationName)" : lineName
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
        // systemLargeのギャラリープレビューが空きだらけにならないよう行数分用意する
        PresetsWidgetItem(
          id: "placeholder-3",
          name: "休日おでかけ",
          fromStationName: "渋谷",
          toStationName: "横浜",
          lineName: "東急東横線",
          lineColor: "DA0442",
          lineSymbol: "TY"
        ),
        PresetsWidgetItem(
          id: "placeholder-4",
          name: "空港へ",
          fromStationName: "品川",
          toStationName: "羽田空港第1・第2ターミナル",
          lineName: "京急本線",
          lineColor: "00BFFF",
          lineSymbol: "KK"
        ),
        PresetsWidgetItem(
          id: "placeholder-5",
          name: "実家",
          fromStationName: "上野",
          toStationName: "大宮",
          lineName: "宇都宮線",
          lineColor: "F68B1E",
          lineSymbol: "JU"
        ),
        PresetsWidgetItem(
          id: "placeholder-6",
          name: "ハイキング",
          fromStationName: "新宿",
          toStationName: "高尾山口",
          lineName: "京王線",
          lineColor: "DD0077",
          lineSymbol: "KO"
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
    .frame(maxWidth: .infinity, height: rowHeight, alignment: .leading)
    // 行全体をタップ領域にする。Spacerだけでは透明部分がヒットしない
    .contentShape(Rectangle())
  }
}

/// systemSmall専用の1件表示。
///
/// 行を並べても1件しかタップできないため件数を増やす意味が無い。
/// 正方形の領域に対して「始発駅 → 終着駅」を横一列に置くと横幅で先に頭打ちになり、
/// 駅名がすぐ省略されるので、縦に積んで1駅あたりの幅をフルに使う。
/// 空いた領域はSpacerで均し、上下に寄った余白が残らないようにする。
struct PresetsWidgetFeatured: View {
  let preset: PresetsWidgetItem

  var body: some View {
    VStack(alignment: .leading, spacing: 0) {
      HomeScreenNumberingCircle(
        lineColor: preset.displayLineColor,
        lineSymbol: preset.displayLineSymbol,
        diameter: featuredCircleDiameter
      )
      Spacer(minLength: 6)
      Text(preset.name)
        .font(.caption)
        .fontWeight(.bold)
        .foregroundStyle(.secondary)
        .lineLimit(1)
      Spacer(minLength: 2)
      if preset.hasStations {
        Text(preset.fromStationName)
          .font(.title3)
          .fontWeight(.bold)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
        Image(systemName: "arrow.down")
          .font(.caption2)
          .foregroundStyle(.secondary)
        Text(preset.toStationName)
          .font(.title3)
          .fontWeight(.bold)
          .lineLimit(1)
          .minimumScaleFactor(0.6)
      } else {
        // 駅名が未取得のときは路線名だけ出す
        Text(preset.lineName)
          .font(.headline)
          .lineLimit(2)
          .minimumScaleFactor(0.7)
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
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
  // 行を並べても1件しかタップできず件数を増やす意味が無いため、1件を大きく見せる
  private var isSingleTapTarget: Bool {
    family == .systemSmall
  }

  /// 与えられた高さに収まる行数。
  /// ファミリーごとに件数を決め打ちすると端末サイズ差で余白が出たり見切れたりするため、
  /// 実際に描画される高さから求める。行の高さはrowHeightで固定しているので計算は一致する。
  private func rowCount(for height: CGFloat) -> Int {
    let available = height - headerHeight - headerSpacing
    guard available > 0 else {
      return 1
    }
    return max(1, Int((available + rowSpacing) / (rowHeight + rowSpacing)))
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
        .lineLimit(1)
      Spacer(minLength: 0)
    }
    .font(.caption2)
    .fontWeight(.bold)
    .foregroundStyle(.secondary)
    // rowCount(for:)がheaderHeightぶんを予約するので、実際の高さも必ずそこへ揃える。
    // Dynamic Typeや長いローカライズ文字列で伸びると最終行が見切れる
    .frame(height: headerHeight, alignment: .leading)
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

  // systemMedium / systemLarge。高さに収まるだけ行を詰めて余白を残さない
  private var listView: some View {
    GeometryReader { proxy in
      VStack(alignment: .leading, spacing: headerSpacing) {
        header
        VStack(alignment: .leading, spacing: rowSpacing) {
          ForEach(entry.presets.prefix(rowCount(for: proxy.size.height))) { preset in
            if let url = presetURL(preset) {
              Link(destination: url) {
                PresetsWidgetRow(preset: preset)
              }
            } else {
              PresetsWidgetRow(preset: preset)
            }
          }
        }
        // 登録件数が収まる行数に満たないときだけ効く。通常は0
        Spacer(minLength: 0)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
  }

  var body: some View {
    if entry.presets.isEmpty {
      emptyView
    } else if isSingleTapTarget, let preset = entry.presets.first {
      // 表示している唯一のプリセットをウィジェット全体のタップ先にする。
      // URLを組めなかった場合はアプリ起動へ倒す
      PresetsWidgetFeatured(preset: preset)
        .widgetURL(presetURL(preset) ?? URL(string: "\(urlScheme)://"))
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
