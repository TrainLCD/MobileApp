package me.tinykitten.trainlcd

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.drawable.Icon
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

private fun ReadableMap.optString(key: String, default: String = ""): String =
    if (hasKey(key) && !isNull(key)) getString(key) ?: default else default

private fun ReadableMap.optBoolean(key: String, default: Boolean = false): Boolean =
    if (hasKey(key) && !isNull(key)) getBoolean(key) else default

private fun ReadableMap.optDouble(key: String, default: Double = 0.0): Double =
    if (hasKey(key) && !isNull(key)) getDouble(key) else default

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
            reactApplicationContext.getString(R.string.live_update_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = reactApplicationContext.getString(R.string.live_update_channel_description)
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

    private fun createTrackerIcon(color: Int): Icon {
        val density = reactApplicationContext.resources.displayMetrics.density
        val sizePx = (24 * density).toInt()
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val cx = sizePx / 2f
        val cy = sizePx / 2f
        val strokeWidth = 2f * density
        val radius = cx - strokeWidth / 2f

        paint.style = Paint.Style.FILL
        paint.color = color
        canvas.drawCircle(cx, cy, radius, paint)

        paint.style = Paint.Style.STROKE
        paint.color = Color.WHITE
        paint.strokeWidth = strokeWidth
        canvas.drawCircle(cx, cy, radius, paint)

        return Icon.createWithBitmap(bitmap)
    }

    @Suppress("NewApi")
    private fun postProgressNotification(state: ReadableMap) {
        ensureChannel()

        val stationName = state.optString("stationName")
        val nextStationName = state.optString("nextStationName")
        val stationNumber = state.optString("stationNumber")
        val nextStationNumber = state.optString("nextStationNumber")
        val approaching = state.optBoolean("approaching")
        val stopped = state.optBoolean("stopped")
        val lineName = state.optString("lineName")
        val lineColor = state.optString("lineColor", "#000000")
        val progress = state.optDouble("progress")
        val trainTypeName = state.optString("trainTypeName")
        val boundStationName = state.optString("boundStationName")
        val boundStationNumber = state.optString("boundStationNumber")
        val passingStationName = state.optString("passingStationName")
        val passingStationNumber = state.optString("passingStationNumber")

        val parsedColor = try {
            Color.parseColor(lineColor)
        } catch (_: Exception) {
            Color.BLACK
        }

        val progressInt = (progress * MAX_PROGRESS).toInt().coerceIn(0, MAX_PROGRESS)

        fun formatStationWithNumber(name: String, number: String): String =
            if (number.isNotEmpty()) "$name ($number)" else name

        val contentTitle = when {
            passingStationName.isNotEmpty() -> reactApplicationContext.getString(R.string.live_update_passing, formatStationWithNumber(passingStationName, passingStationNumber))
            stopped -> formatStationWithNumber(stationName, stationNumber)
            approaching -> reactApplicationContext.getString(R.string.live_update_approaching, formatStationWithNumber(nextStationName, nextStationNumber))
            else -> reactApplicationContext.getString(R.string.live_update_next, formatStationWithNumber(nextStationName, nextStationNumber))
        }

        val formattedBoundName = run {
            val hasSuffix = boundStationName.endsWith("方面")
            val baseName = if (hasSuffix) boundStationName.removeSuffix("方面") else boundStationName
            val delimiter = if (hasSuffix) "・" else "/"
            val names = baseName.split(delimiter)
            val numbers = boundStationNumber.split("/")
            val formatted = names.mapIndexed { index, name ->
                val number = numbers.getOrElse(index) { "" }
                formatStationWithNumber(name, number)
            }.joinToString(delimiter)
            if (hasSuffix) "${formatted} 方面" else formatted
        }

        val contentText = buildString {
            if (trainTypeName.isNotEmpty()) {
                append(trainTypeName)
                append(" ")
            }
            append(formattedBoundName)
        }

        val subText = lineName

        val trackerIcon = createTrackerIcon(parsedColor)

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
