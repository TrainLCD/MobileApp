package me.tinykitten.trainlcd.wearable.presentation

data class WearablePayload(
  var stateKey: String,
  var stationName: String,
  var stationNameRoman: String,
  var stationNumber: String,
  var badLocationAccuracy: Boolean
)
