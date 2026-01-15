//
//  ViewExtension.swift
//  TrainLCD
//
//  Created by Tsubasa SEKIGUCHI on 2024/09/17.
//  Copyright © 2024 Facebook. All rights reserved.
//

import WidgetKit
import SwiftUI

extension WidgetConfiguration {
  func supplementalActivityFamiliesIfAvailable() -> some WidgetConfiguration {
    if #available(iOSApplicationExtension 18.0, *) {
      // .small: Apple Watch Smart Stack
      // .medium: Mac メニューバー（ネイティブ描画でスピナー問題を回避）
      return self.supplementalActivityFamilies([.small, .medium])
    } else {
      return self
    }
  }
}
