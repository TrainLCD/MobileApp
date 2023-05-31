package me.tinykitten.trainlcd.wearable

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Devices
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Button
import androidx.wear.compose.material.Text
import me.tinykitten.trainlcd.wearable.theme.TrainLCDTheme
import me.tinykitten.trainlcd.R

@Composable
fun CompanionNotInstalled(onDownloadAppPress: () -> Unit) {
  TrainLCDTheme {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(vertical = 15.dp, horizontal = 25.dp),
      verticalArrangement = Arrangement.Center,
      horizontalAlignment = Alignment.CenterHorizontally,
    ) {
      Text(
        modifier = Modifier.fillMaxWidth(),
        color = Color.White,
        text = stringResource(R.string.app_not_installed),
        fontSize = 12.sp
      )
      Button(
        modifier = Modifier
          .fillMaxWidth()
          .padding(top = 10.dp),
        onClick = onDownloadAppPress
      ) {
        Text(
          text = stringResource(R.string.download_from_play_store),
          textAlign = TextAlign.Center,
          fontSize = 12.sp
        )
      }
    }
  }
}

@Preview(device = Devices.WEAR_OS_SMALL_ROUND, showSystemUi = true)
@Composable
fun CompanionNotInstalledPreview() {
  CompanionNotInstalled(
    onDownloadAppPress = {}
  )
}
