import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { CardChevron } from '~/components/CardChevron';
import Typography from '~/components/Typography';
import { useAppColors } from '~/providers/AppColorsProvider';
import {
  portraitModeEnabledAtom,
  portraitPromoFinishedAtom,
} from '~/store/atoms/display';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import {
  canShowPortraitBanner,
  recordPortraitBannerShown,
} from '~/utils/portraitPromo';

const styles = StyleSheet.create({
  root: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  bg: {
    borderRadius: 8,
    // CommonCard と同じ影値
    boxShadow: '0px 0px 8px rgba(51, 51, 51, 0.25)',
  },
  ledBg: {
    backgroundColor: '#212121',
    borderColor: '#fff',
    borderWidth: 1,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

type Props = {
  style?: StyleProp<ViewStyle>;
};

/**
 * ホームでポートレートモードの追加を知らせるバナー(案B)。
 *
 * 起動した人全員に届く代わりに、走行前なので実感は伴わない。認知を配る役に徹して、
 * タップしたら外観設定へ送る(案Cのスポットライトがトグルを指す)。
 * 3回表示するか、ポートレートモードをオンにしたら二度と出さない。
 */
export const PortraitModePromoBanner: React.FC<Props> = ({ style }: Props) => {
  const navigation = useNavigation();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const portraitModeEnabled = useAtomValue(portraitModeEnabledAtom);
  // オンにしたあと同じセッション中にオフへ戻されてもバナーを復活させないため、
  // 打ち切り状態はマウント時の値ではなく atom で購読する
  const promoFinished = useAtomValue(portraitPromoFinishedAtom);

  // 表示回数の上限判定は MMKV の同期 API で初回レンダー時に確定させる
  const [countAllows] = useState(() => canShowPortraitBanner());
  const visible = countAllows && !promoFinished && !portraitModeEnabled;

  // StrictMode は初回マウントで effect を二度走らせる。素直に数えると
  // 1回の表示で2回分減り、3回出すつもりが2回で打ち止めになる。
  // ref はマウントを跨いで保たれるので、1マウント1回に抑えられる
  const recordedRef = useRef(false);

  useEffect(() => {
    if (!visible || recordedRef.current) {
      return;
    }
    recordedRef.current = true;
    recordPortraitBannerShown();
  }, [visible]);

  const handlePress = useCallback(() => {
    navigation.navigate('ColorSchemeSettings' as never);
  }, [navigation]);

  if (!visible) {
    return null;
  }

  return (
    <TouchableOpacity
      testID="portrait-mode-promo-banner"
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${translate('portraitPromoBannerTitle')} ${translate('portraitPromoBannerSubtitle')}`}
      onPress={handlePress}
      style={[
        styles.root,
        isLEDTheme
          ? styles.ledBg
          : [styles.bg, { backgroundColor: colors.card }],
        style,
      ]}
    >
      <Ionicons name="phone-portrait" size={24} color={colors.accent} />
      <View style={styles.texts}>
        <Typography style={styles.title}>
          {translate('portraitPromoBannerTitle')}
        </Typography>
        <Typography style={[styles.subtitle, { color: colors.accent }]}>
          {translate('portraitPromoBannerSubtitle')}
        </Typography>
      </View>
      {/* 既定の stroke(#fff) は白背景で不可視になるため、テーマに応じて指定する */}
      <CardChevron stroke={isLEDTheme || colors.isDark ? '#fff' : '#000'} />
    </TouchableOpacity>
  );
};
