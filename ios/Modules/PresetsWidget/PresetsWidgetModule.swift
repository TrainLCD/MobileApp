import Foundation
import WidgetKit

/// ホーム画面のプリセットウィジェットが読むApp Groupへ、アプリ内のプリセット一覧を書き込むモジュール。
///
/// 乗車中の情報を扱うLiveActivityModuleとは更新タイミングも寿命も異なる(プリセットは
/// 乗車していなくても表示し続ける)ため、書き込み経路を分けている。
@objc(PresetsWidgetModule)
class PresetsWidgetModule: NSObject {
  // RideSessionActivity側のPresetsWidget.kindと一致させること
  private let presetsWidgetKind = "PresetsWidget"
  // RideSessionActivity側のPresetsEntry.storageKeyと一致させること
  private let presetsStorageKey = "presets"

  // PresetsWidgetItem(Swift)のCodingKeys・JS側のPresetsWidgetItemと一致させること
  private static let itemKeys = [
    "id",
    "name",
    "fromStationName",
    "toStationName",
    "lineName",
    "lineColor",
    "lineSymbol",
  ]

  private var appGroupID: String {
    Bundle.main.object(forInfoDictionaryKey: "APP_GROUP_ID") as? String
      ?? "group.me.tinykitten.trainlcd"
  }

  @objc(updatePresets:)
  func updatePresets(_ presets: NSArray?) {
    guard let presets = presets as? [NSDictionary] else {
      return
    }

    // Swift側のデコードが部分的に失敗しないよう、欠けたキーは空文字で埋めてから直列化する
    let items: [[String: String]] = presets.map { dic in
      var item: [String: String] = [:]
      for key in Self.itemKeys {
        item[key] = dic[key] as? String ?? ""
      }
      return item
    }

    guard
      let data = try? JSONSerialization.data(
        withJSONObject: items, options: [.sortedKeys]),
      let json = String(data: data, encoding: .utf8),
      let defaults = UserDefaults(suiteName: appGroupID)
    else {
      return
    }

    // 内容が変わっていないときはWidgetKitのリロードバジェットを消費しない
    if defaults.string(forKey: presetsStorageKey) == json {
      return
    }

    defaults.set(json, forKey: presetsStorageKey)
    WidgetCenter.shared.reloadTimelines(ofKind: presetsWidgetKind)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
