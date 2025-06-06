import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class IgnoreBatteryOptimizationsModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  private val context = reactApplicationContext.applicationContext
  override fun getName() = "IgnoreBatteryOptimizationsModule"

  @ReactMethod
  fun requestIgnoreBatteryOptimizations() {
    try {
      val packageName = reactApplicationContext.packageName
      val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        ?: return
      if (!pm.isIgnoringBatteryOptimizations(packageName)) {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
        intent.data = Uri.parse("package:$packageName")
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
      }
    } catch (e: Exception) {
      // ログを出力し、エラーを適切に処理する
      android.util.Log.e(
        "IgnoreBatteryOptimizations",
        "Error requesting battery optimization exemption",
        e
      )
    }
  }
}
