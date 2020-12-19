//
//  StationListView.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/19.
//  Copyright © 2020 Facebook. All rights reserved.
//

import SwiftUI

struct StationListView: View {
  let stations: [Station]
  let lineColor: String
  
  let isJa = Locale.current.languageCode == "ja"

    @ViewBuilder
    var body: some View {
      if stations.count == 0 {
        Text(NSLocalizedString("directionNotSelected", comment: ""))
          .multilineTextAlignment(.center)
          .font(.subheadline)
      } else {
        List {
          ForEach(stations) { station in
            Text(isJa ? station.name : station.nameR)
              .listRowBackground(Color.init(hex: lineColor ))
        }
      }
    }
  }
}

struct StationListView_Previews: PreviewProvider {
    static var previews: some View {
      StationListView(
        stations: stationList,
        lineColor: "#000"
      )
    }
}
