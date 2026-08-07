package me.tinykitten.trainlcd

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

private fun ReadableMap.optString(key: String, default: String = ""): String =
    if (hasKey(key) && !isNull(key)) getString(key) ?: default else default

/**
 * ホーム画面ウィジェットの表示内容をJS側から更新するモジュール。
 *
 * iOS版はLiveActivityModuleがライブアクティビティ更新のついでにウィジェット用の
 * App Groupへ書き込んでいるが、Android版のライブアップデート(LiveUpdateModule)は
 * Android 16以降専用のため、ウィジェットの更新経路は独立させている。
 *
 * プリセットウィジェット(PresetsWidgetProvider)の更新も、iOS版と違って
 * 同じSharedPreferencesを共有するためこのモジュールに相乗りさせている。
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

    /** プリセットウィジェットへ表示するプリセット一覧を同期する */
    @ReactMethod
    fun updatePresets(presets: ReadableArray?) {
        if (presets == null) {
            return
        }

        val items = (0 until presets.size()).mapNotNull { index ->
            if (presets.getType(index) != ReadableType.Map) {
                return@mapNotNull null
            }
            val map = presets.getMap(index) ?: return@mapNotNull null
            val id = map.optString("id")
            // idが無いとディープリンクを組み立てられないため取り込まない
            if (id.isEmpty()) {
                return@mapNotNull null
            }
            PresetWidgetItem(
                id = id,
                name = map.optString("name"),
                fromStationName = map.optString("fromStationName"),
                toStationName = map.optString("toStationName"),
                lineName = map.optString("lineName"),
                lineColor = map.optString("lineColor"),
                lineSymbol = map.optString("lineSymbol")
            )
        }

        if (PresetsWidgetStore.save(reactApplicationContext, items)) {
            PresetsWidgetProvider.updateAll(reactApplicationContext)
        }
    }
}
