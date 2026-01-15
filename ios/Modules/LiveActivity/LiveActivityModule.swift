import Foundation
import ActivityKit

@available(iOS 16.1, *)
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
  var sessionActivity: Activity<RideSessionAttributes>?
  
  func getStatus(_ dic: NSDictionary?) -> RideSessionAttributes.RideSessionStatus? {
    guard let state = dic else {
      return nil
    }
    return RideSessionAttributes.RideSessionStatus(
      stationName: state["stationName"] as? String ?? "",
      nextStationName: state["nextStationName"] as? String ?? "",
      stationNumber: state["stationNumber"] as? String ?? "",
      nextStationNumber: state["nextStationNumber"] as? String ?? "",
      approaching: state["approaching"] as? Bool ?? false,
      stopped: state["stopped"] as? Bool ?? false,
      boundStationName: state["boundStationName"] as? String ?? "",
      boundStationNumber: state["boundStationNumber"] as? String ?? "",
      passingStationName: state["passingStationName"] as? String ?? "",
      passingStationNumber: state["passingStationNumber"] as? String ?? "",
      trainTypeName: state["trainTypeName"] as? String ?? "",
      isLoopLine: state["isLoopLine"] as? Bool ?? false,
      isNextLastStop: state["isNextLastStop"] as? Bool ?? false,
      lineColor: state["lineColor"] as? String ?? "#000000",
      lineName: state["lineName"] as? String ?? "",
      progress: state["progress"] as? Double ?? 0.3
    )
  }
  
  @objc(startLiveActivity:)
  func startLiveActivity(_ dic: NSDictionary?) {
    if ProcessInfo.processInfo.isiOSAppOnMac {
      return
    }
    
    let activityAttributes = RideSessionAttributes()
    
    guard let initialContentState = getStatus(dic) else {
      return
    }
    
    do {
      let finalContentState = getStatus(dic)
      // 非同期処理をawaitで待機し、新規アクティビティの開始前に既存のアクティビティを確実に終了
      Task {
        // 既存のアクティビティを終了
        do {
          try await withThrowingTaskGroup(of: Void.self) { group in
            for activity in Activity<RideSessionAttributes>.activities {
              group.addTask {
                await activity.end(using: finalContentState, dismissalPolicy: .immediate)
              }
            }
            try await group.waitForAll()
          }
          // 既存アクティビティの終了を確認後、新規アクティビティを開始
          sessionActivity = try Activity.request(
            attributes: activityAttributes,
            contentState: initialContentState
          )
          print("Requested a ride session Live Activity \(String(describing: sessionActivity?.id)).")
        } catch {
          print("Error in Live Activity cleanup/start: \(error.localizedDescription)")
        }
        
      }
    }
  }
  
  @objc(updateLiveActivity:)
  func updateLiveActivity(_ dic: NSDictionary) {
    if ProcessInfo.processInfo.isiOSAppOnMac {
      return
    }
    
    guard let nextContentState = getStatus(dic) else {
      return
    }
    Task {
      await sessionActivity?.update(using: nextContentState)
    }
  }
  
  @objc(stopLiveActivity:)
  func stopLiveActivity(_ dic: NSDictionary?) {
    if ProcessInfo.processInfo.isiOSAppOnMac {
      return
    }
    
    let finalContentState = getStatus(dic)
    Task {
      for activity in Activity<RideSessionAttributes>.activities {
        await activity.end(using: finalContentState, dismissalPolicy: .immediate)
      }
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
