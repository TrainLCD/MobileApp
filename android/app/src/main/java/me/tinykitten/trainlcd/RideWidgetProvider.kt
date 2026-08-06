package me.tinykitten.trainlcd

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import android.widget.RemoteViews

/**
 * ホーム画面ウィジェット。
 *
 * iOS/watchOS版のウィジェット(LockScreenWidget / WatchWidget)と同じ情報・体裁を踏襲し、
 * ウィジェットのサイズに応じて円形(accessoryCircular相当)、1行(accessoryInline相当)、
 * 横長(accessoryRectangular相当)の3レイアウトを出し分ける。
 */
class RideWidgetProvider : AppWidgetProvider() {
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
        // リサイズでレイアウトの出し分けが変わるため再描画する
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    companion object {
        // iOSのaccessoryCircular/accessoryInline/accessoryRectangularに対応する閾値(dp)
        private const val CIRCULAR_MAX_WIDTH_DP = 110
        private const val INLINE_MAX_HEIGHT_DP = 70

        /** アプリ側から表示内容を更新する際のエントリポイント */
        fun updateAll(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context) ?: return
            val ids = appWidgetManager.getAppWidgetIds(
                ComponentName(context.applicationContext, RideWidgetProvider::class.java)
            )
            ids.forEach { updateWidget(context, appWidgetManager, it) }
        }

        private fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val options: Bundle? = appWidgetManager.getAppWidgetOptions(appWidgetId)
            val minWidthDp = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) ?: 0
            val minHeightDp = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) ?: 0

            appWidgetManager.updateAppWidget(
                appWidgetId,
                buildRemoteViews(
                    context,
                    WidgetStateStore.load(context),
                    minWidthDp,
                    minHeightDp
                )
            )
        }

        private fun buildRemoteViews(
            context: Context,
            state: WidgetState,
            minWidthDp: Int,
            minHeightDp: Int
        ): RemoteViews {
            val lineName = if (state.loaded && state.lineName.isNotEmpty()) {
                state.lineName
            } else {
                context.getString(R.string.widget_line_not_set)
            }
            val boundFor = if (state.loaded && state.boundStationName.isNotEmpty()) {
                state.boundStationName
            } else {
                context.getString(R.string.widget_destination_not_set)
            }
            // iOS版と同様に、路線記号が無い路線では路線名の先頭1文字で代替する
            val lineSymbol = when {
                !state.loaded -> "?"
                state.lineSymbol.isNotEmpty() -> state.lineSymbol
                lineName.isNotEmpty() -> lineName.take(1)
                else -> "?"
            }
            val lineColor = WidgetStateStore.parseColor(
                if (state.loaded) state.lineColor else WidgetStateStore.PLACEHOLDER_LINE_COLOR,
                WidgetStateStore.parseColor(WidgetStateStore.PLACEHOLDER_LINE_COLOR, 0)
            )

            val views = when {
                // サイズ未取得(0)のときは既定の横長レイアウトにフォールバックする
                minWidthDp in 1 until CIRCULAR_MAX_WIDTH_DP ->
                    circularViews(context, lineSymbol, lineColor)
                minHeightDp in 1..INLINE_MAX_HEIGHT_DP ->
                    inlineViews(context, state.loaded, lineName, lineColor)
                else -> rectangularViews(context, lineName, boundFor, lineColor)
            }

            views.setContentDescription(
                R.id.widget_root,
                if (state.loaded) {
                    "${context.getString(R.string.widget_riding_on, lineName)} / $boundFor"
                } else {
                    context.getString(R.string.app_name)
                }
            )
            createContentIntent(context)?.let {
                views.setOnClickPendingIntent(R.id.widget_root, it)
            }

            return views
        }

        private fun circularViews(
            context: Context,
            lineSymbol: String,
            lineColor: Int
        ): RemoteViews =
            RemoteViews(context.packageName, R.layout.widget_ride_circular).apply {
                setInt(R.id.widget_numbering_circle, "setColorFilter", lineColor)
                setTextViewText(R.id.widget_line_symbol, lineSymbol)
            }

        private fun inlineViews(
            context: Context,
            loaded: Boolean,
            lineName: String,
            lineColor: Int
        ): RemoteViews =
            RemoteViews(context.packageName, R.layout.widget_ride_inline).apply {
                setInt(R.id.widget_line_bar, "setColorFilter", lineColor)
                setTextViewText(
                    R.id.widget_inline_text,
                    if (loaded) {
                        context.getString(R.string.widget_riding_on, lineName)
                    } else {
                        context.getString(R.string.app_name)
                    }
                )
            }

        private fun rectangularViews(
            context: Context,
            lineName: String,
            boundFor: String,
            lineColor: Int
        ): RemoteViews =
            RemoteViews(context.packageName, R.layout.widget_ride_rectangular).apply {
                setInt(R.id.widget_line_bar, "setColorFilter", lineColor)
                setTextViewText(R.id.widget_line_name, lineName)
                setTextViewText(R.id.widget_bound_for, boundFor)
            }

        private fun createContentIntent(context: Context): PendingIntent? {
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
