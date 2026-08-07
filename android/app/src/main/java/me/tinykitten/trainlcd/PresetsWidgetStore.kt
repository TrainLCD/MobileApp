package me.tinykitten.trainlcd

import android.content.Context
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

/**
 * プリセットウィジェットが表示する1件分のプリセット。
 * iOS版がApp Groupへ書き込むJSON(PresetsWidgetModule)と同じ項目を持つ。
 */
data class PresetWidgetItem(
    /** SavedRoute.id。ディープリンク(`?preset=<id>`)のペイロードにもなる */
    val id: String,
    val name: String,
    val fromStationName: String,
    val toStationName: String,
    val lineName: String,
    val lineColor: String,
    val lineSymbol: String
)

/**
 * プリセット一覧をSharedPreferencesへ永続化する。
 *
 * 乗車情報(WidgetStateStore)と同じ理由でメモリではなく端末ストレージへ置き、
 * アプリのプロセスが落ちていてもAppWidgetProviderから読めるようにする。
 * 件数が可変なのでキーを分けず、JSON文字列としてまとめて保存する。
 */
object PresetsWidgetStore {
    private const val PREFS_NAME = "me.tinykitten.trainlcd.widget"
    private const val KEY_PRESETS = "presets"

    private const val FIELD_ID = "id"
    private const val FIELD_NAME = "name"
    private const val FIELD_FROM = "fromStationName"
    private const val FIELD_TO = "toStationName"
    private const val FIELD_LINE_NAME = "lineName"
    private const val FIELD_LINE_COLOR = "lineColor"
    private const val FIELD_LINE_SYMBOL = "lineSymbol"

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * プリセット一覧を保存する。内容に差分がある場合のみtrueを返し、
     * 変化のない更新でウィジェット再描画のブロードキャストを投げないようにする。
     */
    fun save(context: Context, presets: List<PresetWidgetItem>): Boolean {
        val json = JSONArray().apply {
            presets.forEach { preset ->
                put(
                    JSONObject()
                        .put(FIELD_ID, preset.id)
                        .put(FIELD_NAME, preset.name)
                        .put(FIELD_FROM, preset.fromStationName)
                        .put(FIELD_TO, preset.toStationName)
                        .put(FIELD_LINE_NAME, preset.lineName)
                        .put(FIELD_LINE_COLOR, preset.lineColor)
                        .put(FIELD_LINE_SYMBOL, preset.lineSymbol)
                )
            }
        }.toString()

        val prefs = prefs(context)
        if (prefs.getString(KEY_PRESETS, null) == json) {
            return false
        }

        prefs.edit().putString(KEY_PRESETS, json).apply()
        return true
    }

    fun load(context: Context): List<PresetWidgetItem> {
        val json = prefs(context).getString(KEY_PRESETS, null) ?: return emptyList()

        return try {
            val array = JSONArray(json)
            // idの無い要素はディープリンクを組み立てられないため読み飛ばす
            (0 until array.length()).mapNotNull { index ->
                val obj = array.optJSONObject(index) ?: return@mapNotNull null
                val id = obj.optString(FIELD_ID)
                if (id.isEmpty()) {
                    return@mapNotNull null
                }
                PresetWidgetItem(
                    id = id,
                    name = obj.optString(FIELD_NAME),
                    fromStationName = obj.optString(FIELD_FROM),
                    toStationName = obj.optString(FIELD_TO),
                    lineName = obj.optString(FIELD_LINE_NAME),
                    lineColor = obj.optString(FIELD_LINE_COLOR),
                    lineSymbol = obj.optString(FIELD_LINE_SYMBOL)
                )
            }
        } catch (_: JSONException) {
            emptyList()
        }
    }
}
