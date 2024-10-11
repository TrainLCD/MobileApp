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
    if #available(iOSApplicationExtension 18.0, *) {
      return self.supplementalActivityFamilies([ActivityFamily.small])
    } else {
      return self
    }
  }
}
