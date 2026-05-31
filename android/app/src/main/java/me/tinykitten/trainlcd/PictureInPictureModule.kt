package me.tinykitten.trainlcd

import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class PictureInPictureModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val EVENT_NAME = "TrainLCDPictureInPictureModeChanged"
        @Volatile
        private var pictureInPictureEnabled = false
        @Volatile
        private var reactContextRef: ReactApplicationContext? = null

        fun shouldEnterPictureInPicture(): Boolean =
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && pictureInPictureEnabled

        fun emitPictureInPictureModeChanged(isInPictureInPictureMode: Boolean) {
            reactContextRef
                ?.takeIf { it.hasActiveReactInstance() }
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(EVENT_NAME, Arguments.createMap().apply {
                    putBoolean("isInPictureInPictureMode", isInPictureInPictureMode)
                })
        }
    }

    init {
        reactContextRef = reactContext
    }

    override fun getName() = "PictureInPictureModule"

    @ReactMethod
    fun setPictureInPictureEnabled(enabled: Boolean) {
        pictureInPictureEnabled = enabled
    }

    @ReactMethod
    fun addListener(_eventName: String) {
        // Required by NativeEventEmitter.
    }

    @ReactMethod
    fun removeListeners(_count: Double) {
        // Required by NativeEventEmitter.
    }
}
