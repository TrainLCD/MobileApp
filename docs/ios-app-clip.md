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

## 起動直後クラッシュの切り分け記録（2026-08-12）

PR #6672（白画面修正）と #6675（アーカイブ修正）を取り込んだ canary
10.13.0 (2836)（[Build iOS Canary #31595303476](https://github.com/TrainLCD/MobileApp/actions/runs/31595303476)）で、
App Clip が起動直後にクラッシュする事象が報告された。以前の「白画面のまま固まる」
とは別症状。ビルドログの精査で以下は **正常** と確認済みなので、再調査時に
疑わなくてよい。

- `Bundle React Native code and images` は Clip ターゲットでも実行され、
  `hermesc -emit-binary -O` でコンパイルした `main.jsbundle` とアセット 516 件が
  `CanaryAppClip.app` に同梱されている（`SKIP_BUNDLING` の痕跡なし）。
- `[CP] Embed Pods Frameworks` が `ExpoModulesJSI` / `React` /
  `ReactNativeDependencies` / `hermesvm` の 4 動的フレームワークを Clip の
  `Frameworks/` へ埋め込み署名済み。dyld のライブラリ欠落で落ちる線は薄い。
- entitlements（`application-identifier` / `parent-application-identifiers` /
  `on-demand-install-capable` / associated domains）は期待どおりで、
  `ValidateEmbeddedBinary` と App Store Connect のアップロード検証も通過。
- Clip 専用の `Pods-TrainLCD-CanaryTrainLCD-CanaryAppClip/ExpoModulesProvider.swift`
  がコンパイルされており、#6672 の Expo モジュール登録経路は生きている。

切り分けの前提知識:

- Release ビルドでは JS の致命的例外は `RCTFatal` がログを吐くだけで abort
  しない（前回それが「白画面」として表面化した）。ホーム画面へ落ちる
  「クラッシュ」はネイティブ層（NSException / Swift fatalError / dyld /
  watchdog / Jetsam）で起きている可能性が高い。
- 原因確定にはクラッシュレポートが必須。Xcode → Window → Organizer → Crashes、
  または端末の 設定 → プライバシーとセキュリティ → 解析と改善 → 解析データ で
  `CanaryAppClip` から始まる `.ips` を取得する。
- dSYM は Actions の `app-canary-dsyms` アーティファクトにあるが、prebuilt の
  `React` / `hermesvm` / `ReactNativeDependencies` の dSYM は含まれない
  （アップロード時に警告が出ている）。この 3 フレームワーク内のフレームは
  手動シンボリケートが必要。

クラッシュとは独立した既知の問題として、Clip ターゲットは
`INFOPLIST_KEY_UILaunchStoryboardName` が空文字のため起動スクリーンが無い。
`SplashScreenAppClip.storyboard` は Resources に同梱済みなので、クラッシュ解決後に
この設定を張ればスプラッシュを表示できる（expo-splash-screen は storyboard
不在時に何もせず戻るだけで、クラッシュはしない）。
