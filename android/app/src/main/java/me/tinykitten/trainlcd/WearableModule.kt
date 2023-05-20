package me.tinykitten.trainlcd

import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.android.gms.tasks.Tasks
import com.google.android.gms.wearable.Wearable
import java.util.concurrent.ExecutionException

class WearableModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private val context = reactApplicationContext.applicationContext
  private val nodeClient = Wearable.getNodeClient(context)
  private val messageClient = Wearable.getMessageClient(context)

  override fun getName() = "WearableModule"

  @ReactMethod
  fun sendStationInfoToWatch(
    state: String,
    stationName: String,
    promise: Promise
  ) {
    val nodes = Tasks.await(nodeClient.connectedNodes).map { it.id }
    try {
      nodes.forEach { nodeId ->
        Tasks.await(messageClient
          .sendMessage(
            nodeId,
            CURRENT_STATE_PATH,
            state.toByteArray(charset("UTF-8"))
          ))
        Tasks.await(messageClient
          .sendMessage(
            nodeId,
            STATION_NAME_PATH,
            stationName.toByteArray(charset("UTF-8"))
          ))
      }
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
    
    private const val CURRENT_STATE_PATH = "/current_state"
    private const val STATION_NAME_PATH = "/station_name"
  }
}

