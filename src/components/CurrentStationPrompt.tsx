import { Ionicons } from '@expo/vector-icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import {
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { useAIAgentFeatureEnabled } from '~/hooks/useAIAgentFeatureEnabled';
import { useAppColors } from '~/providers/AppColorsProvider';
import { stationAtom } from '~/store/atoms/station';
import { stationSearchModalVisibleAtom } from '~/store/atoms/stationSearchPrompt';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { CardChevron } from './CardChevron';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    borderRadius: 8,
    borderWidth: 1.5,
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
  },
});

type Props = {
  style?: StyleProp<ViewStyle>;
};

// 現在駅が確定していないときだけ、駅名検索(今いる駅の手動選択)へ誘導するカード。
// 現在駅が無いと経路検索もAI相談も始められないため、行き止まりにせず選択肢を見せる。
// 現在駅が確定すると自身で null を返す。
export const CurrentStationPrompt = ({ style }: Props) => {
  const station = useAtomValue(stationAtom);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const aiEnabled = useAIAgentFeatureEnabled();
  const setModalVisible = useSetAtom(stationSearchModalVisibleAtom);

  const handlePress = useCallback(() => {
    setModalVisible(true);
  }, [setModalVisible]);

  if (station?.groupId) {
    return null;
  }

  const subtitle = translate(
    aiEnabled
      ? 'currentStationPromptSubtitle'
      : 'currentStationPromptSubtitleNoAI'
  );

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${translate('currentStationPromptTitle')} ${subtitle}`}
      onPress={handlePress}
      style={[
        styles.root,
        isLEDTheme
          ? styles.ledBg
          : { backgroundColor: colors.card, borderColor: colors.accent },
        style,
      ]}
    >
      <Ionicons name="location" size={28} color={colors.accent} />
      <View style={styles.texts}>
        <Typography style={styles.title}>
          {translate('currentStationPromptTitle')}
        </Typography>
        <Typography style={[styles.subtitle, { color: colors.secondaryText }]}>
          {subtitle}
        </Typography>
      </View>
      <CardChevron stroke={isLEDTheme || colors.isDark ? '#fff' : '#000'} />
    </TouchableOpacity>
  );
};
