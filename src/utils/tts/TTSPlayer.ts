import { fetch } from 'expo/fetch';
import type { AudioPlayer } from 'expo-audio';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { DEV_TTS_API_URL, PRODUCTION_TTS_API_URL } from 'react-native-dotenv';
import { isDevApp } from '../isDevApp';

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const base64ToUint8Array = (input: string): Uint8Array => {
  const sanitized = input.replace(/[^A-Za-z0-9+/=]/g, '');
  const length =
    (sanitized.length * 3) / 4 -
    (sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0);
  const bytes = new Uint8Array(length);

  let byteIndex = 0;
  const decodeChar = (char: string): number => {
    if (char === '=') {
      return 0;
    }
    const index = BASE64_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base64 character.');
    }
    return index;
  };

  for (let i = 0; i < sanitized.length; i += 4) {
    const chunk =
      (decodeChar(sanitized[i]) << 18) |
      (decodeChar(sanitized[i + 1]) << 12) |
      (decodeChar(sanitized[i + 2]) << 6) |
      decodeChar(sanitized[i + 3]);

    bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (sanitized[i + 2] !== '=') {
      bytes[byteIndex++] = (chunk >> 8) & 0xff;
    }
    if (sanitized[i + 3] !== '=') {
      bytes[byteIndex++] = chunk & 0xff;
    }
  }

  return bytes;
};

type TTSCache = {
  ja: { text: string; path: string };
  en: { text: string; path: string };
};

type GetIdTokenFunc = () => Promise<string | undefined>;

// トークンキャッシュ（有効期限55分 - Firebaseトークンは1時間有効なので余裕を持たせる）
const TOKEN_CACHE_DURATION_MS = 55 * 60 * 1000;

class TTSPlayer {
  private static instance: TTSPlayer | null = null;
  private soundJa: AudioPlayer | null = null;
  private soundEn: AudioPlayer | null = null;
  private isPlaying = false;
  private cache: Map<string, TTSCache> = new Map();
  private ttsApiUrl: string;
  private getIdToken: GetIdTokenFunc | null = null;
  private lastPlayedTextJa: string | null = null;
  private cachedToken: string | null = null;
  private cachedTokenExpiry = 0;
  private firstSpeech = true;

  private constructor() {
    this.ttsApiUrl = isDevApp ? DEV_TTS_API_URL : PRODUCTION_TTS_API_URL;
  }

  static getInstance(): TTSPlayer {
    if (!TTSPlayer.instance) {
      TTSPlayer.instance = new TTSPlayer();
    }
    return TTSPlayer.instance;
  }

  setGetIdToken(fn: GetIdTokenFunc): void {
    this.getIdToken = fn;
  }

  // キャッシュ付きトークン取得（バックグラウンドでのネットワーク遅延を回避）
  private async getCachedIdToken(): Promise<string | undefined> {
    const now = Date.now();

    // キャッシュが有効ならそれを返す
    if (this.cachedToken && now < this.cachedTokenExpiry) {
      return this.cachedToken;
    }

    if (!this.getIdToken) {
      console.warn('[TTSPlayer] getIdToken not set');
      return undefined;
    }

    try {
      // タイムアウト付きでトークン取得（5秒）
      const tokenPromise = this.getIdToken();
      const timeoutPromise = new Promise<undefined>((resolve) =>
        setTimeout(() => resolve(undefined), 5000)
      );

      const token = await Promise.race([tokenPromise, timeoutPromise]);

      if (token) {
        this.cachedToken = token;
        this.cachedTokenExpiry = now + TOKEN_CACHE_DURATION_MS;
        return token;
      }

      // 新しいトークン取得に失敗したが、古いキャッシュがあればそれを使う（期限切れでも）
      if (this.cachedToken) {
        console.warn(
          '[TTSPlayer] Failed to refresh token, using expired cache'
        );
        return this.cachedToken;
      }

      return undefined;
    } catch (error) {
      console.error('[TTSPlayer] getCachedIdToken error:', error);
      // エラー時も古いキャッシュがあれば使う
      if (this.cachedToken) {
        return this.cachedToken;
      }
      return undefined;
    }
  }

