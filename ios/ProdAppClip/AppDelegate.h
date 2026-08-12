//
//  AppDelegate.h
//  ProdAppClip
//
//  Created by Tsubasa SEKIGUCHI on 2025/02/19.
//  Copyright © 2025 Facebook. All rights reserved.
//

#import <UIKit/UIKit.h>
// RCTAppDelegate は <Expo/Expo.h> が読み込む React-Core-prebuilt 側の umbrella から解決する。
// <RCTAppDelegate.h> を直接 import すると React-RCTAppDelegate 側の同名ヘッダも展開され、
// 同一クラスが二重定義になってコンパイルできない（Expo SDK 57 / React Native 0.86）。
#import <Expo/Expo.h>

@interface AppDelegate : RCTAppDelegate

@end
