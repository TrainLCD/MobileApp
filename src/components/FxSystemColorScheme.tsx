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
    // 先に購読を開始してから現在値を読む。逆順だと、現在値の取得から購読開始までの
    // 間に端末側が変わった場合にその変更イベントを受け取れず、次に変わるまで
    // 「自動」が端末設定とずれたままになる
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(normalizeSystemScheme(colorScheme));
    });

    setSystemColorScheme(normalizeSystemScheme(Appearance.getColorScheme()));

    return () => subscription.remove();
  }, [setSystemColorScheme]);

  return null;
};

export default React.memo(FxSystemColorScheme);
