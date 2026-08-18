import * as Speech from 'expo-speech';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { selectBestVoiceIdentifier } from '../../utils/nativeTtsVoice';
import {
  toSpeakableText,
  truncateToSpeechLimit,
} from '../../utils/speakableText';
import type {
  SpeechEngine,
  SpeechEngineCallbacks,
  SpeechEngineRequest,
} from './speechEngine';

const JA_SPEECH_LANGUAGE = 'ja-JP';
const EN_SPEECH_LANGUAGE = 'en-US';

// expo-speech は volume 未指定時の既定値が機種・OSバージョンにより最大音量
// より低くなることがあるため、常に最大値を明示指定して音量が下がる余地を無くす。
const MAX_SPEECH_VOLUME = 1.0;

// 発話開始前に音声選択（getAvailableVoicesAsync）の完了を待つ上限（ミリ秒）。
// Android の TTS エンジン初期化がハングした場合でも、この時間を超えたら
// 音声未指定のまま発話へ進み、アナウンス全体が止まらないようにする。
const VOICES_READY_TIMEOUT_MS = 5_000;

/**
 * 端末内蔵の TTS (expo-speech) で読み上げるエンジン。
 * Android の常用経路であり、iOS ではリモート TTS が使えないときの
 * フォールバックとして使う。
 */
