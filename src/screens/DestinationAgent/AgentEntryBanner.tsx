import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import {
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { CardChevron } from '~/components/CardChevron';
import Typography from '~/components/Typography';
import { useAIAgentFeatureEnabled } from '~/hooks/useAIAgentFeatureEnabled';
import { useAppColors } from '~/providers/AppColorsProvider';
import { stationAtom } from '~/store/atoms/station';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';

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
  // Button/CommonCard の無効表現と同じ不透明度
  disabled: {
    opacity: 0.5,
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

// RouteSearchScreen の検索バー直下に置く AI 相談へのエントリポイント。
// フィーチャーフラグ off 時はバナー自体を描画しない(ui.md のエントリポイント方針)。
export const AgentEntryBanner = ({ style }: Props) => {
  const navigation = useNavigation();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const enabled = useAIAgentFeatureEnabled();
  const station = useAtomValue(stationAtom);

  // 現在駅が未確定のままチャットを始めると currentStationGroupId を送れず、
  // 最寄り駅から直通で行けない駅が提案されてしまう。同じ画面の駅名検索が
  // station.groupId 無しでは検索しない(RouteSearchScreen の handleSearch)のと
  // 同じ理由で、現在駅が確定するまでは押せない見た目にして無反応にする。
  const disabled = !station?.groupId;

  const handlePress = useCallback(() => {
    navigation.navigate('DestinationAgent' as never);
  }, [navigation]);

  if (!enabled) {
    return null;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${translate('destinationAgentEntryTitle')} ${translate('destinationAgentEntrySubtitle')}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={disabled ? undefined : handlePress}
      style={[
        styles.root,
        isLEDTheme
          ? styles.ledBg
          : [styles.bg, { backgroundColor: colors.card }],
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name="sparkles" size={24} color={colors.accent} />
      <View style={styles.texts}>
        <Typography style={styles.title}>
          {translate('destinationAgentEntryTitle')}
        </Typography>
        <Typography style={[styles.subtitle, { color: colors.accent }]}>
          {translate('destinationAgentEntrySubtitle')}
        </Typography>
      </View>
      {/* 既定の stroke(#fff) は白背景で不可視になるため、AppSettings と同じくテーマに応じて指定する */}
      <CardChevron stroke={isLEDTheme || colors.isDark ? '#fff' : '#000'} />
    </TouchableOpacity>
  );
};
