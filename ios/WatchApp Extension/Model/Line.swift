//
//  Line.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/19.
//  Copyright © 2020 Facebook. All rights reserved.
//

import SwiftUI

struct Line: Decodable, Identifiable {
  let id: Int
  let lineColorC: String?
  let name: String
  let nameR: String
}
