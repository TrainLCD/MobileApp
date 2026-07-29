import { Ionicons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import { StyleSheet, View } from 'react-native';
import Chip from '~/components/Chip';
import Typography from '~/components/Typography';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';

const EXAMPLE_KEYS = [
  'destinationAgentExample1',
  'destinationAgentExample2',
  'destinationAgentExample3',
] as const;

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
      <Ionicons name="sparkles" size={48} color="#008ffe" />
      <Typography style={styles.title}>
        {translate('destinationAgentEmptyTitle')}
      </Typography>
      <View style={styles.examples}>
        {EXAMPLE_KEYS.map((key) => {
          const text = translate(key);
          return (
            <Chip
              key={key}
              color="#008ffe"
              style={[styles.chip, isLEDTheme && styles.ledChip]}
              onPress={() => onSelectExample(text)}
            >
              {text}
            </Chip>
          );
        })}
      </View>
    </View>
  );
};
