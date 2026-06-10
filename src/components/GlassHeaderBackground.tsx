import { BlurView } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { LIQUID_GLASS_AVAILABLE } from '~/utils/liquidGlass';

type Props = {
  isLEDTheme: boolean;
};

// ヘッダーカードの背面に敷くガラス面。iOS 26+ では Liquid Glass、旧 iOS では従来の BlurView を使う。
// LED テーマは独自の質感を保つため Liquid Glass 化せずダークブラーを維持する。
// Android は呼び出し側が背景色で表現するため何も描画しない
const GlassHeaderBackground: React.FC<Props> = ({ isLEDTheme }) => {
  if (Platform.OS !== 'ios') return null;

  if (LIQUID_GLASS_AVAILABLE && !isLEDTheme) {
    return (
      <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
    );
  }

  return (
    <BlurView
      intensity={40}
      tint={isLEDTheme ? 'dark' : 'light'}
      style={StyleSheet.absoluteFill}
    />
  );
};

export default React.memo(GlassHeaderBackground);