export const useNativeSpeechEngine = (): SpeechEngine => {
  // 発話ごとに採番する世代 ID。停止や新規発話で無効化された古い発話の
  // コールバックが、後続の発話の再生状態を壊すのを防ぐ。
  const runIdRef = useRef(0);

  // 言語ごとに端末の最高品質音声（premium / enhanced）を明示指定するための識別子。
  // 見つからない場合は undefined のままシステム既定音声に任せる。
  const jaVoiceIdRef = useRef<string | undefined>(undefined);
  const enVoiceIdRef = useRef<string | undefined>(undefined);
  // Android で音声一覧の取得に成功した（=言語ごとの音声有無を判定できる）か。
  // expo-speech の Android 実装は対象言語の音声データが端末に無いと setLanguage
  // が LANG_MISSING_DATA となり端末既定言語にフォールバックするため、音声が
  // 見つからなかった言語の発話はスキップする判断に使う。
  const androidVoicesLoadedRef = useRef(false);

  // 初回発話が音声選択の完了前に走ると voice 未指定で合成されてしまうため、
  // 発話側が選択完了を待てるよう Promise を保持する（常に resolve する）。
  const voicesReadyRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let cancelled = false;
    voicesReadyRef.current = (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        if (cancelled) {
          return;
        }
        // Android は voice 未指定だと言語フォールバック不備の影響を受けるため、
        // 高品質音声が無くても既定品質のローカル音声を明示指定する
        const options = { allowDefaultQuality: Platform.OS === 'android' };
        jaVoiceIdRef.current = selectBestVoiceIdentifier(
          voices,
          JA_SPEECH_LANGUAGE,
          options
        );
        enVoiceIdRef.current = selectBestVoiceIdentifier(
          voices,
          EN_SPEECH_LANGUAGE,
          options
        );
        if (Platform.OS === 'android' && voices.length > 0) {
          androidVoicesLoadedRef.current = true;
          if (!jaVoiceIdRef.current) {
            console.warn(
              '[useNativeSpeechEngine] No Japanese voice found on this device; Japanese announcements will be skipped'
            );
          }
          if (!enVoiceIdRef.current) {
            console.warn(
              '[useNativeSpeechEngine] No English voice found on this device; English announcements will be skipped'
            );
          }
        }
      } catch (e) {
        console.warn(
          '[useNativeSpeechEngine] getAvailableVoicesAsync failed:',
          e
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 音声選択の完了を待つ。取得がハングしても発話全体が止まらないよう上限付き
  const waitForVoicesReady = useCallback(async () => {
    const ready = voicesReadyRef.current;
    if (!ready) {
      return;
    }
    await Promise.race([
      ready,
      new Promise<void>((resolve) => {
        setTimeout(resolve, VOICES_READY_TIMEOUT_MS);
      }),
    ]);
  }, []);

  const stop = useCallback(() => {
    // 世代を進めて残存コールバックを無効化してから読み上げを停止する
    runIdRef.current += 1;
    try {
      Speech.stop();
    } catch {}
  }, []);

  const speak = useCallback(
    (request: SpeechEngineRequest, callbacks: SpeechEngineCallbacks) => {
      const runId = runIdRef.current + 1;
      runIdRef.current = runId;
      const isStaleRun = () => runIdRef.current !== runId;

      void (async () => {
        // 初回アナウンスが音声選択の完了前に走ると voice 未指定で合成され、
        // Android では言語フォールバック不備により端末既定言語（日本語）で
        // 英語文が読まれうる。選択完了を待ってから発話する
        await waitForVoicesReady();
        if (isStaleRun()) {
          return;
        }

        // Android で端末に対象言語の音声が1つも無い場合、expo-speech の
        // setLanguage が LANG_MISSING_DATA で端末既定言語にフォールバックし、
        // 英語文が日本語音声で合成されてしまう。誤った言語の音声で読み上げる
        // より、その言語の発話をスキップする方がマシなため発話対象から外す。
        const voicesKnown = androidVoicesLoadedRef.current;
        const canSpeakJa = !voicesKnown || Boolean(jaVoiceIdRef.current);
        const canSpeakEn = !voicesKnown || Boolean(enVoiceIdRef.current);

        const limit = Speech.maxSpeechInputLength;
        const plainJa =
          request.speakJa && canSpeakJa
            ? truncateToSpeechLimit(
                toSpeakableText(request.ssmlJa, 'JA'),
                limit
              )
            : '';
        const plainEn =
          request.speakEn && canSpeakEn
            ? truncateToSpeechLimit(
                toSpeakableText(request.ssmlEn, 'EN'),
                limit
              )
            : '';

        const utterances = [
          plainJa
            ? {
                text: plainJa,
                language: JA_SPEECH_LANGUAGE,
                voice: jaVoiceIdRef.current,
              }
            : null,
          plainEn
            ? {
                text: plainEn,
                language: EN_SPEECH_LANGUAGE,
                voice: enVoiceIdRef.current,
              }
            : null,
        ].filter(
          (
            u
          ): u is {
            text: string;
            language: string;
            voice: string | undefined;
          } => u !== null
        );

        if (!utterances.length) {
          callbacks.onSettled();
          return;
        }

        callbacks.onSpeechStarted?.();

        // JA→EN を一括で OS の読み上げキューへ積む。Android の TextToSpeech は
        // speak() 呼び出し時点の言語・音声設定を発話リクエストごとにスナップ
        // ショットする（setVoice / setLanguage は mParams に保存され speak() が
        // 要求ごとに複製する）ため、発話ごとに異なる音声を安全に指定できる。
        // iOS の AVSpeechUtterance も発話単位で音声を保持する。一括で積むことで
        // エンジンが前の発話の再生中に次の合成を先行でき、発話間の無音
        // （合成待ちのラグ）を最小化する。完了・エラー・停止のいずれかが全発話
        // 分そろった時点でパイプラインを解放する。停止や新規発話で世代が
        // 進んでいたら、古いコールバックは無視する
        let remaining = utterances.length;
        const settle = () => {
          if (isStaleRun()) {
            return;
          }
          remaining -= 1;
          if (remaining <= 0) {
            callbacks.onSettled();
          }
        };
        for (const utterance of utterances) {
          Speech.speak(utterance.text, {
            language: utterance.language,
            volume: MAX_SPEECH_VOLUME,
            ...(utterance.voice ? { voice: utterance.voice } : {}),
            onDone: settle,
            onStopped: settle,
            onError: (error) => {
              console.warn('[useNativeSpeechEngine] speech error:', error);
              settle();
            },
          });
        }
      })();
    },
    [waitForVoicesReady]
  );

  useEffect(() => stop, [stop]);

  return useMemo(() => ({ speak, stop }), [speak, stop]);
};
