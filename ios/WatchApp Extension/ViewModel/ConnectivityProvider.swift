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
  @Published var receivedStationList: [Station] = []
  @Published var selectedLine: Line?
  
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
      
      guard let rawStateText = message["state"] as? String else {
        return
      }
      
      switch rawStateText {
      case "ARRIVING":
        fallthrough
      case "ARRIVING_EN":
        fallthrough
      case "ARRIVING_ZH":
        fallthrough
      case "ARRIVING_KO":
        fallthrough
      case "ARRIVING_KANA":
        self.receivedState = NSLocalizedString("arrivingAt", comment: "")
      case "CURRENT":
        fallthrough
      case "CURRENT_EN":
        fallthrough
      case "CURRENT_ZH":
        fallthrough
      case "CURRENT_KO":
        fallthrough
      case "CURRENT_KANA":
        self.receivedState = NSLocalizedString("nowStoppingAt", comment: "")
      case "NEXT":
        fallthrough
      case "NEXT_EN":
        fallthrough
      case "NEXT_ZH":
        fallthrough
      case "NEXT_KO":
        fallthrough
      case "NEXT_KANA":
        self.receivedState = NSLocalizedString("next", comment: "")
      default:
        break
      }
    }
  }
  
  func processOptionalMessage(_ message: [String: Any]) {
    let decoder = JSONDecoder()
    
    DispatchQueue.main.async {
      do {
        guard let stationListDic = message["stationList"] as? [Dictionary<String, Any>]  else {
          return
        }
        guard let stationListData = try? JSONSerialization.data(withJSONObject: stationListDic, options: []) else {
          return
        }
        let stationList = try decoder.decode([Station].self, from: stationListData)
        self.receivedStationList = stationList
        if stationList.count == 0 {
          self.selectedLine = nil
        }
        
        guard let selectedLineDic = message["selectedLine"] as? Dictionary<String, Any>  else {
          return
        }
        guard let selectedLineData = try? JSONSerialization.data(withJSONObject: selectedLineDic, options: []) else {
          return
        }
        self.selectedLine = try decoder.decode(Line.self, from: selectedLineData)
      } catch {
        print(error.localizedDescription)
      }
    }
  }
  
  func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
    processFirstMessage(message)
    processOptionalMessage(message)
  }
}
