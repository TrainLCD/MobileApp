package me.tinykitten.trainlcd

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

/**
 * アプリ内で登録したプリセットを並べるホーム画面ウィジェット。
 *
 * 行をタップすると `trainlcd://?preset=<SavedRoute.id>` のディープリンクでアプリが起動し、
 * 該当プリセットの行き先選択が開く(JS側のuseDeepLink)。
 * iOS版(PresetsWidget.swift)と同じ体裁・同じディープリンクを踏襲する。
 */
class PresetsWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        // リサイズで表示できる行数が変わるため再描画する
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    companion object {
        /** ヘッダーとルート要素の余白が占める高さ(dp) */
        private const val CHROME_HEIGHT_DP = 44

        /** 1行あたりの高さ(dp)。widget_presets_rowのサークル34dp + 上下パディング5dpずつ */
        private const val ROW_HEIGHT_DP = 44

        /** ウィジェットの高さが取得できないときに表示する行数 */
        private const val FALLBACK_ROW_COUNT = 2

        /** JS側のMAX_PRESETS_WIDGET_ITEMSと揃えた表示上限 */
        private const val MAX_ROW_COUNT = 8

        /** アプリ側から表示内容を更新する際のエントリポイント */
        fun updateAll(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context) ?: return
            val ids = appWidgetManager.getAppWidgetIds(
                ComponentName(context.applicationContext, PresetsWidgetProvider::class.java)
            )
            ids.forEach { updateWidget(context, appWidgetManager, it) }
        }

        private fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val options: Bundle? = appWidgetManager.getAppWidgetOptions(appWidgetId)
            val minHeightDp = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) ?: 0

            appWidgetManager.updateAppWidget(
                appWidgetId,
                buildRemoteViews(
                    context,
                    PresetsWidgetStore.load(context),
                    resolveRowCount(minHeightDp)
                )
            )
        }

        private fun resolveRowCount(minHeightDp: Int): Int {
            if (minHeightDp <= 0) {
                return FALLBACK_ROW_COUNT
            }
            val available = minHeightDp - CHROME_HEIGHT_DP
            return (available / ROW_HEIGHT_DP).coerceIn(1, MAX_ROW_COUNT)
        }

        private fun buildRemoteViews(
            context: Context,
            presets: List<PresetWidgetItem>,
            rowCount: Int
        ): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_presets)
            // RemoteViewsは再利用されるため、addViewする前に必ず前回の行を消す
            views.removeAllViews(R.id.widget_presets_list)

            if (presets.isEmpty()) {
                views.setViewVisibility(R.id.widget_presets_list, View.GONE)
                views.setViewVisibility(R.id.widget_presets_empty, View.VISIBLE)
                views.setContentDescription(
                    R.id.widget_presets_root,
                    context.getString(R.string.widget_presets_empty)
                )
                // プリセット未登録時はウィジェット全体をアプリ起動のタップ領域にする
                createLaunchIntent(context)?.let {
                    views.setOnClickPendingIntent(R.id.widget_presets_root, it)
                }
                return views
            }

            views.setViewVisibility(R.id.widget_presets_list, View.VISIBLE)
            views.setViewVisibility(R.id.widget_presets_empty, View.GONE)

            val visiblePresets = presets.take(rowCount)
            visiblePresets.forEachIndexed { index, preset ->
                views.addView(
                    R.id.widget_presets_list,
                    buildRowViews(context, preset, index)
                )
            }
            views.setContentDescription(
                R.id.widget_presets_root,
                visiblePresets.joinToString(", ") { it.name }
            )

            return views
        }

        private fun buildRowViews(
            context: Context,
            preset: PresetWidgetItem,
            index: Int
        ): RemoteViews {
            // iOS版と同様に、路線記号が無い路線ではプリセット名ではなく路線名の先頭1文字で代替する
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
            val route =
                if (preset.fromStationName.isEmpty() || preset.toStationName.isEmpty()) {
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
                createPresetIntent(context, preset.id, index)?.let {
                    setOnClickPendingIntent(R.id.widget_preset_row, it)
                }
            }
        }

        private fun createPresetIntent(
            context: Context,
            presetId: String,
            index: Int
        ): PendingIntent? {
            val uri = Uri.Builder()
                .scheme(context.getString(R.string.app_scheme))
                .authority("")
                .appendQueryParameter("preset", presetId)
                .build()
            val intent = Intent(Intent.ACTION_VIEW, uri).apply {
                // 他アプリが同じスキームを宣言していても自アプリへ確実に届くよう明示する
                setPackage(context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            if (intent.resolveActivity(context.packageManager) == null) {
                return createLaunchIntent(context)
            }
            return PendingIntent.getActivity(
                context,
                // 行ごとにPendingIntentを作り分けるためrequestCodeを変える。
                // 同じ値を使うとFLAG_UPDATE_CURRENTで全行が最後のURIに揃ってしまう
                index + 1,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        private fun createLaunchIntent(context: Context): PendingIntent? {
            val intent = context.packageManager
                .getLaunchIntentForPackage(context.packageName) ?: return null
            return PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }
}
