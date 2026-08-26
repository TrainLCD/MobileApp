import { useSetAtom } from 'jotai';
import React, { useEffect } from 'react';
import { Appearance } from 'react-native';
import {
  normalizeSystemScheme,
  systemColorSchemeAtom,
} from '~/store/atoms/colorScheme';

/**
 * 端末のダークモード設定を atom へ反映するレンダーレスの副作用ホスト。
 * 配色設定が「自動」のときの追従元になる。
 */
const FxSystemColorScheme: React.FC = () => {
  const setSystemColorScheme = useSetAtom(systemColorSchemeAtom);

  useEffect(() => {
    // リスナー登録前に端末側が変わっていた場合を取りこぼさないよう、
    // マウント時に現在値を読み直してから購読する
    setSystemColorScheme(normalizeSystemScheme(Appearance.getColorScheme()));

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(normalizeSystemScheme(colorScheme));
    });

    return () => subscription.remove();
  }, [setSystemColorScheme]);

  return null;
};

export default React.memo(FxSystemColorScheme);
