import { useEffect, useState } from 'react';
import { Keyboard, type KeyboardEvent, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Android の keyboardDidShow / keyboardDidHide は IME のアニメーション完了後に
// duration: 0 で届くため、追従アニメーションの時間はこちらで補う
// (Android 既定の IME アニメーションに近い値)。
const ANDROID_KEYBOARD_ANIMATION_DURATION = 250;

// iOS はアニメーション開始前に will 系が届くので duration をそのまま使えるが、
// 稀に 0 で届くことがあるため下限を設ける。
const IOS_FALLBACK_ANIMATION_DURATION = 250;

type KeyboardBottomInset = {
  /** 画面下端に固定した要素をキーボードで隠さないために確保すべき余白(dp) */
  value: number;
  /** value の変化へ追従させるアニメーション時間(ms) */
  duration: number;
  /** キーボードが表示されているか */
  visible: boolean;
};

/**
 * 画面下端固定の入力欄をキーボードの上へ逃がすための下余白を返す。
 *
 * `KeyboardAvoidingView` はエッジトゥエッジ(`edgeToEdgeEnabled=true`)の Android では
 * 機能しない。`adjustResize` を指定してもウィンドウが縮まなくなり、RN が送る
 * `endCoordinates.screenY` が画面下端のままになるため、`behavior` を与えても
 * 押し上げ量が常に 0 と算出されるためである。キーボードの高さ自体は
 * `endCoordinates.height` として正しく届くので、そこから余白を組み立てる。
 */
export const useKeyboardBottomInset = (): KeyboardBottomInset => {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const isIOS = Platform.OS === 'ios';
    const resolveDuration = (event: KeyboardEvent) =>
      isIOS
        ? event.duration || IOS_FALLBACK_ANIMATION_DURATION
        : ANDROID_KEYBOARD_ANIMATION_DURATION;

    const handleShow = (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
      setDuration(resolveDuration(event));
    };
    const handleHide = (event: KeyboardEvent) => {
      setKeyboardHeight(0);
      setDuration(resolveDuration(event));
    };

    // iOS はアニメーション開始前に発火する will 系で先回りできる。
    // Android は will 系が発火しないため did 系を購読する。
    const subscriptions = [
      Keyboard.addListener(
        isIOS ? 'keyboardWillShow' : 'keyboardDidShow',
        handleShow
      ),
      Keyboard.addListener(
        isIOS ? 'keyboardWillHide' : 'keyboardDidHide',
        handleHide
      ),
    ];

    return () => {
      for (const subscription of subscriptions) {
        subscription.remove();
      }
    };
  }, []);

  // Android の endCoordinates.height はナビゲーションバー分を除いた IME の高さ
  // (ReactRootView が imeInsets.bottom - barInsets.bottom を送る)。エッジトゥエッジでは
  // コンテンツがバーの裏まで伸びているため、ウィンドウ下端からの重なり量へ戻す。
  // iOS の height はホームインジケータ領域を含んだ値なので加算しない。
  const overlap =
    keyboardHeight > 0 && Platform.OS !== 'ios'
      ? keyboardHeight + insets.bottom
      : keyboardHeight;

  return {
    value: Math.max(overlap, insets.bottom),
    duration,
    visible: keyboardHeight > 0,
  };
};
