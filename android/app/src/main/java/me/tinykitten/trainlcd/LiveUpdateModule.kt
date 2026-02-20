package me.tinykitten.trainlcd

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.graphics.Color
import android.graphics.drawable.Icon
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class LiveUpdateModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val CHANNEL_ID = "live_update"
        private const val NOTIFICATION_ID = 49152
        private const val MAX_PROGRESS = 1000
    }

    override fun getName() = "LiveUpdateModule"

    private fun getNotificationManager(): NotificationManager =
        reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    private fun ensureChannel() {
        val nm = getNotificationManager()
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            "運行情報",
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = "現在の運行状況をリアルタイムで表示します"
            setShowBadge(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        nm.createNotificationChannel(channel)
    }

    private fun createContentIntent(): PendingIntent? {
        val intent = reactApplicationContext.packageManager
            .getLaunchIntentForPackage(reactApplicationContext.packageName) ?: return null
        return PendingIntent.getActivity(
            reactApplicationContext,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    @ReactMethod
    fun startLiveUpdate(state: ReadableMap?) {
        if (Build.VERSION.SDK_INT < 36 || state == null) return
        postProgressNotification(state)
    }

    @ReactMethod
    fun updateLiveUpdate(state: ReadableMap?) {
        if (Build.VERSION.SDK_INT < 36 || state == null) return
        postProgressNotification(state)
    }

    @ReactMethod
    fun stopLiveUpdate() {
        getNotificationManager().cancel(NOTIFICATION_ID)
    }

    @Suppress("NewApi")
    private fun postProgressNotification(state: ReadableMap) {
        ensureChannel()

        val stationName = state.getString("stationName") ?: ""
        val nextStationName = state.getString("nextStationName") ?: ""
        val approaching = state.getBoolean("approaching")
        val stopped = state.getBoolean("stopped")
        val lineName = state.getString("lineName") ?: ""
        val lineColor = state.getString("lineColor") ?: "#000000"
        val progress = state.getDouble("progress")
        val trainTypeName = state.getString("trainTypeName") ?: ""
        val boundStationName = state.getString("boundStationName") ?: ""
        val passingStationName = state.getString("passingStationName") ?: ""

        val parsedColor = try {
            Color.parseColor(lineColor)
        } catch (_: Exception) {
            Color.BLACK
        }

        val progressInt = (progress * MAX_PROGRESS).toInt().coerceIn(0, MAX_PROGRESS)

        val contentTitle = when {
            passingStationName.isNotEmpty() -> "$passingStationName 通過中"
            stopped -> stationName
            approaching -> "まもなく $nextStationName"
            else -> "$stationName → $nextStationName"
        }

        val contentText = boundStationName

        val subText = buildString {
            if (trainTypeName.isNotEmpty()) {
                append(trainTypeName)
                append(" ")
            }
            append(lineName)
        }

        val trackerIcon = Icon.createWithResource(
            reactApplicationContext,
            R.drawable.ic_notification_live_update
        )

        val progressStyle = Notification.ProgressStyle()
            .setStyledByProgress(true)
            .setProgress(progressInt)
            .setProgressTrackerIcon(trackerIcon)
            .setProgressSegments(
                listOf(
                    Notification.ProgressStyle.Segment(MAX_PROGRESS).setColor(parsedColor)
                )
            )
            .setProgressPoints(
                listOf(
                    Notification.ProgressStyle.Point(0).setColor(parsedColor),
                    Notification.ProgressStyle.Point(MAX_PROGRESS).setColor(parsedColor)
                )
            )

        val builder = Notification.Builder(reactApplicationContext, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification_live_update)
            .setContentTitle(contentTitle)
            .setContentText(contentText)
            .setSubText(subText)
            .setStyle(progressStyle)
            .setOngoing(true)
            .setOnlyAlertOnce(true)

        createContentIntent()?.let { builder.setContentIntent(it) }

        val notification = builder.build()

        getNotificationManager().notify(NOTIFICATION_ID, notification)
    }
}
