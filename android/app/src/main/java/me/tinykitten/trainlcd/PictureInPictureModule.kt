package me.tinykitten.trainlcd

import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class PictureInPictureModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext),
  LifecycleEventObserver {
  private var isInPiPMode = false
  
  override fun getName() = "PictureInPictureModule"


  private fun sendEvent(eventName: String, params: WritableMap?) {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, params)
  }
  
  @ReactMethod
  fun registerLifecycleEventObserver() {
    val activity = reactApplicationContext.currentActivity as AppCompatActivity
    activity.runOnUiThread { activity.lifecycle.addObserver(this) }
  }

  @RequiresApi(Build.VERSION_CODES.N)
  override fun onStateChanged(source: LifecycleOwner, event: Lifecycle.Event) {
    val activity = source as AppCompatActivity
    val isInPiPMode = activity.isInPictureInPictureMode
    if (this.isInPiPMode != isInPiPMode) {
      this.isInPiPMode = isInPiPMode
      Log.d(this.getName(), "Activity pip mode has changed to $isInPiPMode");
      val args = Arguments.createMap()
      args.putBoolean("isInPiPMode", isInPiPMode)
      sendEvent("onPictureInPictureModeChanged", args)
    }
  }
}
