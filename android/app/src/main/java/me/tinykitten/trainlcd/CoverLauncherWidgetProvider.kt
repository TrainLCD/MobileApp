package me.tinykitten.trainlcd

import android.app.ActivityOptions
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/** Flex Window専用の起動入口。ホーム画面のウィジェットとは分離する。 */
class CoverLauncherWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { id ->
            val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
                ?: return@forEach
            // ホーム画面用PendingIntentと区別し、メイン画面へ戻されないようにする。
            intent.action = "${context.packageName}.OPEN_COVER"
            val pendingIntent = PendingIntent.getActivity(
                context,
                id,
                intent,
                PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                ActivityOptions.makeBasic().apply {
                    // Samsung Flex Window公式仕様のカバー画面ID。
                    // https://developer.samsung.com/galaxy-z/flex_window.html
                    launchDisplayId = 1
                }.toBundle()
            )
            val views = RemoteViews(context.packageName, R.layout.widget_cover_launcher)
            views.setOnClickPendingIntent(R.id.cover_launcher_root, pendingIntent)
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}
