//
//  WatchConnector.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/15.
//  Copyright © 2020 Facebook. All rights reserved.
//

import WatchConnectivity

class ConnectivityProvider: NSObject, WCSessionDelegate, ObservableObject {
  @Published var receivedState: String?
  @Published var receivedStation: Station?

  private let session: WCSession

  override init() {
    self.session = WCSession.default
    super.init()
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }
  
  func send(message: [String:Any]) -> Void {
      session.sendMessage(message, replyHandler: nil) { (error) in
          print(error.localizedDescription)
      }
  }
    
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
  
  func processFirstMessage(_ message: [String : Any]) {
    let decoder = JSONDecoder()
    DispatchQueue.main.async {
      do {
        guard let stationDic = message["station"] as? Dictionary<String, Any> else {
          return
        }
        guard let data = try? JSONSerialization.data(withJSONObject: stationDic, options: []) else {
          return
        }
        self.receivedStation = try decoder.decode(Station.self, from: data)
      } catch {
        print(error.localizedDescription)
        return
      }

      guard let stateText = message["state"] as? String else {
        return
      }
      self.receivedState = "\(stateText)"
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
    processFirstMessage(message)
  }
}
