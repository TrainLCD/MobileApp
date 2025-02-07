/* While this template provides a good starting point for using Wear Compose, you can always
 * take a look at https://github.com/android/wear-os-samples/tree/main/ComposeStarter and
 * https://github.com/android/wear-os-samples/tree/main/ComposeAdvanced to find the most up to date
 * changes to the libraries and their usages.

 */
package me.tinykitten.trainlcd

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
import androidx.concurrent.futures.await
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
import com.google.android.gms.wearable.MessageClient
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

class MainActivity :
    ComponentActivity(),
    DataClient.OnDataChangedListener,
    MessageClient.OnMessageReceivedListener,
    CapabilityClient.OnCapabilityChangedListener {
    private var payload by mutableStateOf<WearablePayload?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        setContent {
            WearApp(payload)
        }
    }

    override fun onResume() {
        super.onResume()

        Wearable.getDataClient(this).addListener(this)
        Wearable.getMessageClient(this).addListener(this)
        Wearable.getCapabilityClient(this)
            .addListener(
                this,
                Uri.parse("wear://"),
                CapabilityClient.FILTER_REACHABLE
            )
    }


    override fun onPause() {
        super.onPause()

        Wearable.getDataClient(this).removeListener(this)
        Wearable.getCapabilityClient(this).removeListener(this)
    }

    override fun onDataChanged(dataEvents: DataEventBuffer) {
        Log.d(TAG, "onDataChanged invoked!!")
        dataEvents.forEach { event ->
            when (event.type) {
                DataEvent.TYPE_CHANGED -> {
                    event.dataItem.also { item ->
                        when (item.uri.path) {
                            STATION_PATH -> {
                                DataMapItem.fromDataItem(item).dataMap.apply {
                                    val stateKey = getString(CURRENT_STATE_KEY).orEmpty()
                                    val stationName = getString(STATION_NAME_KEY).orEmpty()
                                    val stationNameRoman =
                                        getString(STATION_NAME_ROMAN_KEY).orEmpty()
                                    val stationNumber = getString(STATION_NUMBER_KEY).orEmpty()
                                    val badAccuracy = getBoolean(BAD_ACCURACY_KEY).or(false)
                                    val isNextLastStop = getBoolean(IS_NEXT_LAST_STOP_KEY).or(false)
                                    payload = WearablePayload(
                                        stateKey,
                                        stationName,
                                        stationNameRoman,
                                        stationNumber,
                                        badAccuracy,
                                        isNextLastStop
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onCapabilityChanged(capabilityInfo: CapabilityInfo) {
        Log.d(TAG, "onCapabilityChanged invoked!!")

        if (capabilityInfo.nodes.firstOrNull() != null) {
            setContent {
                WearApp(payload)
            }
        } else {
            val isAndroid = PhoneTypeHelper.getPhoneDeviceType(this) ==
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
                RemoteActivityHelper(applicationContext).startRemoteActivity(intent).await()

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

    override fun onMessageReceived(messageEvent: MessageEvent) {
        Log.d(TAG, "messageEvent: $messageEvent")
    }

    companion object {
        private const val TAG = "MainActivity"
        private const val CAPABILITY_PHONE_APP = "verify_remote_trainlcd_phone_app"
        private const val PLAY_STORE_URI = "market://details?id=me.tinykitten.trainlcd.dev"
        private const val STATION_PATH = "/station"
        private const val CURRENT_STATE_KEY = "currentStateKey"
        private const val STATION_NAME_KEY = "stationName"
        private const val STATION_NAME_ROMAN_KEY = "stationNameRoman"
        private const val STATION_NUMBER_KEY = "stationNumber"
        private const val BAD_ACCURACY_KEY = "badAccuracy"
        private const val IS_NEXT_LAST_STOP_KEY = "isNextLastStop"
    }
}
