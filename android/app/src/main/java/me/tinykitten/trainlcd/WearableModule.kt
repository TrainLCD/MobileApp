package me.tinykitten.trainlcd

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import java.util.concurrent.ExecutionException

class WearableModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private val context = reactApplicationContext.applicationContext
  private val dataClient = Wearable.getDataClient(context)

  override fun getName() = "WearableModule"

  @ReactMethod
  fun sendStationInfoToWatch(
    readableMap: ReadableMap,
    promise: Promise
  ) {
    try {
      val req = PutDataMapRequest.create(STATION_PATH).run {
        dataMap.putString(STATION_NAME_KEY, readableMap.getString("stationName").orEmpty())
        dataMap.putString(CURRENT_STATE_KEY, readableMap.getString("stateKey").orEmpty())
        dataMap.putString(STATION_NUMBER_KEY, readableMap.getString("stationNumber").orEmpty())
        asPutDataRequest()
      }.setUrgent()
      Tasks.await(dataClient.putDataItem(req))
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
    private const val STATION_NUMBER_KEY = "stationNumber"
  }
}
