package me.tinykitten.trainlcd

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews

/**
 * ホーム画面ウィジェット。
 *
 * iOS/watchOS版のウィジェット(HomeScreenWidget / LockScreenWidget / WatchWidget)と同じ情報・体裁を
 * 踏襲し、ウィジェットのサイズに応じて4つのレイアウトを出し分ける。
 * 正方形はiOSのsystemSmall、横長はsystemMedium、置ける情報が減る極小サイズは
 * accessoryCircular / accessoryInlineに相当する。
 *
 * 背景はwatchOS向けライブアクティビティ(SmartStackLiveActivityContentView)と同じく
 * 路線色のベタ塗り + グラデーションで、下地(widget_background)を路線色に着色し、
 * その上にグラデーション(widget_background_shade)を重ねて作る。
 * 文字・アイコンの色は路線色の明るさで変わるため、レイアウトのXMLではなくWidgetThemeが実行時に決める。
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
        // レイアウト出し分けの閾値(dp)
        private const val CIRCULAR_MAX_WIDTH_DP = 110
        private const val INLINE_MAX_HEIGHT_DP = 60
        private const val SMALL_MIN_HEIGHT_DP = 110

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
                !state.loaded -> context.getString(R.string.widget_line_symbol_placeholder)
                state.lineSymbol.isNotEmpty() -> state.lineSymbol
                lineName.isNotEmpty() -> lineName.take(1)
                else -> context.getString(R.string.widget_line_symbol_placeholder)
            }
            // 未乗車時と路線色が空のときはiOS版と同じブランドカラーへフォールバックする
            val lineColor = WidgetStateStore.parseColor(
                if (state.loaded) state.lineColor else WidgetStateStore.PLACEHOLDER_LINE_COLOR,
                WidgetStateStore.parseColor(WidgetStateStore.PLACEHOLDER_LINE_COLOR, 0)
            )

            val views = when {
                // サイズ未取得(0)のときは既定の横長レイアウトにフォールバックする
                minWidthDp in 1 until CIRCULAR_MAX_WIDTH_DP ->
                    circularViews(context, lineSymbol, lineColor)
                minHeightDp in 1..INLINE_MAX_HEIGHT_DP ->
                    inlineViews(context, lineName, lineColor)
                // 4x2のような横長は高さが足りていても横長レイアウトを使う
                minHeightDp >= SMALL_MIN_HEIGHT_DP && minWidthDp <= minHeightDp ->
                    smallViews(context, lineName, boundFor, lineSymbol, lineColor, state.loaded)
                else ->
                    rectangularViews(
                        context, lineName, boundFor, lineSymbol, lineColor, state.loaded
                    )
            }

            views.setContentDescription(R.id.widget_root, "$lineName / $boundFor")
            createContentIntent(context)?.let {
                views.setOnClickPendingIntent(R.id.widget_root, it)
            }

            return views
        }

        /** 背景の下地を路線色へ着色する。上に重なるグラデーションは静的なので触らない */
        private fun RemoteViews.applyBackground(lineColor: Int) {
            setInt(R.id.widget_background, "setColorFilter", lineColor)
        }

        /**
         * ナンバリングバッジ。
         * 面が路線色で塗られているため、バッジ側を前景色で塗り潰して記号を路線色へ反転させる
         */
        private fun RemoteViews.applyNumberingBadge(lineSymbol: String, lineColor: Int) {
            setInt(R.id.widget_numbering_badge, "setColorFilter", WidgetTheme.onLineColor(lineColor))
            setTextViewText(R.id.widget_line_symbol, lineSymbol)
            setTextColor(R.id.widget_line_symbol, lineColor)
        }

        /** 路線名・方面の文字色。路線色の明るさで白黒が入れ替わる */
        private fun RemoteViews.applyTextColors(lineColor: Int) {
            setTextColor(R.id.widget_line_name, WidgetTheme.onLineColor(lineColor))
            setTextColor(R.id.widget_bound_for, WidgetTheme.onLineColorSecondary(lineColor))
        }

        /**
         * 方面の手前に置く矢印。
         * iOS版と同様、乗車中だけ「行き先」であることを示すために出す。
         * 未乗車時は「方面が未設定です」という案内文なので矢印は付けない
         */
        private fun RemoteViews.applyBoundForArrow(loaded: Boolean, lineColor: Int) {
            setViewVisibility(
                R.id.widget_bound_for_arrow,
                if (loaded) View.VISIBLE else View.GONE
            )
            setInt(
                R.id.widget_bound_for_arrow,
                "setColorFilter",
                WidgetTheme.onLineColorSecondary(lineColor)
            )
        }

        private fun circularViews(
            context: Context,
            lineSymbol: String,
            lineColor: Int
        ): RemoteViews =
            RemoteViews(context.packageName, R.layout.widget_ride_circular).apply {
                applyBackground(lineColor)
                // 面そのものがバッジなので、記号は反転させず前景色のまま載せる
                setTextViewText(R.id.widget_line_symbol, lineSymbol)
                setTextColor(R.id.widget_line_symbol, WidgetTheme.onLineColor(lineColor))
            }

        private fun inlineViews(
            context: Context,
            lineName: String,
            lineColor: Int
        ): RemoteViews =
            RemoteViews(context.packageName, R.layout.widget_ride_inline).apply {
                applyBackground(lineColor)
                setInt(R.id.widget_brand_icon, "setColorFilter", WidgetTheme.onLineColor(lineColor))
                setTextViewText(R.id.widget_inline_text, lineName)
                setTextColor(R.id.widget_inline_text, WidgetTheme.onLineColor(lineColor))
            }

        private fun smallViews(
            context: Context,
            lineName: String,
            boundFor: String,
            lineSymbol: String,
            lineColor: Int,
            loaded: Boolean
        ): RemoteViews =
            RemoteViews(context.packageName, R.layout.widget_ride_small).apply {
                applyBackground(lineColor)
                applyNumberingBadge(lineSymbol, lineColor)
                applyTextColors(lineColor)
                applyBoundForArrow(loaded, lineColor)
                setInt(
                    R.id.widget_brand_icon,
                    "setColorFilter",
                    WidgetTheme.onLineColorSecondary(lineColor)
                )
                setTextViewText(R.id.widget_line_name, lineName)
                setTextViewText(R.id.widget_bound_for, boundFor)
            }

        private fun rectangularViews(
            context: Context,
            lineName: String,
            boundFor: String,
            lineSymbol: String,
            lineColor: Int,
            loaded: Boolean
        ): RemoteViews =
            RemoteViews(context.packageName, R.layout.widget_ride_rectangular).apply {
                applyBackground(lineColor)
                applyNumberingBadge(lineSymbol, lineColor)
                applyTextColors(lineColor)
                applyBoundForArrow(loaded, lineColor)
                // ブランド行のカプセルは前景色を薄く敷いたもの。色と不透明度は分けて与える
                setInt(R.id.widget_brand_chip, "setColorFilter", WidgetTheme.onLineColor(lineColor))
                setInt(
                    R.id.widget_brand_chip,
                    "setImageAlpha",
                    (WidgetTheme.CHIP_ALPHA * 255).toInt()
                )
                setInt(R.id.widget_brand_icon, "setColorFilter", WidgetTheme.onLineColor(lineColor))
                setTextColor(R.id.widget_brand_label, WidgetTheme.onLineColor(lineColor))
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
