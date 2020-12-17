//
//  ContentView.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/15.
//  Copyright © 2020 Facebook. All rights reserved.
//

import SwiftUI

struct ContentView: View {
    @ObservedObject var connector = PhoneConnector()
  
    var body: some View {
      VStack{
        Text("\(connector.receivedState)")
              .multilineTextAlignment(.center)
          .font(.subheadline)
        Text("\(connector.receivedStationName)")
              .multilineTextAlignment(.center)
          .font(.title2)
        List {
          ForEach(connector.lines.indices, id: \.self) { index in
            Text(connector.lines[index])
              .listRowBackground(Color.init(hex: connector.linesColor[index]))
            
          }
        }
      }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
      Group {
        ContentView()
        ContentView()
      }
    }
}
