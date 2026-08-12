//
//  AppDelegate.swift
//  ProdAppClip
//
//  Created by Tsubasa SEKIGUCHI on 2025/02/19.
//  Copyright © 2025 Facebook. All rights reserved.
//

import Expo
import React
import ReactAppDependencyProvider

// App Clip も本体アプリ（ios/AppDelegate.swift）と同じ Expo のブートストラップを使う。
// 素の `RCTAppDelegate` は `RCTReactNativeFactory` しか生成せず、`EXAppContext` を作って
// `registerNativeModules()` を呼ぶのは `ExpoReactNativeFactory` だけなので、
// 旧実装では Expo モジュールが 1 つも登録されず JS 評価時に落ちて白画面のまま固まっていた。
@UIApplicationMain
internal class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    // New Architecture では autolink されたネイティブモジュール／Fabric コンポーネントの
    // 解決にこの provider が必須。未設定だとコンポーネントが一切登録されない。
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  // App Clip の起動 URL はここにしか流れてこない。`super` 経由で expo-linking の
  // `LinkingAppDelegateSubscriber` に渡すことで `Linking.getInitialURL()` が解決できるようになる。
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
