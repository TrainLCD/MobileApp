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
      stopping: state["stopping"] as? Bool ?? true,
      boundStationName: state["boundStationName"] as? String ?? "",
      boundStationNumber: state["boundStationNumber"] as? String ?? "",
      trainTypeName: state["trainTypeName"] as? String ?? "",
      passingStationName: state["passingStationName"] as? String ?? "",
      passingStationNumber: state["passingStationNumber"] as? String ?? "",
      isLoopLine: state["isLoopLine"] as? Bool ?? false,
      isNextLastStop: state["isNextLastStop"] as? Bool ?? false
    )
  }
  
  @objc(startLiveActivity:)
  func startLiveActivity(_ dic: NSDictionary?) {
    let activityAttributes = RideSessionAttributes()
    guard let initialContentState = getStatus(dic) else {
      return
    }
    do {
      sessionActivity = try Activity.request(attributes: activityAttributes, contentState: initialContentState)
      print("Requested a ride session Live Activity \(String(describing: sessionActivity?.id)).")
    } catch(let error) {
      print("Error requesting ride session Live Activity \(error.localizedDescription).")
    }
  }
  
  @objc(updateLiveActivity:)
  func updateLiveActivity(_ dic: NSDictionary) {
    guard let nextContentState = getStatus(dic) else {
      return
    }
   Task {
     await sessionActivity?.update(using: nextContentState)
   }
  }
  
  @objc(stopLiveActivity:)
  func stopLiveActivity(_ dic: NSDictionary?) {
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
