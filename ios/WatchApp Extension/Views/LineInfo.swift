//
//  LineInfo.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/19.
//  Copyright © 2020 Facebook. All rights reserved.
//

import SwiftUI

struct LineInfo: View {
  @ObservedObject var connector = ConnectivityProvider()

    var body: some View {
    ForEach(connector.receivedStationList.indices, id: \.self) { index in
      if let station = connector.$receivedStation {
        Text(connector.receivedStationList[index].name)
          .listRowBackground(Color.init(hex: selectedLine.lineColorC ?? "#000"))
      }
    }
  }
}

struct LineInfo_Previews: PreviewProvider {
    static var previews: some View {
      LineInfo()
    }
}
