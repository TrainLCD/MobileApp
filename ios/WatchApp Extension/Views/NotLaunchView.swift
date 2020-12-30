//
//  NotLaunchView.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/19.
//  Copyright © 2020 Facebook. All rights reserved.
//

import SwiftUI

struct NotLaunchView: View {
  var body: some View {
    Text(NSLocalizedString("notLaunchText", comment: ""))
      .multilineTextAlignment(.center)
      .font(.subheadline)
  }
}

struct NotLaunchView_Previews: PreviewProvider {
  static var previews: some View {
    NotLaunchView()
  }
}
