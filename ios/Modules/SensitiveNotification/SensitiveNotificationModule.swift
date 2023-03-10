import Foundation
import UserNotifications

@available(iOS 15.0, *)
@objc(SensitiveNotificationModule)
class SensitiveNotificationModule: NSObject {
  @objc func sendNotification(
    _ title: String,
    body: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let content = UNMutableNotificationContent()
    content.title = title
    content.body = body
    content.sound = .default
    content.interruptionLevel = .timeSensitive
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
    let request = UNNotificationRequest(identifier: "time-sensitive—trainlcd",
                                           content: content,
                                           trigger: trigger)
    let center = UNUserNotificationCenter.current()
    center.add(request) { (error) in
      if let error = error {
        print(error.localizedDescription)
        reject("notification_failure", error.localizedDescription, nil)
      } else {
        resolve(nil)
      }
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
