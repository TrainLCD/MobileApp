package expo.modules.audiofocus

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * 端末内蔵 TTS の発話中だけオーディオフォーカスを保持するための Android 専用モジュール。
 *
 * expo-speech の Android 実装は android.speech.tts.TextToSpeech をそのまま呼ぶだけで
 * AudioManager に一切触れない。Android で他アプリ（音楽など）の音量が下がるのは
 * 「アプリが AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK でフォーカスを要求したとき」だけなので、
 * expo-audio の setAudioModeAsync に duckOthers を指定してもダッキングは起こらない
 * (expo-audio の Android 実装はフォーカス要求をプレイヤーの再生開始時にしか行わない)。
 * そのため、端末内蔵 TTS 経路ではこのモジュールが発話の直前・直後にフォーカスを
 * 取得・返却する。iOS は AVAudioSession のカテゴリオプションで完結するため不要。
 */
class AudioFocusModule : Module() {
  // AudioManager は「要求時と同じリスナーインスタンス」でフォーカスを対応付けるため、
  // モジュールの生存期間で 1 つだけ保持する。
  private val focusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
    // 恒久的な喪失を通知された時点でフォーカスは既に剥がされている。読み上げ自体は
    // TextToSpeech 側に任せて継続させ、ここでは保持状態だけ実態に合わせる。
    if (focusChange == AudioManager.AUDIOFOCUS_LOSS) {
      synchronized(this) {
        hasFocus = false
        focusRequest = null
      }
    }
  }

  private var focusRequest: AudioFocusRequest? = null
  private var hasFocus = false

  private val audioManager: AudioManager?
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("AudioFocus")

    // 発話は待たせられないため同期関数にする。AudioManager への要求は
    // audio service への短い IPC だけで、再生パイプラインを持たない。
    Function("requestTransientMayDuck") {
      requestTransientMayDuck()
    }

    Function("abandon") {
      abandon()
    }

    // 画面破棄・リロードでフォーカスを握ったままにすると、他アプリの音量が
    // 下がりっぱなしになるため確実に返す。
    OnActivityDestroys {
      abandon()
    }

    OnDestroy {
      abandon()
    }
  }

  @Synchronized
  private fun requestTransientMayDuck(): Boolean {
    if (hasFocus) {
      return true
    }
    val manager = audioManager ?: return false

    val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(
          AudioAttributes.Builder()
            // 車内放送は経路案内そのものなので、音楽アプリ側に「一時的な案内」として
            // 扱わせる。API 26 以降はこの組み合わせでシステムが自動ダッキングを行う。
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        )
        // アナウンスは後から流しても意味がないため、遅延付与は受け付けない
        .setAcceptsDelayedFocusGain(false)
        // 音量を下げるのは相手側。こちらの読み上げは止めない
        .setWillPauseWhenDucked(false)
        .setOnAudioFocusChangeListener(focusChangeListener)
        .build()
      focusRequest = request
      manager.requestAudioFocus(request)
    } else {
      @Suppress("DEPRECATION")
      manager.requestAudioFocus(
        focusChangeListener,
        AudioManager.STREAM_MUSIC,
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
      )
    }

    hasFocus = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    if (!hasFocus) {
      focusRequest = null
    }
    return hasFocus
  }

  @Synchronized
  private fun abandon() {
    if (!hasFocus && focusRequest == null) {
      return
    }
    val manager = audioManager
    if (manager != null) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        focusRequest?.let { manager.abandonAudioFocusRequest(it) }
      } else {
        @Suppress("DEPRECATION")
        manager.abandonAudioFocus(focusChangeListener)
      }
    }
    focusRequest = null
    hasFocus = false
  }
}
