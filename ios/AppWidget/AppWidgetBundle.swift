//
//  AppWidgetBundle.swift
//  AppWidgetBundle
//
//  Created by Tsubasa SEKIGUCHI on 2023/09/25.
//  Copyright © 2023 Facebook. All rights reserved.
//

import WidgetKit
import SwiftUI

@main
struct AppWidgetBundle: WidgetBundle {
    var body: some Widget {
        AppWidget()
        AppWidgetLiveActivity()
    }
}
