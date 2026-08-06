package me.tinykitten.trainlcd

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

private fun ReadableMap.optString(key: String, default: String = ""): String =
    if (hasKey(key) && !isNull(key)) getString(key) ?: default else default

/**
 * ホーム画面ウィジェットの表示内容をJS側から更新するモジュール。
 *
 * iOS版はLiveActivityModuleがライブアクティビティ更新のついでにウィジェット用の
 * App Groupへ書き込んでいるが、Android版のライブアップデート(LiveUpdateModule)は
 * Android 16以降専用のため、ウィジェットの更新経路は独立させている。
 */
class WidgetModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "WidgetModule"

    @ReactMethod
    fun updateWidget(state: ReadableMap?) {
        if (state == null) {
            return
        }

        val changed = WidgetStateStore.save(
            reactApplicationContext,
            lineName = state.optString("lineName"),
            lineColor = state.optString("lineColor"),
            lineSymbol = state.optString("lineSymbol"),
            boundStationName = state.optString("boundStationName")
        )
        if (changed) {
            RideWidgetProvider.updateAll(reactApplicationContext)
        }
    }

    @ReactMethod
    fun clearWidget() {
        if (WidgetStateStore.clear(reactApplicationContext)) {
            RideWidgetProvider.updateAll(reactApplicationContext)
        }
    }
}
