/* While this template provides a good starting point for using Wear Compose, you can always
 * take a look at https://github.com/android/wear-os-samples/tree/main/ComposeStarter and
 * https://github.com/android/wear-os-samples/tree/main/ComposeAdvanced to find the most up to date
 * changes to the libraries and their usages.
 */

package me.tinykitten.trainlcd.wearable.presentation

import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable

class MainActivity : ComponentActivity(), MessageClient.OnMessageReceivedListener {
  private val messageClient by lazy { Wearable.getMessageClient(applicationContext)  }

  private var readyToShow by mutableStateOf(false)
  private var stateKey by mutableStateOf("")
  private var stationName by mutableStateOf("")
  
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      WearApp(
        readyToShow = readyToShow,
        stateKey = stateKey,
        stationName = stationName
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }

  override fun onResume() {
    super.onResume()
    messageClient.addListener(this)
  }

  override fun onPause() {
    super.onPause()
    messageClient.removeListener(this)
  }
  
  override fun onMessageReceived(messageEvent: MessageEvent) {
    val dataString = messageEvent.data.toString(charset("UTF-8"));
    Log.d(TAG, "messageEvent.data: $dataString")
    when (messageEvent.path) {
      CURRENT_STATE_PATH -> {
        stateKey = dataString
      }
      STATION_NAME_PATH -> {
        stationName = dataString
      }
    }

    if (!readyToShow) {
      readyToShow = true
    }
  }

  companion object {
    private const val TAG = "WearableMainActivity"
    
    private const val CURRENT_STATE_PATH = "/current_state"
    private const val STATION_NAME_PATH = "/station_name"
  }
}
