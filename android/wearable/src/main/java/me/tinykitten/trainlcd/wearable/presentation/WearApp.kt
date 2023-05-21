package me.tinykitten.trainlcd.wearable.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Devices
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import me.tinykitten.trainlcd.R
import me.tinykitten.trainlcd.wearable.presentation.theme.TrainLCDTheme
import java.util.Locale


@Composable
fun localizeCurrentState(stateKey: String): String {
  return when (stateKey) {
    "CURRENT" -> stringResource(R.string.current_station_state)
    "NEXT" -> stringResource(R.string.next_station_state)
    "ARRIVING" -> stringResource(R.string.arriving_station_state)
    else -> ""
  }
}

@Composable
fun WearApp(
  payload: WearablePayload?
) {
  val locale = Locale.getDefault().language
  val localizedStationName = if (locale == "ja")
    payload?.stationName.orEmpty()
  else payload?.stationNameRoman.orEmpty()

  if (payload != null) {
    TrainLCDTheme {
      Column(
        modifier = Modifier
          .fillMaxSize()
          .background(MaterialTheme.colors.background),
        verticalArrangement = Arrangement.Center
      ) {
        Text(
          modifier = Modifier.fillMaxWidth(),
          textAlign = TextAlign.Center,
          color = MaterialTheme.colors.primary,
          text = localizeCurrentState(payload.stateKey),
          fontSize = 16.sp
        )
        Text(
          modifier = Modifier.fillMaxWidth(),
          textAlign = TextAlign.Center,
          color = MaterialTheme.colors.primary,
          text = localizedStationName,
          fontSize = 24.sp
        )
        if (payload.stationNumber.isNotEmpty()) {
          Text(
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center,
            color = MaterialTheme.colors.primary,
            text = "(${payload.stationNumber})",
            fontSize = 16.sp
          )
        }
      }
    }
  } else {
    TrainLCDTheme {
      Column(
        modifier = Modifier
          .fillMaxSize()
          .background(MaterialTheme.colors.background),
        verticalArrangement = Arrangement.Center
      ) {
        Text(
          modifier = Modifier.fillMaxWidth(),
          textAlign = TextAlign.Center,
          color = MaterialTheme.colors.primary,
          text = stringResource(R.string.not_connected)
        )
      }
    }
  }
}

@Preview(device = Devices.WEAR_OS_SMALL_ROUND, showSystemUi = true)
@Composable
fun DefaultPreview() {

  WearApp(
    payload = WearablePayload(
      stateKey = "CURRENT",
      stationName = "瑞江",
      stationNumber = "S-19",
      stationNameRoman = "Mizue"
    )
  )
}
