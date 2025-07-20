//
//  WatchConnector.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/15.
//  Copyright © 2020 Facebook. All rights reserved.
//

import WatchConnectivity
import WidgetKit
import ClockKit

class ConnectivityProvider: NSObject, WCSessionDelegate, ObservableObject {
  @Published var receivedState: String?
  @Published var receivedStation: Station?
  @Published var receivedStationList: [Station]?
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
  
  func reloadComplecationTimeline() {
    let isComplicationActive = !(CLKComplicationServer.sharedInstance().activeComplications?.isEmpty ?? true)
    
    if isComplicationActive {
      WidgetCenter.shared.reloadTimelines(ofKind: "WatchWidget")
    }
  }
  
  func parseMessage(_ message: [String : Any]) {
    let decoder = JSONDecoder()
    let appGroupID = Bundle.main.object(forInfoDictionaryKey: "APP_GROUP_ID") as? String ?? "group.me.tinykitten.trainlcd"
    let defaults = UserDefaults(suiteName: appGroupID)
    
    DispatchQueue.main.async {
      do {
        guard let selectedLineDic = message["selectedLine"] as? [String: Any] else {
          defaults?.set(false, forKey: "loaded")
          self.reloadComplecationTimeline()
          return
        }
        guard let selectedLineData = try? JSONSerialization.data(withJSONObject: selectedLineDic, options: []) else {
          defaults?.set(false, forKey: "loaded")
          self.reloadComplecationTimeline()
          return
        }
        guard let selectedLine = try? decoder.decode(Line.self, from: selectedLineData) else {
          defaults?.set(false, forKey: "loaded")
          self.reloadComplecationTimeline()
          return
        }
        
        self.selectedLine = selectedLine
        
        defaults?.set(selectedLine.lineColorC, forKey: "lineColor")
        defaults?.set(selectedLine.name, forKey: "lineName")
        defaults?.set(selectedLine.lineSymbol, forKey: "lineSymbol")
        defaults?.set(message["boundStationName"], forKey: "boundStationName")
        defaults?.set(true, forKey: "loaded")
        
        self.reloadComplecationTimeline()
        
        guard let stationDic = message["station"] as? [String: Any] else {
          return
        }
        guard let data = try? JSONSerialization.data(withJSONObject: stationDic, options: []) else {
          return
        }
        self.receivedStation = try decoder.decode(Station.self, from: data)
        
        guard let rawStateText = message["state"] as? String else {
          return
        }
        
        switch rawStateText {
        case "ARRIVING":
          self.receivedState = NSLocalizedString("arrivingAt", comment: "")
        case "CURRENT":
          self.receivedState = NSLocalizedString("nowStoppingAt", comment: "")
        case "NEXT":
          self.receivedState = NSLocalizedString("next", comment: "")
        default:
          break
        }
        
        guard let stationListDic = message["stationList"] as? [[String: Any]] else {
          return
        }
        guard let stationListData = try? JSONSerialization.data(withJSONObject: stationListDic, options: []) else {
          return
        }
        
        let stationList = try decoder.decode([Station].self, from: stationListData)
        self.receivedStationList = stationList
      } catch {
        print(error.localizedDescription)
      }
    }
  }
  
  func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
    parseMessage(message)
  }
  
  func session(
    _ session: WCSession,
    didReceiveApplicationContext applicationContext: [String : Any]
  ) {
    parseMessage(applicationContext)
  }
}
