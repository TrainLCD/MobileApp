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
    backgroundColor: '#fff',
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
    color: '#008ffe',
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
  const enabled = useAIAgentFeatureEnabled();

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
      onPress={handlePress}
      style={[styles.root, isLEDTheme ? styles.ledBg : styles.bg, style]}
    >
      <Ionicons name="sparkles" size={24} color="#008ffe" />
      <View style={styles.texts}>
        <Typography style={styles.title}>
          {translate('destinationAgentEntryTitle')}
        </Typography>
        <Typography style={styles.subtitle}>
          {translate('destinationAgentEntrySubtitle')}
        </Typography>
      </View>
      {/* 既定の stroke(#fff) は白背景で不可視になるため、AppSettings と同じくテーマに応じて指定する */}
      <CardChevron stroke={isLEDTheme ? '#fff' : '#000'} />
    </TouchableOpacity>
  );
};
