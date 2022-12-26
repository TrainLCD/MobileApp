import Foundation
import ActivityKit

@available(iOS 16.1, *)
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
  var sessionActivity: Activity<RideSessionAttributes>?
  
  func getRunningStateText(_ dic: NSDictionary?) -> String {
    switch dic?["runningState"] as? String ?? "" {
    case "ARRIVING":
      fallthrough
    case "ARRIVING_EN":
      fallthrough
    case "ARRIVING_ZH":
      fallthrough
    case "ARRIVING_KO":
      fallthrough
    case "ARRIVING_KANA":
      return NSLocalizedString("soon", comment: "")
    case "CURRENT":
      fallthrough
    case "CURRENT_EN":
      fallthrough
    case "CURRENT_ZH":
      fallthrough
    case "CURRENT_KO":
      fallthrough
    case "CURRENT_KANA":
      return NSLocalizedString("stop", comment: "")
    case "NEXT":
      fallthrough
    case "NEXT_EN":
      fallthrough
    case "NEXT_ZH":
      fallthrough
    case "NEXT_KO":
      fallthrough
    case "NEXT_KANA":
      return NSLocalizedString("next", comment: "")
    default:
      return ""
    }
  }
  
  func getStatus(_ dic: NSDictionary?) -> RideSessionAttributes.RideSessionStatus? {
    guard let state = dic else {
      return nil
    }
    return RideSessionAttributes.RideSessionStatus(
      stationName: state["stationName"] as? String ?? "",
      nextStationName: state["nextStationName"] as? String ?? "",
      stationNumber: state["stationNumber"] as? String ?? "",
      nextStationNumber: state["nextStationNumber"] as? String ?? "",
      runningState: getRunningStateText(state),
      stopping: state["stopping"] as? Bool ?? true,
      lineName: state["lineName"] as? String ?? "",
      boundStationName: state["boundStationName"] as? String ?? "",
      boundStationNumber: state["boundStationNumber"] as? String ?? "",
      trainTypeName: state["trainTypeName"] as? String ?? ""
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
      await sessionActivity?.end(using: finalContentState, dismissalPolicy: .immediate)
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
