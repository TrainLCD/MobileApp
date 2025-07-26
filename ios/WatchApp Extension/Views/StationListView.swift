//
//  StationListView.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/19.
//  Copyright © 2020 Facebook. All rights reserved.
//
import SwiftUI

struct StationListView: View {
  let currentStation: Station
  let stations: [Station]
  let selectedLine: Line
  
  @ViewBuilder
  var body: some View {
    NavigationView {
      ScrollViewReader { (proxy: ScrollViewProxy) in
        List {
          ForEach(stations) { station in
            if let stationNumber = station.stationNumber {
              Text("\(station.name)(\(stationNumber))")
                .opacity(station.pass ? 0.25 : 1)
            } else {
              Text(station.name)
                .opacity(station.pass ? 0.25 : 1)
            }
          }
        }
        .onAppear(perform: {
          withAnimation {
            proxy.scrollTo(currentStation.id, anchor: .top)
          }
        })
      }
    }
    .navigationBarTitle(Text(selectedLine.name))
  }
}

struct StationListView_Previews: PreviewProvider {
  static var previews: some View {
    StationListView(
      currentStation: sampleStation,
      stations: sampleStationList,
      selectedLine: sampleLine
    )
  }
}
