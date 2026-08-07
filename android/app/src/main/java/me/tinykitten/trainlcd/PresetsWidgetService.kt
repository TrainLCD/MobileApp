package me.tinykitten.trainlcd

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import android.widget.RemoteViewsService

/**
 * プリセットウィジェットの行を供給するサービス。
 *
 * 行数をウィジェットの高さから見積もると、端末やランチャーによって実寸が変わるうえ
 * 縦横で高さも変わるため、必ずどこかでずれる。ListViewのアダプタとして供給すれば
 * 「入るだけ表示して残りはスクロール」をシステムに任せられるので、高さ計算自体を持たない。
 */
class PresetsWidgetService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory =
        PresetsRemoteViewsFactory(applicationContext)
}

private class PresetsRemoteViewsFactory(
    private val context: Context
) : RemoteViewsService.RemoteViewsFactory {
    private var presets: List<PresetWidgetItem> = emptyList()

    override fun onCreate() {
        presets = PresetsWidgetStore.load(context)
    }

    /** notifyAppWidgetViewDataChangedのたびに呼ばれる。ここで最新のプリセットを読み直す */
    override fun onDataSetChanged() {
        presets = PresetsWidgetStore.load(context)
    }

    override fun onDestroy() {
        presets = emptyList()
    }

    override fun getCount(): Int = presets.size

    override fun getViewAt(position: Int): RemoteViews {
        val preset = presets.getOrNull(position)
            ?: return RemoteViews(context.packageName, R.layout.widget_presets_row)

        // iOS版と同様に、路線記号が無い路線では路線名の先頭1文字で代替する
        val lineSymbol = when {
            preset.lineSymbol.isNotEmpty() -> preset.lineSymbol
            preset.lineName.isNotEmpty() -> preset.lineName.take(1)
            else -> context.getString(R.string.widget_line_symbol_placeholder)
        }
        val lineColor = WidgetStateStore.parseColor(
            preset.lineColor.ifEmpty { WidgetStateStore.PLACEHOLDER_LINE_COLOR },
            WidgetStateStore.parseColor(WidgetStateStore.PLACEHOLDER_LINE_COLOR, 0)
        )
        // 駅名が未取得のプリセットでは路線名だけを出す
        val route = if (preset.fromStationName.isEmpty() || preset.toStationName.isEmpty()) {
            preset.lineName
        } else {
            context.getString(
                R.string.widget_presets_route,
                preset.fromStationName,
                preset.toStationName
            )
        }

        return RemoteViews(context.packageName, R.layout.widget_presets_row).apply {
            setInt(R.id.widget_preset_circle, "setColorFilter", lineColor)
            setTextViewText(R.id.widget_preset_symbol, lineSymbol)
            setTextViewText(R.id.widget_preset_name, preset.name)
            setTextViewText(R.id.widget_preset_route, route)
            setContentDescription(R.id.widget_preset_row, "${preset.name} / $route")
            // タップ先はProvider側のsetPendingIntentTemplateと組み合わさる。
            // ここではテンプレートに差し込むディープリンクのURIだけを渡す
            setOnClickFillInIntent(
                R.id.widget_preset_row,
                Intent().setData(presetUri(context, preset.id))
            )
        }
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = false
}

/** `trainlcd://?preset=<SavedRoute.id>`。Canaryビルドではスキームがtrainlcd-canaryになる */
private fun presetUri(context: Context, presetId: String): Uri =
    Uri.Builder()
        .scheme(context.getString(R.string.app_scheme))
        .authority("")
        .appendQueryParameter("preset", presetId)
        .build()
