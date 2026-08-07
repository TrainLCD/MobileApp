package me.tinykitten.trainlcd

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.widget.RemoteViews

/**
 * アプリ内で登録したプリセットを並べるホーム画面ウィジェット。
 *
 * 行をタップすると `trainlcd://?preset=<SavedRoute.id>` のディープリンクでアプリが起動し、
 * 該当プリセットの行き先選択が開く(JS側のuseDeepLink)。
 * iOS版(PresetsWidget.swift)と同じ体裁・同じディープリンクを踏襲する。
 *
 * 行の供給はPresetsWidgetServiceに任せている。ウィジェットの高さから表示行数を
 * 見積もる方式は端末やランチャー・画面の向きで実寸が変わるため必ずずれる。
 * ListViewのアダプタにすれば「入るだけ表示して残りは縦スクロール」をシステムが担うので、
 * 高さ計算を持たずに全件へ到達できる。縦スクロールできる以上リサイズしても
 * 見られる情報は増えないため、サイズは2x2固定にしている(presets_widget_info.xml)。
 */
class PresetsWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    companion object {
        /** アプリ側から表示内容を更新する際のエントリポイント */
        fun updateAll(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context) ?: return
            val ids = appWidgetManager.getAppWidgetIds(
                ComponentName(context.applicationContext, PresetsWidgetProvider::class.java)
            )
            if (ids.isEmpty()) {
                return
            }
            ids.forEach { updateWidget(context, appWidgetManager, it) }
            // アダプタに再読み込みを促す。これが無いと保存済みの古い一覧が出たままになる
            appWidgetManager.notifyAppWidgetViewDataChanged(ids, R.id.widget_presets_list)
        }

        private fun updateWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_presets)

            views.setRemoteAdapter(R.id.widget_presets_list, adapterIntent(context, appWidgetId))
            // プリセットが0件のときだけ案内文へ差し替える
            views.setEmptyView(R.id.widget_presets_list, R.id.widget_presets_empty)
            views.setPendingIntentTemplate(
                R.id.widget_presets_list,
                presetIntentTemplate(context)
            )
            // 案内文はコレクション側のタップが効かないため、単体でアプリ起動を割り当てる
            createLaunchIntent(context)?.let {
                views.setOnClickPendingIntent(R.id.widget_presets_empty, it)
            }

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun adapterIntent(context: Context, appWidgetId: Int): Intent =
            Intent(context, PresetsWidgetService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                // ウィジェットIDごとに別のアダプタとして扱わせるためURIを一意にする。
                // extraだけではIntentが同一とみなされ、複数設置時に片方の一覧が使い回される
                data = Uri.parse(toUri(Intent.URI_INTENT_SCHEME))
            }

        /**
         * 行タップ時に使うテンプレート。
         * 実際のURIは各行がsetOnClickFillInIntentで差し込むため、ここではdataを持たせない。
         * fillInでdataを受け取る必要があるのでPendingIntentはミュータブルにする。
         */
        private fun presetIntentTemplate(context: Context): PendingIntent {
            val intent = Intent(context, MainActivity::class.java).apply {
                // ReactInstanceManager.onNewIntentはACTION_VIEWのときだけurlイベントを流すため必須
                action = Intent.ACTION_VIEW
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            return PendingIntent.getActivity(context, 0, intent, flags)
        }

        private fun createLaunchIntent(context: Context): PendingIntent? {
            val intent = context.packageManager
                .getLaunchIntentForPackage(context.packageName) ?: return null
            return PendingIntent.getActivity(
                context,
                1,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
    }
}
