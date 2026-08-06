package me.tinykitten.trainlcd

import android.content.Context
import android.graphics.Color

/**
 * ホーム画面ウィジェットが表示する乗車中の路線情報。
 * iOS版がApp GroupのUserDefaultsへ書き込んでいる内容(LiveActivityModule.syncLockScreenWidgetState)と対になる。
 */
data class WidgetState(
    val loaded: Boolean,
    val lineName: String,
    val lineColor: String,
    val lineSymbol: String,
    val boundStationName: String
)

/**
 * ウィジェットの表示内容をSharedPreferencesへ永続化する。
 * アプリのプロセスが落ちていてもAppWidgetProviderから読めるようにするため、
 * メモリではなく端末ストレージへ保存する。
 */
object WidgetStateStore {
    private const val PREFS_NAME = "me.tinykitten.trainlcd.widget"
    private const val KEY_LOADED = "loaded"
    private const val KEY_LINE_NAME = "lineName"
    private const val KEY_LINE_COLOR = "lineColor"
    private const val KEY_LINE_SYMBOL = "lineSymbol"
    private const val KEY_BOUND_STATION_NAME = "boundStationName"

    /** 未乗車時にiOS版が使っているプレースホルダー色に合わせる */
    const val PLACEHOLDER_LINE_COLOR = "#277BC0"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * 乗車情報を保存する。内容に差分がある場合のみtrueを返し、
     * 変化のない更新でウィジェット再描画のブロードキャストを投げないようにする。
     */
    fun save(
        context: Context,
        lineName: String,
        lineColor: String,
        lineSymbol: String,
        boundStationName: String
    ): Boolean {
        val prefs = prefs(context)
        val unchanged = prefs.getBoolean(KEY_LOADED, false) &&
            prefs.getString(KEY_LINE_NAME, "") == lineName &&
            prefs.getString(KEY_LINE_COLOR, "") == lineColor &&
            prefs.getString(KEY_LINE_SYMBOL, "") == lineSymbol &&
            prefs.getString(KEY_BOUND_STATION_NAME, "") == boundStationName
        if (unchanged) {
            return false
        }

        prefs.edit()
            .putBoolean(KEY_LOADED, true)
            .putString(KEY_LINE_NAME, lineName)
            .putString(KEY_LINE_COLOR, lineColor)
            .putString(KEY_LINE_SYMBOL, lineSymbol)
            .putString(KEY_BOUND_STATION_NAME, boundStationName)
            .apply()
        return true
    }

    /** 降車時に未乗車表示へ戻す。既に未乗車ならfalseを返す */
    fun clear(context: Context): Boolean {
        val prefs = prefs(context)
        if (!prefs.getBoolean(KEY_LOADED, false)) {
            return false
        }
        prefs.edit().putBoolean(KEY_LOADED, false).apply()
        return true
    }

    fun load(context: Context): WidgetState {
        val prefs = prefs(context)
        return WidgetState(
            loaded = prefs.getBoolean(KEY_LOADED, false),
            lineName = prefs.getString(KEY_LINE_NAME, "").orEmpty(),
            lineColor = prefs.getString(KEY_LINE_COLOR, "").orEmpty(),
            lineSymbol = prefs.getString(KEY_LINE_SYMBOL, "").orEmpty(),
            boundStationName = prefs.getString(KEY_BOUND_STATION_NAME, "").orEmpty()
        )
    }

    /** 路線色は`#RRGGBB`と`RRGGBB`の双方が渡り得るため、どちらでも解釈できるようにする */
    fun parseColor(hex: String, fallback: Int): Int {
        if (hex.isEmpty()) {
            return fallback
        }
        return try {
            Color.parseColor(if (hex.startsWith("#")) hex else "#$hex")
        } catch (_: IllegalArgumentException) {
            fallback
        }
    }
}
