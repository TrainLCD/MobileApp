/* While this template provides a good starting point for using Wear Compose, you can always
 * take a look at https://github.com/android/wear-os-samples/tree/main/ComposeStarter and
 * https://github.com/android/wear-os-samples/tree/main/ComposeAdvanced to find the most up to date
 * changes to the libraries and their usages.
 */

package me.tinykitten.trainlcd.wearable

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.lifecycleScope
import androidx.wear.phone.interactions.PhoneTypeHelper
import androidx.wear.remote.interactions.RemoteActivityHelper
import androidx.wear.widget.ConfirmationOverlay
import com.google.android.gms.wearable.CapabilityClient
import com.google.android.gms.wearable.CapabilityInfo
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Node
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext

class MainActivity :
  ComponentActivity(),
  DataClient.OnDataChangedListener,
  CapabilityClient.OnCapabilityChangedListener {
  private lateinit var capabilityClient: CapabilityClient
  private lateinit var remoteActivityHelper: RemoteActivityHelper

  private var payload by mutableStateOf<WearablePayload?>(null)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    capabilityClient = Wearable.getCapabilityClient(this)
    remoteActivityHelper = RemoteActivityHelper(this)

    checkForPhoneApp()
  }

  override fun onStart() {
    super.onStart()
    capabilityClient.addListener(this, CAPABILITY_PHONE_APP)
  }

  override fun onStop() {
    super.onStop()
    capabilityClient.removeListener(this, CAPABILITY_PHONE_APP)
  }

  override fun onDataChanged(dataEvents: DataEventBuffer) {
    dataEvents.forEach { event ->
      when (event.type) {
        DataEvent.TYPE_CHANGED -> {
          event.dataItem.also { item ->
            when (item.uri.path) {
              STATION_PATH -> {
                DataMapItem.fromDataItem(item).dataMap.apply {
                  val stateKey = getString(CURRENT_STATE_KEY).orEmpty()
                  val stationName = getString(STATION_NAME_KEY).orEmpty()
                  val stationNameRoman = getString(STATION_NAME_ROMAN_KEY).orEmpty()
                  val stationNumber = getString(STATION_NUMBER_KEY).orEmpty()
                  val badAccuracy = getBoolean(BAD_ACCURACY_KEY).or(false)
                  val isNextLastStop = getBoolean(IS_NEXT_LAST_STOP_KEY).or(false)
                  val newPayload = WearablePayload(
                    stateKey,
                    stationName,
                    stationNameRoman,
                    stationNumber,
                    badAccuracy,
                    isNextLastStop
                  )
                  payload = newPayload
                }
              }
            }
          }
        }
      }
    }
  }

  override fun onCapabilityChanged(capabilityInfo: CapabilityInfo) {
    val nodes = capabilityInfo.nodes
    if (nodes.isNotEmpty()) {
      Log.d(TAG, "スマホアプリが接続されました: ${nodes.first().displayName}")
      setContent {
        WearApp(
          payload = payload
        )
      }
    } else {
      Log.d(TAG, "スマホアプリが見つかりません")
      val isAndroid = PhoneTypeHelper.getPhoneDeviceType(applicationContext) ==
        PhoneTypeHelper.DEVICE_TYPE_ANDROID
      setContent {
        CompanionNotInstalled(
          onDownloadAppPress = { handleDownloadAppPress() },
          isAndroid = isAndroid
        )
      }
    }
  }

  private fun handleDownloadAppPress() {
    val intent = Intent(Intent.ACTION_VIEW)
      .addCategory(Intent.CATEGORY_BROWSABLE)
      .setData(Uri.parse(PLAY_STORE_URI))

    lifecycleScope.launch {
      try {
        remoteActivityHelper.startRemoteActivity(intent).await()

        ConfirmationOverlay().showOn(this@MainActivity)
      } catch (cancellationException: CancellationException) {
        throw cancellationException
      } catch (throwable: Throwable) {
        ConfirmationOverlay()
          .setType(ConfirmationOverlay.FAILURE_ANIMATION)
          .showOn(this@MainActivity)
      }
    }
  }

  private fun checkForPhoneApp() {
    capabilityClient.getCapability("capability_phone_app", CapabilityClient.FILTER_REACHABLE)
      .addOnSuccessListener { capabilityInfo ->
        val nodes = capabilityInfo.nodes
        if (nodes.isNotEmpty()) {
          Log.d(TAG, "スマホアプリが見つかりました: ${nodes.first().displayName}")
          setContent {
            WearApp(
              payload = payload
            )
          }
        } else {
          Log.d(TAG, "スマホアプリが見つかりません")
          val isAndroid = PhoneTypeHelper.getPhoneDeviceType(applicationContext) ==
            PhoneTypeHelper.DEVICE_TYPE_ANDROID
          setContent {
            CompanionNotInstalled(
              onDownloadAppPress = { handleDownloadAppPress() },
              isAndroid = isAndroid
            )
          }
        }
      }
      .addOnFailureListener { e ->
        Log.e(TAG, "Capability の取得に失敗", e)
      }
  }

  companion object {
    private const val TAG = "Wearable"
    private const val PLAY_STORE_URI = "market://details?id=me.tinykitten.trainlcd"
    private const val CAPABILITY_PHONE_APP = "capability_phone_app"
    private const val STATION_PATH = "/station"
    private const val CURRENT_STATE_KEY = "currentStateKey"
    private const val STATION_NAME_KEY = "stationName"
    private const val STATION_NAME_ROMAN_KEY = "stationNameRoman"
    private const val STATION_NUMBER_KEY = "stationNumber"
    private const val BAD_ACCURACY_KEY = "badAccuracy"
    private const val IS_NEXT_LAST_STOP_KEY = "isNextLastStop"
  }
}
