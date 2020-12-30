//
//  Station.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/19.
//  Copyright © 2020 Facebook. All rights reserved.
//

struct Station: Decodable, Identifiable {
  let id: Int
  let groupId: Int
  let name: String
  let nameK: String
  let nameR: String
  let address: String
  let lines: [Line]
  let latitude: Float
  let longitude: Float
  let distance: Float?
}
