//
//  ContentView.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/15.
//  Copyright © 2020 Facebook. All rights reserved.
//

import SwiftUI

struct ContentView: View {
  @ObservedObject var connector = ConnectivityProvider()
  
  @ViewBuilder
  var body: some View {
    if let station = connector.receivedStation {
      TabView {
        RootView(
          state: connector.receivedState ?? "",
          station: station
        )
        if let selectedLine = connector.selectedLine {
          StationListView(
            currentStation: station,
            stations: connector.receivedStationList ?? [],
            selectedLine: selectedLine
          )
        } else {
          Text(NSLocalizedString("directionNotSelected", comment: ""))
            .multilineTextAlignment(.center)
            .font(.subheadline)
        }
      }.tabViewStyle(PageTabViewStyle())
    } else {
      NotLaunchView()
    }
  }
}

struct ContentView_Previews: PreviewProvider {
  static var previews: some View {
    ContentView()
  }
}
