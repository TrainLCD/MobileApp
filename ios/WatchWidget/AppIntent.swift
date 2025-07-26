//
//  AppIntent.swift
//  WatchWidget
//
//  Created by Tsubasa SEKIGUCHI on 2025/07/12.
//  Copyright © 2025 Facebook. All rights reserved.
//

import WidgetKit
import AppIntents

struct ConfigurationAppIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource { "TrainLCD" }
  static var description: IntentDescription { "TrainLCD" }
  
  @Parameter(title: "Line color", default: "277BC0")
  var lineColor: String
  @Parameter(title: "Line name", default: "TrainLCD")
  var lineName: String
  @Parameter(title: "Line symbol", default: "?")
  var lineSymbol: String
  @Parameter(title: "Final destination of train", default: "TrainLCD")
  var boundFor: String
  @Parameter(title: "Is any data loaded from the App", default: false)
  var loaded: Bool
}
