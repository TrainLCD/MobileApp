# iOS App Clip のブートストラップ

`ProdAppClip` / `CanaryAppClip` は本体アプリとは別バイナリなので、独自の
`AppDelegate` を持つ。App Clip 側だけ React Native の起動経路を間違えると、
ビルドは通るのに起動後真っ白のまま固まる、という形で表面化する。

## 必ず Expo のブートストラップを使う

App Clip の `AppDelegate.swift` は本体アプリの `ios/AppDelegate.swift` と同じ構成
（`ExpoAppDelegate` + `ExpoReactNativeFactory` + `ExpoReactNativeFactoryDelegate`）
を維持すること。React Native 素の `RCTAppDelegate` を継承してはならない。

理由は次の 2 点。

1. **Expo モジュールが 1 つも登録されない。** Expo SDK 57 では `EXAppContext` を
   生成して `registerNativeModules()` を呼ぶのは
   `expo/ios/AppDelegates/ExpoReactNativeFactory.mm` の
   `host:didInitializeRuntime:` だけになっている。`RCTAppDelegate` は
   `RCTReactNativeFactory` しか作らないためこの経路を通らず、JS 側の
   `requireNativeModule()` が軒並み失敗する。`react-native-app-clip` の
   `isClip()` は `requireNativeModule("ReactNativeAppClip")` をモジュール
   トップレベルで評価するので、`src/utils/theme.ts` などが読み込まれた時点で
   バンドル評価ごと落ちる。Release ビルドには redbox が無いため、
   ルートビューだけが残って白画面で固まったように見える。
2. **New Architecture の依存プロバイダが未設定になる。**
   `delegate.dependencyProvider = RCTAppDependencyProvider()` を設定しないと
   `thirdPartyFabricComponents` が空になり、autolink したネイティブ
   コンポーネントが一切登録されない。

## `Expo` は `internal import` で取り込む

`import Expo` ではなく `internal import Expo` と書くこと。CocoaPods が各ターゲット
向けに生成する `ios/Pods/Target Support Files/Pods-TrainLCD-<Target>/ExpoModulesProvider.swift`
が `internal import Expo` を書いており、同じモジュール内でアクセスレベルの
指定有無が混ざると Swift が

```text
error: ambiguous implicit access level for import of 'Expo'; it is imported as 'internal' elsewhere
```

を出してアーカイブが失敗する（実例: [Build iOS Canary #31593391309](https://github.com/TrainLCD/MobileApp/actions/runs/31593391309)）。
本体アプリの `ios/AppDelegate.swift` も同じ理由で `internal import Expo` になっている。
`ExpoModulesProvider.swift` は生成物なので、揃えるのは常に App Clip 側。

## 起動 URL（App Clip Invocation URL）の受け取り

App Clip の起動 URL は `application(_:continue:restorationHandler:)` にしか
流れてこない。`super` を呼んで `ExpoAppDelegateSubscriberManager` に転送すると、
`expo-linking` の `LinkingAppDelegateSubscriber` が URL を保持し、
`src/hooks/useDeepLink.ts` の `Linking.getInitialURL()` で解決できるようになる。
`super` を呼ばない実装にするとディープリンクが黙って壊れるので注意。

## ファイル構成

App Clip ターゲットは Xcode の同期グループ
（`PBXFileSystemSynchronizedRootGroup`）で構成されているため、
`ios/ProdAppClip/` `ios/CanaryAppClip/` にファイルを置くだけでターゲットへ
自動的に追加される。`project.pbxproj` を手で編集する必要はない
（`Info.plist` のみ `membershipExceptions` で除外済み）。

エントリポイントは `AppDelegate.swift` の `@UIApplicationMain` が生成するので、
`main.m` / `AppDelegate.h` / `AppDelegate.m` は置かないこと。
