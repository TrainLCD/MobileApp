package me.tinykitten.trainlcd

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import java.util.concurrent.ExecutionException

class WearableModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  private val context = reactApplicationContext.applicationContext
  private var isWearableApiAvailable = true

  override fun getName() = "WearableModule"

  @ReactMethod
  fun sendStationInfoToWatch(
    readableMap: ReadableMap,
    promise: Promise
  ) {
    if (!isWearableApiAvailable) {
      return promise.resolve(null)
    }

    try {
      Tasks.await(GoogleApiAvailability.getInstance().checkApiAvailability(Wearable.getDataClient(context)))
    } catch (e: Exception) {
      isWearableApiAvailable = false
      Log.w(TAG, "Wearable API is not available on this device: $e")
      return promise.resolve(null)
    }

    try {
      val req = PutDataMapRequest.create(STATION_PATH).apply {
        dataMap.putString(STATION_NAME_KEY, readableMap.getString(STATION_NAME_KEY).orEmpty())
        dataMap.putString(
          STATION_NAME_ROMAN_KEY,
          readableMap.getString(STATION_NAME_ROMAN_KEY).orEmpty()
        )
        dataMap.putString(CURRENT_STATE_KEY, readableMap.getString(CURRENT_STATE_KEY).orEmpty())
        dataMap.putString(STATION_NUMBER_KEY, readableMap.getString(STATION_NUMBER_KEY).orEmpty())
        dataMap.putBoolean(BAD_ACCURACY_KEY, readableMap.getBoolean(BAD_ACCURACY_KEY).or(false))
        dataMap.putBoolean(
          IS_NEXT_LAST_STOP_KEY,
          readableMap.getBoolean(IS_NEXT_LAST_STOP_KEY).or(false)
        )
      }
        .asPutDataRequest()
        .setUrgent()
      Tasks.await(Wearable.getDataClient(context).putDataItem(req)
      )
      promise.resolve(null)
    } catch (e: ExecutionException) {
      Log.e(TAG, "ExecutionException: $e")
      promise.reject(E_TASK_FAILED, e)
    } catch (e: InterruptedException) {
      Log.e(TAG, "InterruptedException: $e")
      promise.reject(E_TASK_FAILED, e)
    }
  }

  companion object {
    private const val TAG = "WearableModule"

    private const val E_TASK_FAILED = "E_TASK_FAILED"

    private const val STATION_PATH = "/station"
    private const val CURRENT_STATE_KEY = "currentStateKey"
    private const val STATION_NAME_KEY = "stationName"
    private const val STATION_NAME_ROMAN_KEY = "stationNameRoman"
    private const val STATION_NUMBER_KEY = "stationNumber"
    private const val BAD_ACCURACY_KEY = "badAccuracy"
    private const val IS_NEXT_LAST_STOP_KEY = "isNextLastStop"
  }
}
