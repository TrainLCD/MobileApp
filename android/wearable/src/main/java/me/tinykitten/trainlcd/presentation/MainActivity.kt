/* While this template provides a good starting point for using Wear Compose, you can always
 * take a look at https://github.com/android/wear-os-samples/tree/main/ComposeStarter and
 * https://github.com/android/wear-os-samples/tree/main/ComposeAdvanced to find the most up to date
 * changes to the libraries and their usages.
 */

package me.tinykitten.trainlcd.presentation

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.google.android.gms.wearable.DataClient
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.Wearable

class MainActivity : ComponentActivity(), DataClient.OnDataChangedListener {
  private val dataClient by lazy { Wearable.getDataClient(applicationContext) }

  private var payload by mutableStateOf<WearablePayload?>(null)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      WearApp(
        payload = payload
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  override fun onResume() {
    super.onResume()
    dataClient.addListener(this)
  }

  override fun onPause() {
    super.onPause()
    dataClient.removeListener(this)
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
                  val newPayload = WearablePayload(
                    stateKey,
                    stationName,
                    stationNameRoman,
                    stationNumber,
                    badAccuracy
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

  companion object {
    private const val STATION_PATH = "/station"
    private const val CURRENT_STATE_KEY = "currentStateKey"
    private const val STATION_NAME_KEY = "stationName"
    private const val STATION_NAME_ROMAN_KEY = "stationNameRoman"
    private const val STATION_NUMBER_KEY = "stationNumber"
    private const val BAD_ACCURACY_KEY = "badAccuracy"
  }
}
