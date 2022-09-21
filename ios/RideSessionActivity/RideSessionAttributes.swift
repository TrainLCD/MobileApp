//
//  RideSessionAttributes.swift
//  TrainLCD
//
//  Created by Tsubasa SEKIGUCHI on 2022/09/15.
//  Copyright © 2022 Facebook. All rights reserved.
//

#if canImport(ActivityKit)
import Foundation
import ActivityKit

struct RideSessionAttributes: ActivityAttributes {
  public typealias RideSessionStatus = ContentState
  
  public struct ContentState: Codable, Hashable {
    var stationName: String
    var nextStationName: String
    var stationNumber: String
    var nextStationNumber: String
    var runningState: String
    var stopping: Bool
  }
}
#endif
