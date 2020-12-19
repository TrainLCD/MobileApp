//
//  LineProvider.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/19.
//  Copyright © 2020 Facebook. All rights reserved.
//

import WatchConnectivity

class LineProvider: NSObject, ObservableObject, WCSessionDelegate {
  @Published var stations: [Station] =  []

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
      let decoder = JSONDecoder()
      do {
        let data = try! JSONSerialization.data(withJSONObject: message["stations"] as! [Dictionary<String, Any>], options: [])
        self.stations = try decoder.decode([Station].self, from: data)
      } catch {
        print(error.localizedDescription)
        return
      }
    }
  }
}
