import Foundation
import ActivityKit
import WidgetKit

@available(iOS 16.1, *)
@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
  var sessionActivity: Activity<RideSessionAttributes>?

  private let lockScreenWidgetKind = "LockScreenWidget"
  // RideSessionActivity側のLockScreenControl.kindと一致させること
  private let lockScreenControlKind = "me.tinykitten.trainlcd.LockScreenControl"

  private var appGroupID: String {
    Bundle.main.object(forInfoDictionaryKey: "APP_GROUP_ID") as? String
      ?? "group.me.tinykitten.trainlcd"
  }

  // 直近にウィジェットへ書き込んだ内容。差分がない更新でのUserDefaults書き込みと
  // reloadTimelines呼び出し(WidgetKitのリロードバジェット消費)を避ける
  private var lastWidgetState: [String: String]?

  // ロック画面ウィジェットが参照するApp Groupへ乗車中の路線情報を書き込む
  private func syncLockScreenWidgetState(_ dic: NSDictionary?) {
    guard let dic = dic else {
      return
    }
    let state = [
      "lineColor": dic["lineColor"] as? String ?? "",
      "lineName": dic["lineName"] as? String ?? "",
      "lineSymbol": dic["lineSymbol"] as? String ?? "",
      "boundStationName": dic["boundStationName"] as? String ?? "",
    ]
    if state == lastWidgetState {
      return
    }
    lastWidgetState = state
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      return
    }
    for (key, value) in state {
      defaults.set(value, forKey: key)
    }
    defaults.set(true, forKey: "loaded")
    reloadLockScreenSurfaces()
  }

  // ロック画面ウィジェットとロック画面コントロールは同じApp Groupを参照するため常に同時に更新する
  private func reloadLockScreenSurfaces() {
    WidgetCenter.shared.reloadTimelines(ofKind: lockScreenWidgetKind)
    if #available(iOS 18.0, *) {
      ControlCenter.shared.reloadControls(ofKind: lockScreenControlKind)
    }
  }

  private func clearLockScreenWidgetState() {
    lastWidgetState = nil
    guard let defaults = UserDefaults(suiteName: appGroupID) else {
      return
    }
    defaults.set(false, forKey: "loaded")
    reloadLockScreenSurfaces()
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

    syncLockScreenWidgetState(dic)
    
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

    syncLockScreenWidgetState(dic)

    Task {
      await sessionActivity?.update(using: nextContentState)
    }
  }
  
  @objc(stopLiveActivity:)
  func stopLiveActivity(_ dic: NSDictionary?) {
    if ProcessInfo.processInfo.isiOSAppOnMac {
      return
    }
    
    clearLockScreenWidgetState()

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
