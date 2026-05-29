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

        /**
             * Indicates whether Picture-in-Picture can be entered on the current device.
             *
             * @return `true` if the device SDK is Android O (API 26) or newer and Picture-in-Picture has been enabled; `false` otherwise.
             */
            fun shouldEnterPictureInPicture(): Boolean =
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && pictureInPictureEnabled

        /**
         * Emits a JavaScript event notifying listeners that the Picture-in-Picture mode state changed.
         *
         * When a React context is available and the React instance is active, this sends an event named
         * `TrainLCDPictureInPictureModeChanged` with a payload `{ "isInPictureInPictureMode": <value> }`.
         * If the React context is null, inactive, or the JS emitter is unavailable, the call is a no-op.
         *
         * @param isInPictureInPictureMode `true` when the app entered Picture-in-Picture mode, `false` when it exited.
         */
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

    /**
 * Provides the name under which this native module is registered with React Native.
 *
 * @return The module name exposed to JavaScript: "PictureInPictureModule".
 */
override fun getName() = "PictureInPictureModule"

    /**
     * Updates whether entering Picture-in-Picture mode is allowed.
     *
     * @param enabled `true` to allow entering Picture-in-Picture mode, `false` to disallow it.
     */
    @ReactMethod
    fun setPictureInPictureEnabled(enabled: Boolean) {
        pictureInPictureEnabled = enabled
    }

    /**
     * Placeholder required by React Native's NativeEventEmitter API; intentionally does nothing.
     *
     * @param _eventName Name of the event to listen for; accepted for API compatibility and ignored. 
     */
    @ReactMethod
    fun addListener(_eventName: String) {
        // Required by NativeEventEmitter.
    }

    /**
     * No-op required by NativeEventEmitter that accepts and ignores a listener count.
     *
     * @param _count Number of listeners to remove; this value is unused.
     */
    @ReactMethod
    fun removeListeners(_count: Double) {
        // Required by NativeEventEmitter.
    }
}
