package me.tinykitten.trainlcd

import IgnoreBatteryOptimizationsModule
import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ReactShadowNode
import com.facebook.react.uimanager.ViewManager

class TrainLCDPackage : ReactPackage {

  override fun createViewManagers(
    reactContext: ReactApplicationContext
  ): MutableList<ViewManager<View, ReactShadowNode<*>>> = mutableListOf()

  /**
   * Create and return the native modules that this React package exposes to JavaScript.
   *
   * Constructs a mutable list of NativeModule instances backed by the provided ReactApplicationContext:
   * WearableModule, IgnoreBatteryOptimizationsModule, GnssModule, LiveUpdateModule, and PictureInPictureModule.
   *
   * @param reactContext The React application context used to construct each native module.
   * @return A mutable list containing the package's registered NativeModule instances.
   */
  override fun createNativeModules(
    reactContext: ReactApplicationContext
  ): MutableList<NativeModule> = listOf(
    WearableModule(reactContext),
    IgnoreBatteryOptimizationsModule(reactContext),
    GnssModule(reactContext),
    LiveUpdateModule(reactContext),
    PictureInPictureModule(reactContext)
  ).toMutableList()
}
