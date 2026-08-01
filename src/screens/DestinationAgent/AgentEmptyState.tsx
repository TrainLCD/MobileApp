import { Ionicons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Chip from '~/components/Chip';
import Typography from '~/components/Typography';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';

const EXAMPLE_KEYS = [
  'destinationAgentExample1',
  'destinationAgentExample2',
  'destinationAgentExample3',
] as const;

// アイコン → タイトル → 例文チップの順に上から視線が流れるよう段階的にフェードインする。
// 画面初回マウントだけでなく会話リセット時の再マウントでも再生される
const ENTER_DURATION = 250;
const ENTER_STAGGER = 60;

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 26,
  },
  examples: {
    gap: 12,
  },
  // Chip の既定値(paddingHorizontal 8 / paddingVertical 4 / borderRadius 16)を
  // 例文チップ用に広げる。角丸 18 は LED テーマでも維持する(Figma 確定)。
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  // Chip の非 active 背景は白固定のため、LED テーマは Figma どおり画面背景色に上書きする
  ledChip: {
    backgroundColor: '#212121',
  },
});

type Props = {
  onSelectExample: (text: string) => void;
};

export const AgentEmptyState = ({ onSelectExample }: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeInDown.duration(ENTER_DURATION)}>
        <Ionicons name="sparkles" size={48} color="#008ffe" />
      </Animated.View>
      <Animated.View
        entering={FadeInDown.delay(ENTER_STAGGER).duration(ENTER_DURATION)}
      >
        <Typography style={styles.title}>
          {translate('destinationAgentEmptyTitle')}
        </Typography>
      </Animated.View>
      <View style={styles.examples}>
        {EXAMPLE_KEYS.map((key, index) => {
          const text = translate(key);
          return (
            <Animated.View
              key={key}
              entering={FadeInDown.delay(ENTER_STAGGER * (index + 2)).duration(
                ENTER_DURATION
              )}
            >
              <Chip
                color="#008ffe"
                style={[styles.chip, isLEDTheme && styles.ledChip]}
                onPress={() => onSelectExample(text)}
              >
                {text}
              </Chip>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
};
