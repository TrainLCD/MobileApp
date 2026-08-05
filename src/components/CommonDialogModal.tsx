import { useAtomValue } from 'jotai';
import type React from 'react';
import { StyleSheet, Text } from 'react-native';
import { isLEDThemeAtom } from '~/store/atoms/theme';
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
});

export type CommonDialogModalProps = Omit<
  DialogModalLayoutProps,
  'isLEDTheme' | 'leading' | 'leadingStyle'
> & {
  emoji: string;
};

// 汎用ダイアログ用の公開コンポーネント。
// 共通レイアウトの左上要素だけを絵文字にし、現在のテーマを自動的に反映する。
export const CommonDialogModal: React.FC<CommonDialogModalProps> = ({
  emoji,
  ...props
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  // アプリ用フォントではなくOSの絵文字フォントを使い、字形の欠けを防ぐ。
  return (
    <DialogModalLayout
      {...props}
      isLEDTheme={isLEDTheme}
      leading={<Text style={styles.emoji}>{emoji}</Text>}
    />
  );
};

export default CommonDialogModal;
