import { useAtomValue, useSetAtom } from 'jotai';
import React, { useEffect, useRef } from 'react';
import { Appearance } from 'react-native';
import {
  COLOR_SCHEME,
  COLOR_SCHEME_PREFERENCE,
  type ColorSchemePreference,
} from '~/models/ColorScheme';
import {
  colorSchemePreferenceAtom,
  normalizeSystemScheme,
  systemColorSchemeAtom,
} from '~/store/atoms/colorScheme';

/**
 * アプリ内の設定値を react-native の `Appearance` が受け取る値へ変換する。
 *
 * `COLOR_SCHEME` は `'LIGHT'` / `'DARK'` の大文字なので、そのまま渡すと native 側の
 * 変換に失敗して上書きが効かない。`'unspecified'` は上書きの解除で、null ではなく
 * この値を渡すこと(react-native は `'unspecified'` のときだけ native から現在値を
 * 読み直してキャッシュを更新する)。
 */
const toNativeColorScheme = (
  preference: ColorSchemePreference
): 'light' | 'dark' | 'unspecified' => {
  switch (preference) {
    case COLOR_SCHEME.LIGHT:
      return 'light';
    case COLOR_SCHEME.DARK:
      return 'dark';
    default:
      return 'unspecified';
  }
};

/**
 * 端末のダークモード設定を atom へ反映し、アプリ側の設定を native の外観へ適用する
 * レンダーレスの副作用ホスト。
 *
 * iOS は Info.plist の `UIUserInterfaceStyle` を `Automatic` にしてあり、端末設定を
 * そのまま受け取る。「ライト」「ダーク」を明示している間は `Appearance.setColorScheme()`
 * で window の外観を上書きし、`Alert` やキーボードなど native が描く UI もアプリの
 * 設定へ揃える。上書きしないと、端末がダークでアプリがライトのときにそれらだけ黒くなる。
 */
const FxSystemColorScheme: React.FC = () => {
  const setSystemColorScheme = useSetAtom(systemColorSchemeAtom);
  const preference = useAtomValue(colorSchemePreferenceAtom);
  const preferenceRef = useRef(preference);

  useEffect(() => {
    // 先に購読を開始してから現在値を読む。逆順だと、現在値の取得から購読開始までの
    // 間に端末側が変わった場合にその変更イベントを受け取れず、次に変わるまで
    // 「自動」が端末設定とずれたままになる
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // 上書き中は window の外観＝アプリの設定値なので、端末の値としては記録できない。
      // 「自動」へ戻すと上書きが外れて端末の値でイベントが飛ぶため、そこで復帰する
      if (preferenceRef.current !== COLOR_SCHEME_PREFERENCE.AUTO) {
        return;
      }
      setSystemColorScheme(normalizeSystemScheme(colorScheme));
    });

    setSystemColorScheme(normalizeSystemScheme(Appearance.getColorScheme()));

    return () => subscription.remove();
  }, [setSystemColorScheme]);

  useEffect(() => {
    // 上書きの適用より先に ref を更新する。適用時に飛ぶ変更イベントを
    // 端末の値として記録してしまわないようにするため
    preferenceRef.current = preference;

    Appearance.setColorScheme(toNativeColorScheme(preference));
  }, [preference]);

  return null;
};

export default React.memo(FxSystemColorScheme);
