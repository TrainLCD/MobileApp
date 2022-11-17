//
//  Station.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/19.
//  Copyright © 2020 Facebook. All rights reserved.
//

struct Station: Decodable, Identifiable {
  let id: Int
  let name: String
  let nameR: String
  let lines: [Line]
  let stationNumber: String?
  let pass: Bool
}
