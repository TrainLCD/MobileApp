//
//  HomeScreenWidget.swift
//  RideSessionActivity
//
//  Created by Tsubasa SEKIGUCHI on 2026/08/06.
//  Copyright © 2026 Facebook. All rights reserved.
//

import SwiftUI
import WidgetKit

// ホーム画面(systemSmall / systemMedium)に置けるウィジェット。
// 表示データはロック画面ウィジェットと同じApp Group(LockScreenEntry)を共有する。
//
// 見た目はwatchOSのスマートスタック向けライブアクティビティ(SmartStackLiveActivityContentView)を踏襲し、
// 路線色のベタ塗り + 乗算グラデーションを面全体に敷く。ロック画面・watchOSのアクセサリ系は
// システムが着色するため路線色を面で出せないが、ホーム画面はウィジェット側が背景を持てるので
// 「どの路線に乗っているか」を文字を読む前に色で判別できるようにしている。
//
// このファイルにはプリセットウィジェット(PresetsWidget.swift)と共有する
// 背景・配色・ナンバリングバッジも置いている。

/// 路線色の相対輝度(0...1)。
///
/// `Color(hex:)` と同じ書式(3 / 6 / 8桁、`#` 付きも可)を受け付ける。
/// WCAGのガンマ補正まで行うと路線色の見た目より暗く判定されるため、知覚輝度の近似で足りる。
func lineColorLuminance(_ hex: String) -> Double {
  let trimmed = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
  var int: UInt64 = 0
  Scanner(string: trimmed).scanHexInt64(&int)

  let r, g, b: UInt64
  switch trimmed.count {
  case 3:  // RGB (12-bit)
    (r, g, b) = ((int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
  case 6:  // RGB (24-bit)
    (r, g, b) = (int >> 16, int >> 8 & 0xFF, int & 0xFF)
  case 8:  // ARGB (32-bit)
    (r, g, b) = (int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
  default:
    return 0
  }

  return (0.299 * Double(r) + 0.587 * Double(g) + 0.114 * Double(b)) / 255
}

// 白文字が読めなくなる明るさの境目。
// 山手線(#80C241)のような中間色は白のままにしたいので、総武線(#FFD400)クラスの
// 明るい路線色だけが黒へ倒れるよう高めに取っている
private let lightLineLuminanceThreshold = 0.7

/// 路線色の面に載せる文字・アイコンの色。
///
/// 路線色は紺色から黄色まで幅があり白固定では読めない路線が出るため、輝度で白黒を切り替える。
/// Android版(`WidgetTheme.onLineColor`)と同じ式・同じ閾値にしている。
///
/// ライブアクティビティ譲りの白文字を基本に保ったまま極端に明るい路線色だけを救うための
/// ヒューリスティックであり、全路線色でWCAGのコントラスト比を満たすことは保証しない。
/// 基準を満たす必要が出たら、相対輝度から白黒のコントラスト比が高い方を選ぶ実装へ差し替える
/// (中間色の路線が黒文字へ倒れるため、見た目は現行から大きく変わる)。
func lineForegroundColor(for lineColor: String) -> Color {
  lineColorLuminance(lineColor) > lightLineLuminanceThreshold ? .black : .white
}

/// 路線色を主役にしたウィジェットの背景。
///
/// ライブアクティビティ(`SmartStackLiveActivityContentView`)の「路線色ベタ + グレーの乗算グラデーション」を
/// 踏襲する。ホーム画面はアクセサリ系より面積が広く、上下方向のグラデーションだけでは単調になるので
/// 斜めに流し、乗算で沈んだぶんを戻すハイライトを対角へ足している。
struct LineColorBackground: View {
  let lineColor: String

  var body: some View {
    ZStack {
      Rectangle()
        .fill(Color(hex: lineColor))

      // ライブアクティビティと同じ乗算グラデーション。始点側を落として奥行きを出す
      Rectangle()
        .fill(
          LinearGradient(
            colors: [.gray, .clear],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
          .opacity(0.5)
        )
        .blendMode(.multiply)

      // 乗算だけだと面全体が沈むため、対角側に光を残して抜けを作る
      Rectangle()
        .fill(
          LinearGradient(
            colors: [.clear, .white.opacity(0.22)],
            startPoint: .center,
            endPoint: .bottomTrailing
          )
        )
    }
  }
}

/// 路線色の面に載せるナンバリングバッジ。
///
/// 背景が路線色で塗られている以上、従来の「路線色で縁取った円」では面に埋もれる。
/// 前景色(白か黒)で塗り潰して記号側を路線色へ反転させることで、
/// 駅ナンバリングの標識と同じ見え方にしつつ視認性を上げる。
struct LineNumberingBadge: View {
  let lineColor: String
  let lineSymbol: String
  let diameter: CGFloat

  var body: some View {
    Circle()
      .fill(lineForegroundColor(for: lineColor))
      .frame(width: diameter, height: diameter)
      .overlay(alignment: .center) {
        Text(lineSymbol)
          .font(.system(size: diameter * 0.4, weight: .heavy, design: .rounded))
          .foregroundStyle(Color(hex: lineColor))
          .minimumScaleFactor(0.5)
          .lineLimit(1)
          // 縮小された文字も中央揃えにし、円の寸法は文字幅に左右されないようにします。
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
          .padding(diameter * 0.18)
      }
    // 面に浮いて見えるだけの最小限の影。強くすると路線色が濁る
    .shadow(color: .black.opacity(0.18), radius: 3, y: 1)
  }
}

/// 路線色の面に載せる小見出し用のカプセル。
///
/// 背景が単色なので、そのまま文字を置くと路線色に溶けて読み取りにくい。
/// 前景色を薄く敷いて一段持ち上げる。
struct LineColorChip<Content: View>: View {
  let lineColor: String
  @ViewBuilder let content: Content

  var body: some View {
    content
      .padding(.horizontal, 8)
      .padding(.vertical, 3)
      .background(
        Capsule().fill(lineForegroundColor(for: lineColor).opacity(0.18))
      )
  }
}

// 乗車中とプリセットで余白・路線見出し・駅名の組み方を共有する。
struct WidgetLineHeader: View {
  let lineColor: String
  let lineSymbol: String
  let lineName: String
  var boundFor: String = ""
  var boundFontSize: CGFloat = 14
  var boundFontWeight: Font.Weight = .regular
  var lineNameLineLimit: Int = 2

  var body: some View {
    HStack(spacing: 8) {
      LineNumberingBadge(lineColor: lineColor, lineSymbol: lineSymbol, diameter: 28)
      VStack(alignment: .leading, spacing: 2) {
        Text(lineName)
          .font(.system(size: 12, weight: .semibold))
          .lineLimit(lineNameLineLimit)
          .minimumScaleFactor(0.8)
        if !boundFor.isEmpty {
          Text(boundFor)
            .font(.system(size: boundFontSize, weight: boundFontWeight))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
        }
      }
    }
  }
}

struct WidgetStations: View {
  let from: String
  let to: String
  let vertical: Bool
  var fontSize: CGFloat = 24
  var fromNumber: String = ""
  var toNumber: String = ""

  // 表示する駅の片方でも番号を持つ場合だけ、両側に番号用の領域を確保します。
  private var showsNumberSlot: Bool {
    (!from.isEmpty && !fromNumber.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
      || (!to.isEmpty && !toNumber.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
  }

  /// 番号欄が必要な場合に、駅名の下に番号を中央揃えで表示します。
  private func station(_ name: String, number: String) -> some View {
    let formattedNumber = number.trimmingCharacters(in: .whitespacesAndNewlines)
      .replacingOccurrences(of: "^([A-Za-z]+)([0-9]+)$", with: "$1-$2", options: .regularExpression)
    return Text(name)
      .font(.system(size: fontSize, weight: .bold))
      .lineLimit(1)
      .minimumScaleFactor(0.6)
      // 高さ不足で駅名まで縮めず、横幅が足りない場合だけ縮小します。
      .fixedSize(horizontal: false, vertical: true)
      .frame(height: fontSize)
      // 片方でも番号がある場合は、欠番側にも同じ最小幅を使います。
      .frame(minWidth: showsNumberSlot ? 48 : 0)
      // 番号の行高14ptを保ち、駅名の下の余白に2pt重ねて間隔を詰めます。
      // 番号の文字幅は駅名の配置に影響させません。
      .padding(.bottom, showsNumberSlot ? 12 : 0)
      .overlay(alignment: .bottom) {
        if showsNumberSlot {
          Text(formattedNumber.isEmpty ? " " : formattedNumber)
            .font(.system(size: 11, weight: .bold))
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(maxWidth: .infinity)
            .frame(height: 14)
            .accessibilityHidden(formattedNumber.isEmpty)
        }
      }
    // 中央揃えは駅名の幅の中だけで行い、横並びの8pt間隔は維持します。
    .frame(maxWidth: vertical ? .infinity : nil, alignment: .leading)
  }

  var body: some View {
    if vertical {
      VStack(alignment: .leading, spacing: 0) {
        if !from.isEmpty { station(from, number: fromNumber) }
        if !from.isEmpty && !to.isEmpty {
          Image(systemName: "arrow.down")
            .font(.system(size: 10, weight: .semibold))
            .frame(height: 12)
        }
        if !to.isEmpty { station(to, number: toNumber) }
      }
    } else {
      HStack(spacing: 8) {
        if !from.isEmpty { station(from, number: fromNumber) }
        if !from.isEmpty && !to.isEmpty {
          Image(systemName: "arrow.right").font(.system(size: 14, weight: .semibold))
        }
        if !to.isEmpty { station(to, number: toNumber) }
      }
    }
  }
}

struct HomeScreenWidgetEntryView: View {
  let entry: LockScreenEntry
  @Environment(\.widgetFamily) var family

  private var hasStationInfo: Bool {
    entry.loaded && (!entry.stationName.isEmpty || !entry.nextStationName.isEmpty)
  }

  var body: some View {
    // 見出しと駅名の間を伸ばさず、内容全体を上下中央に置く。
    VStack(alignment: .leading, spacing: family == .systemSmall ? 2 : 6) {
      if family == .systemMedium {
        HStack(spacing: 4) {
          Image(systemName: entry.loaded ? "tram.fill" : "tram")
          Text("TrainLCD")
        }
        .font(.caption2)
        .fontWeight(.bold)
      }
      WidgetLineHeader(
        lineColor: entry.displayLineColor,
        lineSymbol: entry.displayLineSymbol,
        lineName: entry.lineName,
        boundFor: hasStationInfo ? entry.boundFor : "",
        // 駅情報がない場合は縦方向に余裕があるため、路線名を2行で表示します。
        lineNameLineLimit: family == .systemSmall && hasStationInfo ? 1 : 2)
      if hasStationInfo {
        WidgetStations(from: entry.stationName, to: entry.nextStationName,
                       vertical: family == .systemSmall, fontSize: 24,
                       fromNumber: entry.stationNumber, toNumber: entry.nextStationNumber)
      } else {
        // 更新前の保存データ・未乗車でも架空の駅名を補わず、従来の方面を表示する。
        Text(entry.boundFor)
          .font(.headline)
          .lineLimit(2)
          .minimumScaleFactor(0.7)
      }
      if family == .systemMedium, entry.loaded, let updatedAt = entry.updatedAt {
        Text("\(String(localized: "lastUpdated")) \(updatedAt.formatted(date: .omitted, time: .shortened))")
          .font(.system(size: 10))
          .foregroundStyle(lineForegroundColor(for: entry.displayLineColor).opacity(0.8))
          .lineLimit(1)
          .minimumScaleFactor(0.8)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    .foregroundStyle(lineForegroundColor(for: entry.displayLineColor))
  }
}

extension View {
  // containerBackgroundはiOS 17以降必須だが、Extensionのデプロイターゲットが16.1のため互換ラップする。
  // iOS 16にはコンテンツマージンが無く端まで描画されてしまうので、その場合のみ自前で余白を付ける。
  // プリセットウィジェットとも共有するのでfileprivateにはしない
  @ViewBuilder
  func lineColorContainerBackground(_ lineColor: String) -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(for: .widget) {
        LineColorBackground(lineColor: lineColor)
      }
    } else {
      padding()
        .background(LineColorBackground(lineColor: lineColor))
    }
  }
}

struct HomeScreenWidget: Widget {
  // LiveActivityModule側のreloadTimelines(ofKind:)と一致させること
  let kind: String = "HomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LockScreenProvider()) { entry in
      HomeScreenWidgetEntryView(entry: entry)
        .lineColorContainerBackground(entry.displayLineColor)
    }
    .configurationDisplayName("TrainLCD")
    .description(String(localized: "widgetDescription"))
    .supportedFamilies(
      [
        .systemSmall,
        .systemMedium,
      ]
    )
  }
}

// 一覧の24ptと見出しの28ptで、1文字・複数文字・代替文字の中心を比較します。
struct LineNumberingBadge_Previews: PreviewProvider {
  static var previews: some View {
    VStack(spacing: 16) {
      ForEach([CGFloat(24), CGFloat(28)], id: \.self) { diameter in
        HStack(spacing: 16) {
          ForEach(["H", "JC", "W", "ABC", "東", "?"], id: \.self) { symbol in
            LineNumberingBadge(lineColor: "F15A22", lineSymbol: symbol, diameter: diameter)
              .overlay {
                // 円と文字を同じ中心線で確認するためのガイドです。
                Rectangle().fill(Color.blue.opacity(0.4)).frame(width: 0.5)
              }
          }
        }
      }
    }
    .padding()
    .background(Color.gray)
    .previewLayout(.sizeThatFits)
  }
}

struct HomeScreenWidget_Previews: PreviewProvider {
  private static var entry: LockScreenEntry {
    LockScreenEntry(
      date: .now,
      loaded: true,
      lineColor: "80C241",
      lineName: "山手線",
      lineSymbol: "JY",
      boundFor: "新宿・渋谷方面",
      stationName: "新宿",
      nextStationName: "代々木",
      stationNumber: "JY-17",
      nextStationNumber: "JY-18",
      updatedAt: .now
    )
  }

  static var previews: some View {
    Group {
      HomeScreenWidgetEntryView(entry: entry)
        .lineColorContainerBackground(entry.displayLineColor)
        .previewContext(WidgetPreviewContext(family: .systemSmall))
      HomeScreenWidgetEntryView(entry: entry)
        .lineColorContainerBackground(entry.displayLineColor)
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
  }
}

// 駅情報・路線記号がない場合も、長い路線名を複数行で識別できることを確認します。
struct HomeScreenWidgetMissingStations_Previews: PreviewProvider {
  static var previews: some View {
    HomeScreenWidgetEntryView(entry: LockScreenEntry(
      date: .now, loaded: true, lineColor: "F9C900",
      lineName: "名古屋市営地下鉄東山線", lineSymbol: "", boundFor: "藤が丘方面",
      stationName: "", nextStationName: ""))
      .lineColorContainerBackground("F9C900")
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}

// 片方が欠番でも位置が揃い、両方が欠番なら番号用の領域がなくなることを確認します。
struct WidgetStationNumbers_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      ForEach([true, false], id: \.self) { vertical in
        VStack(alignment: .leading, spacing: 16) {
          WidgetStations(from: "練馬", to: "豊島園", vertical: vertical,
                         fromNumber: "E-35", toNumber: "E-36")
          WidgetStations(from: "練馬", to: "豊島園", vertical: vertical,
                         fromNumber: "E-35", toNumber: "")
          WidgetStations(from: "練馬", to: "豊島園", vertical: vertical,
                         fromNumber: "", toNumber: "E-36")
          WidgetStations(from: "練馬", to: "豊島園", vertical: vertical)
          WidgetStations(from: "練馬", to: "", vertical: vertical,
                         fromNumber: "", toNumber: "E-36")
        }
        .padding()
        .previewLayout(.sizeThatFits)
      }
    }
  }
}
