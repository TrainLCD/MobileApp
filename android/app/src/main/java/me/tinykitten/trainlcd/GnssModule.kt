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
import java.lang.reflect.Method

// GnssStatus の新旧API差分を吸収して、高速に呼べるユーティリティ
object GnssStatusCompat {
  // --- Methodキャッシュ（初回アクセス時に一度だけ解決） ---
  private val mCn0: Method? by lazy { resolve("cn0DbHz", "getCn0DbHz") }
  private val mConstellation: Method? by lazy {
    resolve(
      "constellationType",
      "getConstellationType"
    )
  }

  /** 起動時に温めたい場合に呼ぶ */
  fun warmup() {
    mCn0; mConstellation;
  }

  // 反射で新名→旧名の順に解決
  private fun resolve(nameNew: String, nameOld: String): Method? {
    val c = GnssStatus::class.java
    return try {
      c.getMethod(nameNew, Int::class.javaPrimitiveType)
    } catch (_: NoSuchMethodException) {
      try {
        c.getMethod(nameOld, Int::class.javaPrimitiveType)
      } catch (_: NoSuchMethodException) {
        null
      }
    }
  }

  // --- 取得関数（null=取得不可） ---
  fun cn0DbHz(status: GnssStatus, i: Int): Float? =
    (mCn0?.invoke(status, i) as? Float)
      ?: run { // ごく一部機種で double を返すケースの保険
        (mCn0?.invoke(status, i) as? Number)?.toFloat()
      }

  fun constellationType(status: GnssStatus, i: Int): Int? =
    (mConstellation?.invoke(status, i) as? Int)
}

class GnssModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  private var statusCallback: GnssStatus.Callback? = null

  override fun getName() = "GnssModule"

  @ReactMethod
  fun startGnssUpdates() {
    val lm = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    if (ActivityCompat.checkSelfPermission(reactApplicationContext, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
      val params = Arguments.createMap().apply {
        putString("error", "ACCESS_FINE_LOCATION permission not granted")
      }
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("GnssError", params)
      return
    }

    // 既存のコールバックがあれば解除
    statusCallback?.let { lm.unregisterGnssStatusCallback(it) }

    statusCallback = object : GnssStatus.Callback() {
      override fun onSatelliteStatusChanged(status: GnssStatus) {
        val total = status.satelliteCount
        var used = 0
        var sumCn0 = 0.0
        var validCn0Count = 0
        
        var maxCn0 = 0.0
        val constellations = mutableSetOf<String>()

        for (i in 0 until total) {
          if (status.usedInFix(i)) used++
          val cn0 = GnssStatusCompat.cn0DbHz(status, i)    
          if (cn0 != null && !cn0.isNaN()) {
            sumCn0 += cn0
            validCn0Count += 1
            if (cn0 > maxCn0) maxCn0 = cn0.toDouble()
          }
          val constel = GnssStatusCompat.constellationType(status, i)
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

        val meanCn0 = if (validCn0Count > 0) sumCn0 / validCn0Count else 0.0

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
    statusCallback = null
  }

  // RNのwarning対策
  @ReactMethod
  fun addListener(eventName: String) {
  }

  // RNのwarning対策
  @ReactMethod
  fun removeListeners(count: Int) {
  }
}
