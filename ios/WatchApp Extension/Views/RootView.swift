//
//  TopView.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/19.
//  Copyright © 2020 Facebook. All rights reserved.
//

import SwiftUI

struct RootView: View {
  let state: String
  let station: Station
  
  var body: some View {
    VStack{
      Text(state)
        .multilineTextAlignment(.center)
        .font(.subheadline)
      Text(station.name)
        .multilineTextAlignment(.center)
        .font(.title2)
      if let stationNumber = station.stationNumber {
        Text(stationNumber)
          .multilineTextAlignment(.center)
          .font(.caption)
      } else {
        EmptyView()
      }
      List {
        ForEach(station.lines) { line in
          Text(line.name)
            .listRowPlatterColor(Color(hex: line.lineColorC ?? "000"))
        }
      }
    }
  }
}

struct RootView_Previews: PreviewProvider {
  static var previews: some View {
    RootView(
      state: "Now stopping at",
      station: sampleStation
    )
  }
}
