package me.tinykitten.trainlcd

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
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

    /** 保存済みの行と、各駅名・駅番号を対応づけた読み上げ文を返します。 */
    override fun getViewAt(position: Int): RemoteViews {
        val preset = presets.getOrNull(position)
            ?: return RemoteViews(context.packageName, R.layout.widget_presets_row)

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
            val lineSymbol = preset.lineSymbol.ifEmpty { preset.lineName.take(1).ifEmpty { "?" } }
            setInt(R.id.widget_preset_badge, "setColorFilter", WidgetTheme.onLineColor(lineColor))
            setTextViewText(R.id.widget_preset_symbol, lineSymbol)
            setTextColor(R.id.widget_preset_symbol, lineColor)
            setInt(R.id.widget_preset_background, "setColorFilter", lineColor)
            setTextColor(R.id.widget_preset_name, WidgetTheme.onLineColor(lineColor))
            setTextColor(R.id.widget_preset_line, WidgetTheme.onLineColor(lineColor))
            setTextColor(R.id.widget_preset_route, WidgetTheme.onLineColor(lineColor))
            setTextViewText(R.id.widget_preset_line, preset.lineName)
            setTextViewText(R.id.widget_preset_name, preset.name)
            setTextViewText(R.id.widget_preset_route, route)
            val hasStations = preset.fromStationName.isNotEmpty() && preset.toStationName.isNotEmpty()
            setViewVisibility(R.id.widget_preset_route, if (hasStations) View.GONE else View.VISIBLE)
            setViewVisibility(R.id.widget_preset_stations, if (hasStations) View.VISIBLE else View.GONE)
            setTextViewText(R.id.widget_preset_from_station, preset.fromStationName)
            setTextViewText(R.id.widget_preset_to_station, preset.toStationName)
            setTextViewText(R.id.widget_preset_from_number, preset.fromStationNumber)
            setTextViewText(R.id.widget_preset_to_number, preset.toStationNumber)
            val showsNumberSlot = preset.fromStationNumber.isNotBlank() || preset.toStationNumber.isNotBlank()
            val numberVisibility = if (showsNumberSlot) View.VISIBLE else View.GONE
            setViewVisibility(R.id.widget_preset_from_number, numberVisibility)
            setViewVisibility(R.id.widget_preset_to_number, numberVisibility)
            listOf(R.id.widget_preset_from_station, R.id.widget_preset_to_station,
                R.id.widget_preset_from_number, R.id.widget_preset_to_number,
                R.id.widget_preset_arrow).forEach {
                setTextColor(it, WidgetTheme.onLineColor(lineColor))
            }
            val spokenRoute = if (hasStations) context.getString(
                R.string.widget_presets_route,
                widgetStationDescription(preset.fromStationName, preset.fromStationNumber),
                widgetStationDescription(preset.toStationName, preset.toStationNumber)
            ) else route
            setContentDescription(R.id.widget_preset_row, "${preset.name} / $spokenRoute")
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
