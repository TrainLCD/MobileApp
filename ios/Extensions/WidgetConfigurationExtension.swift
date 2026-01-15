//
//  ViewExtension.swift
//  TrainLCD
//
//  Created by Tsubasa SEKIGUCHI on 2024/09/17.
//  Copyright © 2024 Facebook. All rights reserved.
//

import WidgetKit
import SwiftUI

extension WidgetConfiguration
{
  func supplementalActivityFamiliesIfAvailable() -> some WidgetConfiguration
  {
    // NOTE: supplementalActivityFamiliesを有効にすると、MacでLive Activityが表示された際に
    // iPhone側でスピナーが表示されて固まるバグが発生するため、無効化する
    return self
  }
}
