//
//  WatchConnector.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/15.
//  Copyright © 2020 Facebook. All rights reserved.
//

import UIKit
import WatchConnectivity

class PhoneConnector: NSObject, ObservableObject, WCSessionDelegate {
  @Published var receivedStationName = ""
  @Published var receivedState = "TrainLCDアプリを起動してください"
  @Published var lines: [String] = []
  @Published var linesColor: [String] = []

  override init() {
    super.init()
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }
    
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if (error != nil) {
      print(error.debugDescription)
    }
  }
    
  func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
    DispatchQueue.main.async {
      self.receivedStationName = "\(message["stationName"] as! String)"
      self.receivedState = "\(message["state"] as! String)"
      self.lines = "\(message["lines"] as! String)".components(separatedBy: ",")
      self.linesColor = "\(message["linesColor"] as! String)".components(separatedBy: ",")
    }
  }
}
