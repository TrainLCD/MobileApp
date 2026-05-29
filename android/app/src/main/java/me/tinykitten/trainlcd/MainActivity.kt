package me.tinykitten.trainlcd
import expo.modules.splashscreen.SplashScreenManager

import android.app.PictureInPictureParams
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Rational

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  private val pictureInPictureHandler = Handler(Looper.getMainLooper())

  /**
   * Initializes the activity, registers the Expo splash screen on Android 12+, and continues standard ReactActivity setup.
   *
   * On Android 12 (SDK S) and newer, registers this activity with SplashScreenManager to integrate the platform SplashScreen API.
   *
   * @param savedInstanceState The saved activity state supplied by the system, or `null` if none.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    // Android 12+ only: SplashScreen API causes crash on Android 11
    // https://github.com/expo/expo/issues/37924
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      SplashScreenManager.registerOnActivity(this)
    }
    // @generated end expo-splashscreen
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Create the activity's ReactActivityDelegate configured for the app's architecture flags.
   *
   * The returned delegate is configured to respect the build-time new-architecture flag and the
   * activity's `fabricEnabled` setting.
   *
   * @return The configured ReactActivityDelegate instance for this activity.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
   * Attempts to enter picture-in-picture (PiP) mode when the user leaves the activity, subject to device and app conditions.
   *
   * If the device is running Android O or newer, the activity is not already in PiP, and PictureInPictureModule allows it,
   * this schedules a PiP entry after a 120ms delay. The PiP parameters use a 16:9 aspect ratio and enable seamless resize
   * on Android S and above. After attempting to enter PiP, the current PiP state is emitted via PictureInPictureModule.
   *
   * Does nothing if the OS is older than Android O, if the activity is already in PiP, or if PictureInPictureModule
   * advises against entering PiP. Any IllegalStateException raised while entering PiP is caught and results in emitting
   * a `false` PiP state.
   */
  override fun onUserLeaveHint() {
    super.onUserLeaveHint()

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || isInPictureInPictureMode) {
      return
    }
    if (!PictureInPictureModule.shouldEnterPictureInPicture()) {
      return
    }

    val params = PictureInPictureParams.Builder()
      .setAspectRatio(Rational(16, 9))
      .apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          setSeamlessResizeEnabled(true)
        }
      }
      .build()

    pictureInPictureHandler.postDelayed({
      try {
        val result = enterPictureInPictureMode(params)
        if (result) {
          PictureInPictureModule.emitPictureInPictureModeChanged(true)
        } else {
          PictureInPictureModule.emitPictureInPictureModeChanged(false)
        }
      } catch (_: IllegalStateException) {
        PictureInPictureModule.emitPictureInPictureModeChanged(false)
        // PiP can be rejected by device policy or transient lifecycle state.
      }
    }, 120)
  }

  /**
   * Forwards Picture-in-Picture mode changes to the PictureInPictureModule.
   *
   * Called when the activity enters or leaves Picture-in-Picture mode and emits the updated mode state to the JavaScript module.
   *
   * @param isInPictureInPictureMode `true` if the activity is now in Picture-in-Picture mode, `false` otherwise.
   * @param newConfig The device `Configuration` after the mode change.
   */
  override fun onPictureInPictureModeChanged(
    isInPictureInPictureMode: Boolean,
    newConfig: Configuration
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    PictureInPictureModule.emitPictureInPictureModeChanged(isInPictureInPictureMode)
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
