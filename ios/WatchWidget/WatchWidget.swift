//
//  WatchWidget.swift
//  WatchWidget
//
//  Created by Tsubasa SEKIGUCHI on 2025/07/12.
//  Copyright © 2025 Facebook. All rights reserved.
//

import WidgetKit
import SwiftUI

struct Provider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    SimpleEntry(date: Date(), configuration: ConfigurationAppIntent())
  }
  
  func snapshot(for configuration: ConfigurationAppIntent, in context: Context) async -> SimpleEntry {
    await loadEntry()
  }
  
  func timeline(for configuration: ConfigurationAppIntent, in context: Context) async -> Timeline<SimpleEntry> {
    let entry = await loadEntry()
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())
    ?? Date().addingTimeInterval(5 * 60)
    return Timeline(entries: [entry], policy: .after(nextUpdate))
  }
  
  func recommendations() -> [AppIntentRecommendation<ConfigurationAppIntent>] {
    // Create an array with all the preconfigured widgets to show.
    [AppIntentRecommendation(intent: ConfigurationAppIntent(), description: "TrainLCD")]
  }
  
  private func loadEntry() async -> SimpleEntry {
    let appGroupID = Bundle.main.object(forInfoDictionaryKey: "APP_GROUP_ID") as? String ?? "group.me.tinykitten.trainlcd"
    
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      return SimpleEntry(date: Date(), configuration: ConfigurationAppIntent())
    }
    
    let loaded = defaults.bool(forKey: "loaded")
    
    if (!loaded) {
      var newIntent: ConfigurationAppIntent {
        let intent = ConfigurationAppIntent()
        intent.lineColor = "277BC0"
        intent.lineName = String(localized: "lineNotSet")
        intent.lineSymbol = "?"
        intent.boundFor = String(localized: "destinationNotSet")
        intent.loaded = false
        return intent
      }
      
      return SimpleEntry (
        date: Date(),
        configuration: newIntent
      )
    }
    
    let lineColor = defaults.string(forKey: "lineColor") ?? ""
    let lineName = defaults.string(forKey: "lineName") ?? ""
    let lineSymbol = defaults.string(forKey: "lineSymbol") ?? ""
    let boundFor = defaults.string(forKey: "boundStationName") ?? ""

    var newIntent: ConfigurationAppIntent {
      let intent = ConfigurationAppIntent()
      intent.lineColor = lineColor
      intent.lineName = lineName
      intent.lineSymbol = lineSymbol
      intent.boundFor = boundFor
      intent.loaded = true
      return intent
    }
    
    return SimpleEntry (
      date: Date(),
      configuration: newIntent
    )
  }
}

struct SimpleEntry: TimelineEntry {
  let date: Date
  let configuration: ConfigurationAppIntent
}

struct NumberingCircle : View {
  var lineColor: String
  var lineSymbol: String
  
  var body: some View {
    ZStack {
      Circle()
        .stroke(lineWidth: 10)
        .fill(Color(hex: lineColor))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
      Text(lineSymbol)
        .font(.title)
        .fontWeight(.bold)
        .frame(alignment: .center)
    }
  }
}

struct WatchWidgetEntryView : View {
  var lineColor: String
  var lineName: String
  var lineSymbol: String
  var boundFor: String
  var loaded: Bool
  
  @Environment(\.widgetFamily) var family
  
  var body: some View {
    switch family {
    case .accessoryCircular:
      circularView
    case .accessoryRectangular:
      rectangularView
    case .accessoryInline:
      inlineView
    case .accessoryCorner:
      cornerView
    default:
      EmptyView()
    }
  }
  
  var circularView: some View {
    NumberingCircle(
      lineColor: lineColor,
      lineSymbol: lineSymbol
    )
  }
  
  var rectangularView: some View {
    HStack {
      RoundedRectangle(cornerRadius: 4)
        .fill(Color(hex: lineColor))
        .frame(width: 4, height: 50)
      VStack(alignment: .leading) {
        Text("TrainLCD")
          .font(.caption)
          .foregroundColor(.white)
          .multilineTextAlignment(.leading)
        Text(lineName)
          .fontWeight(.bold)
          .font(.caption2)
          .foregroundColor(.white)
          .multilineTextAlignment(.leading)
        Text(boundFor)
          .font(.caption)
          .foregroundColor(.white)
          .multilineTextAlignment(.leading)
        Text(String(localized: "tapToRefresh"))
          .font(.caption)
          .fontWeight(.light)
          .foregroundStyle(.white)
          .multilineTextAlignment(.leading)
          .opacity(0.75)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .multilineTextAlignment(.leading)
  }
  
  var inlineView: some View {
    Text(
      !loaded
      ? "TrainLCD"
      : String(
        format: String(localized: "ridingOn"),
        lineName
      )
    )
    .fontWeight(.bold)
    .foregroundColor(.white)
  }
  
  var cornerView: some View {
    ZStack {
      NumberingCircle(
        lineColor: lineColor,
        lineSymbol: lineSymbol)
      .widgetLabel {
        ZStack {
          Text(lineName)
            .fontWeight(.bold)
            .font(.caption)
            .foregroundColor(.white)
        }
      }
    }
  }
}

@main
struct WatchWidget: Widget {
  let kind: String = "WatchWidget"
  
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: ConfigurationAppIntent.self, provider: Provider()) { entry in
      WatchWidgetEntryView(
        lineColor: entry.configuration.lineColor,
        lineName: entry.configuration.lineName,
        lineSymbol: entry.configuration
          .lineSymbol.isEmpty
        ? String(entry.configuration.lineName
          .prefix(1))
        : entry.configuration.lineSymbol,
        boundFor: entry.configuration.boundFor,
        loaded: entry.configuration.loaded
      )
      .containerBackground(.fill.tertiary, for: .widget)
    }
    .configurationDisplayName("TrainLCD")
    .description("TrainLCD")
    .supportedFamilies(
      [
        .accessoryCircular,
        .accessoryCorner,
        .accessoryRectangular,
        .accessoryInline
      ]
    )
  }
}

extension ConfigurationAppIntent {
  fileprivate static var dummy: ConfigurationAppIntent {
    let intent = ConfigurationAppIntent()
    intent.lineColor = "277BC0"
    intent.lineName = "TrainLCD"
    intent.lineSymbol = "?"
    intent.boundFor = "TrainLCD"
    intent.loaded = false
    return intent
  }
  
  #Preview(as: .accessoryRectangular) {
    WatchWidget()
  } timeline: {
    SimpleEntry(date: .now, configuration: .dummy)
  }    
}

struct WatchWidget_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      WatchWidgetEntryView(
        lineColor: "80C241",
        lineName: "山手線",
        lineSymbol: "JY",
        boundFor: "新宿・渋谷方面",
        loaded: true
      )
      .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
    }
  }
  
  static var platform: PreviewPlatform? {
    .watchOS
  }
}
