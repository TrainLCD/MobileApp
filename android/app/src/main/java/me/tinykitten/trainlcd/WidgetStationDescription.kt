package me.tinykitten.trainlcd

/** 駅名とその番号を同じ読み上げ単位にし、駅名・番号の欠損時は説明を補いません。 */
internal fun widgetStationDescription(name: String, number: String): String {
    if (name.isEmpty()) return ""
    val trimmedNumber = number.trim()
    return if (trimmedNumber.isEmpty()) name else "$name ($trimmedNumber)"
}
