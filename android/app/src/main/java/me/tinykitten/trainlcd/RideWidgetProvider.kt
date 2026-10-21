package me.tinykitten.trainlcd

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.util.SizeF
import androidx.core.os.BundleCompat
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
            val state = WidgetStateStore.load(context)
            val sizes = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && options != null) {
                BundleCompat.getParcelableArrayList(options, AppWidgetManager.OPTION_APPWIDGET_SIZES, SizeF::class.java)
                    ?.filter { it.width > 0 && it.height > 0 && it.width.isFinite() && it.height.isFinite() }
                    ?.distinct()
            } else null

            val views = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !sizes.isNullOrEmpty()) {
                RemoteViews(sizes.associateWith { size ->
                    buildRemoteViews(context, state, size.width.toInt(), size.height.toInt())
                })
            } else {
                // 旧形式の範囲は同時に表示される一組のサイズではない。
                // 縦は最小幅×最大高、横は最大幅×最小高として個別に判定する。
                val minWidth = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) ?: 0
                val minHeight = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) ?: 0
                val maxWidth = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0) ?: 0
                val maxHeight = options?.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0) ?: 0
                val portrait = buildRemoteViews(context, state, minWidth, maxHeight)
                val landscape = buildRemoteViews(context, state, maxWidth, minHeight)
                RemoteViews(landscape, portrait)
            }
            appWidgetManager.updateAppWidget(appWidgetId, views)
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
                    fittingStationViews(context, state, lineName, boundFor, lineSymbol, lineColor, minWidthDp, minHeightDp, true)
                else -> fittingStationViews(context, state, lineName, boundFor, lineSymbol, lineColor, minWidthDp, minHeightDp, false)
            }

            views.setContentDescription(R.id.widget_root, listOf(lineName, if (state.loaded) state.stationName else "", if (state.loaded) state.nextStationName else "", boundFor).filter { it.isNotEmpty() }.joinToString(" / "))
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

        /**
         * XMLの余白と実際の文字サイズを含めて測定し、見切れない表示を選ぶ。
         * サイズ未取得時は従来のレイアウトを保ち、正方形が収まらなければ横長、
         * 横長も収まらなければ駅情報を持たない既存の1行表示へ切り替える。
         */
        private fun fittingStationViews(
            context: Context,
            state: WidgetState,
            lineName: String,
            boundFor: String,
            lineSymbol: String,
            lineColor: Int,
            widthDp: Int,
            heightDp: Int,
            vertical: Boolean
        ): RemoteViews {
            val candidate = stationViews(context, state, lineName, boundFor, lineSymbol, lineColor, vertical)
            if (widthDp <= 0 || heightDp <= 0) return candidate

            val density = context.resources.displayMetrics.density
            fun fits(views: RemoteViews): Boolean {
                val view = views.apply(context, null)
                view.measure(
                    View.MeasureSpec.makeMeasureSpec((widthDp * density).toInt(), View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
                )
                return view.measuredHeight <= heightDp * density
            }

            if (fits(candidate)) return candidate
            if (vertical) {
                val horizontal = stationViews(context, state, lineName, boundFor, lineSymbol, lineColor, false)
                if (fits(horizontal)) return horizontal
            }
            return inlineViews(context, lineName, lineColor)
        }

        private fun stationViews(
            context: Context,
            state: WidgetState,
            lineName: String,
            boundFor: String,
            lineSymbol: String,
            lineColor: Int,
            vertical: Boolean
        ): RemoteViews =
            RemoteViews(context.packageName, if (vertical) R.layout.widget_ride_small else R.layout.widget_ride_rectangular).apply {
                if (!vertical) {
                    setTextColor(R.id.widget_brand_label, WidgetTheme.onLineColor(lineColor))
                }
                applyBackground(lineColor)
                applyNumberingBadge(lineSymbol, lineColor)
                applyTextColors(lineColor)
                setTextViewText(R.id.widget_line_name, lineName)
                setTextViewText(R.id.widget_bound_for, boundFor)
                val hasStations = state.loaded && (state.stationName.isNotEmpty() || state.nextStationName.isNotEmpty())
                setViewVisibility(R.id.widget_stations, if (hasStations) View.VISIBLE else View.GONE)
                setViewVisibility(R.id.widget_bound_for, if (boundFor.isNotEmpty()) View.VISIBLE else View.GONE)
                setTextViewText(R.id.widget_current_station, state.stationName)
                setTextViewText(R.id.widget_next_station, state.nextStationName)
                setViewVisibility(R.id.widget_current_station, if (state.stationName.isNotEmpty()) View.VISIBLE else View.GONE)
                setViewVisibility(R.id.widget_next_station, if (state.nextStationName.isNotEmpty()) View.VISIBLE else View.GONE)
                setViewVisibility(R.id.widget_station_arrow, if (state.stationName.isNotEmpty() && state.nextStationName.isNotEmpty()) View.VISIBLE else View.GONE)
                listOf(R.id.widget_current_station, R.id.widget_next_station, R.id.widget_station_arrow).forEach {
                    setTextColor(it, WidgetTheme.onLineColor(lineColor))
                }
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
