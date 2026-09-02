import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { memo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePortraitModePromo } from '~/hooks/usePortraitModePromo';
import { appColorsAtom } from '~/store/atoms/colorScheme';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import Typography from './Typography';

// ウォークスルーと同じ「教える」ときの色
const TEACHING_COLOR = '#03a9f4';

// カードを浮かせるための下方向のスクリム。走行画面全体は暗くしない
const SCRIM_HEIGHT = 400;

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 9998,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCRIM_HEIGHT,
  },
  card: {
    position: 'absolute',
    left: 24,
    right: 24,
    maxWidth: 640,
    alignSelf: 'center',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.3)',
  },
  title: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: TEACHING_COLOR,
    marginBottom: 8,
    lineHeight: Platform.select({
      ios: RFValue(24),
    }),
  },
  description: {
    fontSize: RFValue(14),
    lineHeight: Platform.select({
      ios: RFValue(20),
      android: RFValue(22),
    }),
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dismissText: {
    fontSize: RFValue(14),
  },
  primaryButton: {
    backgroundColor: TEACHING_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  primaryButtonText: {
    fontSize: RFValue(14),
    color: '#fff',
    fontWeight: 'bold',
  },
  // LEDテーマは角丸を使わないため、角丸を持つ要素すべてに重ねて直角化する
  squareCorners: {
    borderRadius: 0,
  },
});

/**
 * 端末を縦に持ったまま走行画面を見ている人に、ポートレートモードを提案するカード(案A)。
 *
 * 走行画面は端末が縦のとき中身を90度回転して描画されるので、このカードは
 * 回転しているビューの外側に置いて正立させること。配色は走行画面の外にある
 * 操作系画面と同じライト/ダークに追従させるため、Provider ではなく atom を直接読む。
 */
const PortraitModePrompt: React.FC = () => {
  const { visible, enable, dismiss } = usePortraitModePromo();
  const colors = useAtomValue(appColorsAtom);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.root} pointerEvents="box-none">
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
        style={styles.scrim}
      />
      <View
        testID="portrait-mode-prompt"
        style={[
          styles.card,
          { backgroundColor: colors.card, bottom: insets.bottom + 24 },
          isLEDTheme && styles.squareCorners,
        ]}
      >
        <Typography style={styles.title}>
          {translate('portraitPromoPromptTitle')}
        </Typography>
        <Typography style={[styles.description, { color: colors.text }]}>
          {translate('portraitPromoPromptDescription')}
        </Typography>

        <View style={styles.footer}>
          <Pressable
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel={translate('portraitPromoPromptDismiss')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Typography
              style={[styles.dismissText, { color: colors.mutedText }]}
            >
              {translate('portraitPromoPromptDismiss')}
            </Typography>
          </Pressable>

          <Pressable
            onPress={enable}
            accessibilityRole="button"
            accessibilityLabel={translate('portraitPromoPromptEnable')}
            style={[styles.primaryButton, isLEDTheme && styles.squareCorners]}
          >
            <Typography style={styles.primaryButtonText}>
              {translate('portraitPromoPromptEnable')}
            </Typography>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default memo(PortraitModePrompt);
