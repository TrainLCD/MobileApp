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

// ナンバリングバッジの直径。systemSmallは下に路線名と方面が2行入るぶん小さくする
private let smallBadgeDiameter: CGFloat = 48
private let mediumBadgeDiameter: CGFloat = 60

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
/// どの路線色でも駅ナンバリングの標識と同じコントラストになる。
struct LineNumberingBadge: View {
  let lineColor: String
  let lineSymbol: String
  let diameter: CGFloat

  var body: some View {
    ZStack {
      Circle()
        .fill(lineForegroundColor(for: lineColor))
      Text(lineSymbol)
        .font(.system(size: diameter * 0.4, weight: .heavy, design: .rounded))
        .foregroundStyle(Color(hex: lineColor))
        .minimumScaleFactor(0.5)
        .lineLimit(1)
        .padding(diameter * 0.18)
    }
    .frame(width: diameter, height: diameter)
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

struct HomeScreenWidgetEntryView: View {
  let entry: LockScreenEntry

  @Environment(\.widgetFamily) var family

  var body: some View {
    Group {
      switch family {
      case .systemSmall:
        smallView
      case .systemMedium:
        mediumView
      default:
        EmptyView()
      }
    }
    // バッジだけは内側で路線色を指定して上書きする
    .foregroundStyle(lineForegroundColor(for: entry.displayLineColor))
  }

  // ロック画面コントロールと同じtramシンボルでアプリの表示を揃える
  private var brandLabel: some View {
    LineColorChip(lineColor: entry.displayLineColor) {
      HStack(spacing: 4) {
        Image(systemName: entry.loaded ? "tram.fill" : "tram")
        Text("TrainLCD")
      }
      .font(.caption2)
      .fontWeight(.bold)
    }
  }

  private var lineNameText: some View {
    Text(entry.lineName)
      .lineLimit(2)
      .minimumScaleFactor(0.7)
  }

  // 乗車中は行き先であることが伝わるよう矢印を添える。
  // 未乗車時は「方面が未設定です」という案内文なので矢印は付けない
  private var boundForLabel: some View {
    HStack(spacing: 3) {
      if entry.loaded {
        Image(systemName: "arrow.forward")
          .imageScale(.small)
      }
      Text(entry.boundFor)
        .lineLimit(2)
        .minimumScaleFactor(0.8)
    }
    .opacity(0.85)
  }

  // 正方形なのでバッジを上に置き、その下に路線名と方面を積む
  var smallView: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top, spacing: 0) {
        LineNumberingBadge(
          lineColor: entry.displayLineColor,
          lineSymbol: entry.lineSymbol,
          diameter: smallBadgeDiameter
        )
        Spacer(minLength: 0)
        // 正方形にブランド行を入れる余裕は無いので、乗車中かどうかだけをアイコンで示す
        Image(systemName: entry.loaded ? "tram.fill" : "tram")
          .font(.caption)
          .opacity(0.7)
      }
      Spacer(minLength: 8)
      lineNameText
        .font(.headline)
      boundForLabel
        .font(.caption)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  // 横に余裕があるので、ブランド行 + 路線名 + 方面を左に積み、バッジを右へ逃がす。
  // 路線色は面が担うようになったため、旧デザインにあった左端の路線色バーは置かない
  var mediumView: some View {
    HStack(spacing: 12) {
      VStack(alignment: .leading, spacing: 4) {
        brandLabel
        lineNameText
          .font(.title3)
          .fontWeight(.bold)
        boundForLabel
          .font(.subheadline)
      }
      Spacer(minLength: 0)
      LineNumberingBadge(
        lineColor: entry.displayLineColor,
        lineSymbol: entry.lineSymbol,
        diameter: mediumBadgeDiameter
      )
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
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

struct HomeScreenWidget_Previews: PreviewProvider {
  private static var entry: LockScreenEntry {
    LockScreenEntry(
      date: .now,
      loaded: true,
      lineColor: "80C241",
      lineName: "山手線",
      lineSymbol: "JY",
      boundFor: "新宿・渋谷方面"
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