  clearTokenCache(): void {
    this.cachedToken = null;
    this.cachedTokenExpiry = 0;
  }

  async setAudioMode(backgroundEnabled: boolean): Promise<void> {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: backgroundEnabled,
        interruptionMode: 'duckOthers',
        playsInSilentMode: true,
        interruptionModeAndroid: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });
    } catch (e) {
      console.warn('[TTSPlayer] setAudioModeAsync failed:', e);
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  getLastPlayedTextJa(): string | null {
    return this.lastPlayedTextJa;
  }

  private getByText(textJa: string): TTSCache | undefined {
    for (const [, value] of this.cache) {
      if (value.ja.text === textJa) {
        return value;
      }
    }
    return undefined;
  }

  private storeCache(
    id: string,
    ja: { text: string; path: string },
    en: { text: string; path: string }
  ): void {
    this.cache.set(id, { ja, en });
    // 古いキャッシュを削除 (最大10件)
    if (this.cache.size > 10) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  private cleanup(): void {
    try {
      this.soundJa?.pause();
      this.soundJa?.remove();
    } catch {}
    try {
      this.soundEn?.pause();
      this.soundEn?.remove();
    } catch {}
    this.soundJa = null;
    this.soundEn = null;
  }

  private async speakFromPath(pathJa: string, pathEn: string): Promise<void> {
    this.cleanup();

    const soundJa = createAudioPlayer({ uri: pathJa });
    const soundEn = createAudioPlayer({ uri: pathEn });

    this.soundJa = soundJa;
    this.soundEn = soundEn;
    this.isPlaying = true;

    return new Promise((resolve) => {
      const enRemoveListener = soundEn.addListener(
        'playbackStatusUpdate',
        (enStatus) => {
          if (enStatus.didJustFinish) {
            enRemoveListener?.remove();
            try {
              soundEn.remove();
            } catch (e) {
              console.warn('[TTSPlayer] Failed to remove soundEn:', e);
            }
            this.soundEn = null;
            this.isPlaying = false;
            resolve();
          } else if ('error' in enStatus && enStatus.error) {
            console.warn('[TTSPlayer] soundEn error:', enStatus.error);
            enRemoveListener?.remove();
            try {
              soundEn.remove();
            } catch {}
            this.soundEn = null;
            this.isPlaying = false;
            resolve();
          }
        }
      );

      const jaRemoveListener = soundJa.addListener(
        'playbackStatusUpdate',
        (jaStatus) => {
          if (jaStatus.didJustFinish) {
            jaRemoveListener?.remove();
            try {
              soundJa.remove();
            } catch (e) {
              console.warn('[TTSPlayer] Failed to remove soundJa:', e);
            }
            this.soundJa = null;
            soundEn.play();
          } else if ('error' in jaStatus && jaStatus.error) {
            console.warn('[TTSPlayer] soundJa error:', jaStatus.error);
            jaRemoveListener?.remove();
            try {
              soundJa.remove();
            } catch {}
            this.soundJa = null;
            enRemoveListener?.remove();
            try {
              soundEn.remove();
            } catch {}
            this.soundEn = null;
            this.isPlaying = false;
            resolve();
          }
        }
      );

      try {
        soundJa.play();
      } catch (e) {
        console.error('[TTSPlayer] Failed to play soundJa:', e);
        jaRemoveListener?.remove();
        enRemoveListener?.remove();
        try {
          soundJa.remove();
        } catch {}
        try {
          soundEn.remove();
        } catch {}
        this.soundJa = null;
        this.soundEn = null;
        this.isPlaying = false;
        resolve();
      }
    });
  }

  private async fetchSpeech(
    textJa: string,
    textEn: string
  ): Promise<{ id: string; pathJa: string; pathEn: string } | undefined> {
    const reqBody = {
      data: {
        ssmlJa: `<speak>${textJa.trim()}</speak>`,
        ssmlEn: `<speak>${textEn.trim()}</speak>`,
      },
    };

    try {
      const idToken = await this.getCachedIdToken();
      if (!idToken) {
        console.warn('[TTSPlayer] Failed to get idToken');
        return undefined;
      }

      const response = await fetch(this.ttsApiUrl, {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(reqBody),
        method: 'POST',
      });

      if (!response.ok) {
        console.error(
          '[TTSPlayer] TTS API returned error status:',
          response.status
        );
        return undefined;
      }

      const ttsJson = await response.json();

      // APIレスポンスの検証
      if (!ttsJson || typeof ttsJson !== 'object') {
        console.error('[TTSPlayer] Invalid TTS API response:', ttsJson);
        return undefined;
      }

      if (ttsJson.error) {
        console.error('[TTSPlayer] TTS API error:', ttsJson.error);
        return undefined;
      }

      if (!ttsJson.result || typeof ttsJson.result !== 'object') {
        console.error('[TTSPlayer] TTS API response missing result:', ttsJson);
        return undefined;
      }

      if (!ttsJson.result.id) {
        console.error(
          '[TTSPlayer] TTS API response missing result.id:',
          ttsJson.result
        );
        return undefined;
      }

      const { id, jaAudioContent, enAudioContent } = ttsJson.result;

      // 音声コンテンツが両方ないなら失敗
      if (!jaAudioContent && !enAudioContent) {
        console.error(
          '[TTSPlayer] TTS API response missing audio content:',
          ttsJson.result
        );
        return undefined;
      }

      const fileJa = new File(Paths.cache, `${id}_ja.mp3`);
      const fileEn = new File(Paths.cache, `${id}_en.mp3`);

      if (jaAudioContent) {
        fileJa.write(base64ToUint8Array(jaAudioContent));
      }
      if (enAudioContent) {
        fileEn.write(base64ToUint8Array(enAudioContent));
      }

      return { id, pathJa: fileJa.uri, pathEn: fileEn.uri };
    } catch (error) {
      console.error('[TTSPlayer] fetchSpeech error:', error);
      return undefined;
    }
  }

  async speak(textJa: string, textEn: string): Promise<void> {
    if (!textJa?.length || !textEn?.length) {
      return;
    }

    // 同じテキストの再生を防ぐ
    if (this.lastPlayedTextJa === textJa) {
      return;
    }

    // 再生中なら待つ
    if (this.isPlaying) {
      return;
    }

    try {
      const cache = this.getByText(textJa);

      if (cache) {
        this.lastPlayedTextJa = textJa;
        await this.speakFromPath(cache.ja.path, cache.en.path);
        return;
      }

      const fetched = await this.fetchSpeech(textJa, textEn);
      if (!fetched) {
        console.warn('[TTSPlayer] Failed to fetch speech audio');
        return;
      }

      const { id, pathJa, pathEn } = fetched;

      this.storeCache(
        id,
        { text: textJa, path: pathJa },
        { text: textEn, path: pathEn }
      );
      this.lastPlayedTextJa = textJa;

      await this.speakFromPath(pathJa, pathEn);
    } catch (error) {
      console.error('[TTSPlayer] speak error:', error);
    }
  }

  stop(): void {
    this.cleanup();
    this.isPlaying = false;
  }

  resetLastPlayedText(): void {
    this.lastPlayedTextJa = null;
  }

  isFirstSpeech(): boolean {
    return this.firstSpeech;
  }

  setFirstSpeechDone(): void {
    this.firstSpeech = false;
  }

  resetFirstSpeech(): void {
    this.firstSpeech = true;
  }
}

export default TTSPlayer;
