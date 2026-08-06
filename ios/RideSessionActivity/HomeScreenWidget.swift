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
// 表示データはロック画面ウィジェットと同じApp Group(LockScreenEntry)を共有し、
// watchOSのaccessoryRectangular・iOSのロック画面ウィジェット・Androidのホーム画面ウィジェットと
// 同じ体裁(路線色のナンバリングサークルとバー + 路線名 + 方面)を踏襲する。

// watchOS/ロック画面のNumberingCircle相当。ホーム画面はサイズが可変なので直径を受け取る
struct HomeScreenNumberingCircle: View {
  let lineColor: String
  let lineSymbol: String
  let diameter: CGFloat

  var body: some View {
    ZStack {
      Circle()
        .stroke(Color(hex: lineColor), lineWidth: diameter / 10)
      Text(lineSymbol)
        .font(.system(size: diameter * 0.4, weight: .bold, design: .rounded))
        .minimumScaleFactor(0.5)
        .lineLimit(1)
        .padding(diameter * 0.18)
    }
    .frame(width: diameter, height: diameter)
  }
}

// accessoryRectangular / Androidのwidget_line_barと同じ路線色のバー
struct HomeScreenLineBar: View {
  let lineColor: String

  var body: some View {
    RoundedRectangle(cornerRadius: 2)
      .fill(Color(hex: lineColor))
      .frame(width: 4)
  }
}

struct HomeScreenWidgetEntryView: View {
  let entry: LockScreenEntry

  @Environment(\.widgetFamily) var family

  var body: some View {
    switch family {
    case .systemSmall:
      smallView
    case .systemMedium:
      mediumView
    default:
      EmptyView()
    }
  }

  // ロック画面コントロールと同じtramシンボルでアプリの表示を揃える
  private var brandLabel: some View {
    HStack(spacing: 4) {
      Image(systemName: entry.loaded ? "tram.fill" : "tram")
      Text("TrainLCD")
    }
    .font(.caption2)
    .fontWeight(.bold)
    .foregroundStyle(.secondary)
  }

  private var lineNameText: some View {
    Text(entry.lineName)
      .lineLimit(2)
      .minimumScaleFactor(0.7)
  }

  private var boundForText: some View {
    Text(entry.boundFor)
      .foregroundStyle(.secondary)
      .lineLimit(2)
      .minimumScaleFactor(0.8)
  }

  // 正方形なのでaccessoryCircular相当のサークルを上に置き、その下に路線名と方面を積む
  var smallView: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(spacing: 0) {
        HomeScreenNumberingCircle(
          lineColor: entry.lineColor,
          lineSymbol: entry.lineSymbol,
          diameter: 44
        )
        Spacer(minLength: 0)
      }
      Spacer(minLength: 8)
      lineNameText
        .font(.headline)
      boundForText
        .font(.caption)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  // accessoryRectangularと同じ「バー + 路線名 + 方面」に、余白のあるホーム画面向けとして
  // アプリ名とナンバリングサークルを足した構成
  var mediumView: some View {
    HStack(spacing: 12) {
      HomeScreenLineBar(lineColor: entry.lineColor)
      VStack(alignment: .leading, spacing: 4) {
        brandLabel
        lineNameText
          .font(.title3)
          .fontWeight(.bold)
        boundForText
          .font(.subheadline)
      }
      Spacer(minLength: 0)
      HomeScreenNumberingCircle(
        lineColor: entry.lineColor,
        lineSymbol: entry.lineSymbol,
        diameter: 56
      )
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

extension View {
  // containerBackgroundはiOS 17以降必須だが、Extensionのデプロイターゲットが16.1のため互換ラップする。
  // iOS 16にはコンテンツマージンが無く端まで描画されてしまうので、その場合のみ自前で余白を付ける
  @ViewBuilder
  fileprivate func homeScreenContainerBackground() -> some View {
    if #available(iOSApplicationExtension 17.0, *) {
      containerBackground(.fill.tertiary, for: .widget)
    } else {
      padding()
    }
  }
}

struct HomeScreenWidget: Widget {
  // LiveActivityModule側のreloadTimelines(ofKind:)と一致させること
  let kind: String = "HomeScreenWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: LockScreenProvider()) { entry in
      HomeScreenWidgetEntryView(entry: entry)
        .homeScreenContainerBackground()
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
        .previewContext(WidgetPreviewContext(family: .systemSmall))
      HomeScreenWidgetEntryView(entry: entry)
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
  }
}
