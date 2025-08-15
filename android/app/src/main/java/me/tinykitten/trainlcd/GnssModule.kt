package me.tinykitten.trainlcd

import android.content.Context
import android.content.pm.PackageManager
import android.location.LocationManager
import androidx.core.app.ActivityCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.Manifest;
import android.location.GnssStatus
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

class GnssModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  private var statusCallback: GnssStatus.Callback? = null

  override fun getName() = "GnssModule"


  private fun <T> callGnss(
    status: GnssStatus,
    nameNew: String,
    nameOld: String,
    index: Int,
    returnType: Class<T>
  ): T? {
    // 1) 新名 (API 26+ など) を試す
    try {
      val m = status.javaClass.getMethod(nameNew, Int::class.javaPrimitiveType)
      @Suppress("UNCHECKED_CAST")
      return m.invoke(status, index) as T
    } catch (_: NoSuchMethodException) {
      // 続行
    }

    // 2) 旧名 (API 24 など) を試す
    return try {
      val m = status.javaClass.getMethod(nameOld, Int::class.javaPrimitiveType)
      @Suppress("UNCHECKED_CAST")
      m.invoke(status, index) as T
    } catch (_: Throwable) {
      null
    }
  }

  /** C/N0 [dB-Hz] を取得（API差分を吸収） */
  fun gnssCn0DbHz(status: GnssStatus, i: Int): Float? =
    callGnss(status, "cn0DbHz", "getCn0DbHz", i, Float::class.java)

  /** コンステレーション種別（GnssStatus.CONSTELLATION_* の Int）を取得（API差分を吸収） */
  fun gnssConstellationType(status: GnssStatus, i: Int): Int? =
    callGnss(status, "constellationType", "getConstellationType", i, Int::class.java)

  /** SVID も同様に（ついでに用意） */
  fun gnssSvid(status: GnssStatus, i: Int): Int? =
    callGnss(status, "svid", "getSvid", i, Int::class.java)
  
  @ReactMethod
  fun startGnssUpdates() {
    val lm = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    if (ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) return

    statusCallback = object : GnssStatus.Callback() {
      override fun onSatelliteStatusChanged(status: GnssStatus) {
        val total = status.satelliteCount
        var used = 0
        var sumCn0 = 0.0
        var maxCn0 = 0.0
        val constellations = mutableSetOf<String>()

        for (i in 0 until total) {
          if (status.usedInFix(i)) used++
          val cn0 = gnssCn0DbHz(status, i)    
          if (cn0 != null && !cn0.isNaN()) {
            sumCn0 += cn0
            if (cn0 > maxCn0) maxCn0 = cn0.toDouble()
          }
          val constel = gnssConstellationType(status, i)
          when (constel) {
            GnssStatus.CONSTELLATION_GPS -> constellations.add("GPS")
            GnssStatus.CONSTELLATION_GLONASS -> constellations.add("GLONASS")
            GnssStatus.CONSTELLATION_GALILEO -> constellations.add("GALILEO")
            GnssStatus.CONSTELLATION_BEIDOU -> constellations.add("BEIDOU")
            GnssStatus.CONSTELLATION_QZSS -> constellations.add("QZSS")
            GnssStatus.CONSTELLATION_IRNSS -> constellations.add("IRNSS")
            GnssStatus.CONSTELLATION_SBAS -> constellations.add("SBAS")
          }
        }

        val meanCn0 = if (total > 0) sumCn0 / total else 0.0

        val params = Arguments.createMap().apply {
          putInt("total", total)
          putInt("usedInFix", used)
          putDouble("meanCn0DbHz", meanCn0)
          putDouble("maxCn0DbHz", maxCn0)
          putArray("constellations", Arguments.fromList(constellations.toList()))
        }
        reactApplicationContext
          .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
          .emit("GnssStatus", params)
      }
    }
    lm.registerGnssStatusCallback(statusCallback!!, Handler(Looper.getMainLooper()))
  }

  @ReactMethod
  fun stopGnssUpdates() {
    val lm = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    statusCallback?.let { lm.unregisterGnssStatusCallback(it) }
  }
}
