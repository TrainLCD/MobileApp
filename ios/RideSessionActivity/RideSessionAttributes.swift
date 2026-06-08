//
//  RideSessionAttributes.swift
//  TrainLCD
//
//  Created by Tsubasa SEKIGUCHI on 2022/09/15.
//  Copyright © 2022 Facebook. All rights reserved.
//

import ActivityKit
import Foundation

struct RideSessionAttributes: ActivityAttributes {
  public typealias RideSessionStatus = ContentState

  public struct ContentState: Codable, Hashable {
    var stationName: String
    var nextStationName: String
    var stationNumber: String
    var nextStationNumber: String
    var approaching: Bool
    var stopped: Bool
    var boundStationName: String
    var boundStationNumber: String
    var passingStationName: String
    var passingStationNumber: String
    var trainTypeName: String
    var isLoopLine: Bool
    var isNextLastStop: Bool
    var lineColor: String
    var lineName: String
    var progress: Double
  }
}
