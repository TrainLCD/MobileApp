//
//  AppWidgetAttributes.swift
//  AppWidgetAttributes
//
//  Created by Tsubasa SEKIGUCHI on 2023/09/25.
//  Copyright © 2023 Facebook. All rights reserved.
//

import ActivityKit

struct AppWidgetAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var stationName: String
    var nextStationName: String
    var stationNumber: String
    var nextStationNumber: String
    var approaching: Bool
    var stopping: Bool
    var boundStationName: String
    var boundStationNumber: String
    var trainTypeName: String
    var passingStationName: String
    var passingStationNumber: String
    var isLoopLine: Bool
    var isNextLastStop: Bool
  }
}
