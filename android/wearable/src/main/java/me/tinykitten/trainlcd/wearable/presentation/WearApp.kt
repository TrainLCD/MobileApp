package me.tinykitten.trainlcd.wearable.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Devices
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text
import me.tinykitten.trainlcd.wearable.presentation.theme.TrainLCDTheme

fun localizeCurrentState(stateKey: String): String {
  return when (stateKey) {
    "CURRENT" -> "ただいま"
    "NEXT" -> "次は"
    "ARRIVING" -> "まもなく"
    else -> ""
  }
}

@Composable
fun WearApp(
  readyToShow: Boolean,
  stateKey: String,
  stationName: String
) {
  if (readyToShow) {
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
          text = localizeCurrentState(stateKey),
          fontSize = 16.sp
        )
        Text(
          modifier = Modifier.fillMaxWidth(),
          textAlign = TextAlign.Center,
          color = MaterialTheme.colors.primary,
          text = stationName,
          fontSize = 24.sp
        )
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
          text = "接続を待機しています..."
        )
      }
    }
  }
}

@Preview(device = Devices.WEAR_OS_SMALL_ROUND, showSystemUi = true)
@Composable
fun DefaultPreview() {

  WearApp(
    readyToShow = true,
    stateKey = "CURRENT",
    stationName = "瑞江"
  )
}
