/* While this template provides a good starting point for using Wear Compose, you can always
 * take a look at https://github.com/android/wear-os-samples/tree/main/ComposeStarter and
 * https://github.com/android/wear-os-samples/tree/main/ComposeAdvanced to find the most up to date
 * changes to the libraries and their usages.
 */

package me.tinykitten.trainlcd.wearable

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.lifecycleScope
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
import me.tinykitten.trainlcd.wearable.Constants.CAPABILITY_PHONE_APP
import me.tinykitten.trainlcd.wearable.Constants.PLAY_STORE_URI

class MainActivity :
  ComponentActivity(),
  DataClient.OnDataChangedListener,
  CapabilityClient.OnCapabilityChangedListener {
  private lateinit var capabilityClient: CapabilityClient
  private lateinit var remoteActivityHelper: RemoteActivityHelper

  private var payload by mutableStateOf<WearablePayload?>(null)

  private var foundNode: Node? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    capabilityClient = Wearable.getCapabilityClient(applicationContext)
    remoteActivityHelper = RemoteActivityHelper(applicationContext)
  }

  override fun onResume() {
    super.onResume()

    Wearable.getCapabilityClient(applicationContext).addListener(this, CAPABILITY_PHONE_APP)
    Wearable.getDataClient(applicationContext).addListener(this)
    lifecycleScope.launch {
      checkIfPhoneHasApp()
    }
  }

  override fun onPause() {
    super.onPause()

    Wearable.getCapabilityClient(applicationContext).removeListener(this, CAPABILITY_PHONE_APP)
    Wearable.getDataClient(applicationContext).removeListener(this)
  }

  private suspend fun checkIfPhoneHasApp() {
    try {
      val capabilityInfo = capabilityClient
        .getCapability(CAPABILITY_PHONE_APP, CapabilityClient.FILTER_ALL)
        .await()

      withContext(Dispatchers.Main) {
        foundNode = capabilityInfo.nodes.firstOrNull()
        checkCapability()
      }
    } catch (cancellationException: CancellationException) {
      throw cancellationException
    } catch (throwable: Throwable) {
      // どうにかしろ
    }
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
    foundNode = capabilityInfo.nodes.firstOrNull()
    checkCapability()
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

  private fun checkCapability() {
    if (foundNode != null) {
      setContent {
        WearApp(
          payload = payload
        )
      }
    } else {
      setContent {
        CompanionNotInstalled(onDownloadAppPress = { handleDownloadAppPress() })
      }
    }
  }

  companion object {
    private const val STATION_PATH = "/station"
    private const val CURRENT_STATE_KEY = "currentStateKey"
    private const val STATION_NAME_KEY = "stationName"
    private const val STATION_NAME_ROMAN_KEY = "stationNameRoman"
    private const val STATION_NUMBER_KEY = "stationNumber"
    private const val BAD_ACCURACY_KEY = "badAccuracy"
    private const val IS_NEXT_LAST_STOP_KEY = "isNextLastStop"
  }
}
