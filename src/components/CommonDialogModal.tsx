import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import { lighten } from 'polished';
import type React from 'react';
import { StyleSheet, Text } from 'react-native';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import type { DialogOptions } from '~/utils/dialogPresentation';
import { RFValue } from '~/utils/rfValue';
import {
  DialogModalLayout,
  type DialogModalLayoutProps,
} from './DialogModalLayout';

const styles = StyleSheet.create({
  emoji: {
    // 枠は48px固定なので、端末サイズに応じた拡大値が枠を超えないよう上限を設ける。
    fontSize: Math.min(RFValue(32), 32),
    lineHeight: 42,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  lineSymbol: {
    width: '100%',
    height: '100%',
  },
  lineSymbolFallback: {
    flex: 1,
    width: '100%',
  },
});

export type CommonDialogModalProps = Omit<
  DialogModalLayoutProps,
  'isLEDTheme' | 'leading' | 'leadingStyle'
> & {
  emoji: string;
  lineSymbol?: DialogOptions['lineSymbol'];
};

// 汎用ダイアログ用の公開コンポーネント。
// 共通レイアウトの左上要素と現在のテーマだけを用途別に差し替える。
export const CommonDialogModal: React.FC<CommonDialogModalProps> = ({
  emoji,
  lineSymbol,
  ...props
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const lineSymbolBorderRadius = isLEDTheme ? 0 : 8;
  const hasLineSymbolLeading =
    lineSymbol?.image !== undefined || lineSymbol?.color !== undefined;

  const leading =
    lineSymbol?.image !== undefined ? (
      <Image
        source={lineSymbol.image}
        style={styles.lineSymbol}
        contentFit="contain"
        testID="common-dialog-line-symbol-image"
      />
    ) : lineSymbol?.color ? (
      <LinearGradient
        colors={[lineSymbol.color, lighten(0.1, lineSymbol.color)]}
        style={styles.lineSymbolFallback}
        testID="common-dialog-line-symbol-fallback"
      />
    ) : (
      <Text style={styles.emoji}>{emoji}</Text>
    );

  return (
    <DialogModalLayout
      {...props}
      isLEDTheme={isLEDTheme}
      leading={leading}
      leadingStyle={
        hasLineSymbolLeading ? { borderRadius: lineSymbolBorderRadius } : null
      }
    />
  );
};

export default CommonDialogModal;
