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
  let selectedLine: Line?
  
  let isJa = Locale.current.languageCode == "ja"
  
  @ViewBuilder
  var body: some View {
    NavigationView {
      if stations.count == 0 {
        Text(NSLocalizedString("directionNotSelected", comment: ""))
          .multilineTextAlignment(.center)
          .font(.subheadline)
      } else {
        ScrollViewReader { (proxy: ScrollViewProxy) in
          List {
            ForEach(stations) { station in
              if let stationNumber = station.stationNumber {
                Text("\(isJa ? station.name : station.nameR)(\(stationNumber))")
                  .opacity(station.pass ? 0.25 : 1)
              } else {
                Text("\(isJa ? station.name : station.nameR)")
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
    }
    .navigationBarTitle(Text((isJa ? selectedLine?.name : selectedLine?.nameR) ?? ""))
    
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
