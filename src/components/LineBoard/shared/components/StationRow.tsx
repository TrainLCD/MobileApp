import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import isTablet from '~/utils/isTablet';

const styles = StyleSheet.create({
  androidTabletRow: {
    flexDirection: 'row',
    width: '100%',
    height: `${(4 / 7) * 100}%`,
  },
});

export const getBoardPaddingBottom = (windowHeight: number) =>
  isTablet && Platform.OS !== 'android' ? windowHeight / 3.5 : undefined;

export const StationRow = ({ children }: PropsWithChildren) => {
  // 初回のネイティブレイアウトからヘッダー下の3/7を乗換案内用に空ける。
  if (isTablet && Platform.OS === 'android') {
    return <View style={styles.androidTabletRow}>{children}</View>;
  }
  return <>{children}</>;
};
