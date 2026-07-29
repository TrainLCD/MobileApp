import { Ionicons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Typography from '~/components/Typography';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    height: 56,
  },
  // 左右を同じ flex にしてタイトルを画面中央に保つ(戻る44ptとリセット約100ptの幅差を吸収)
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resetButton: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  resetText: {
    fontSize: 14,
    color: '#008ffe',
  },
});

type Props = {
  showReset: boolean;
  onBack: () => void;
  onReset: () => void;
};

export const AgentHeader = ({ showReset, onBack, onReset }: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <View style={styles.root}>
      <View style={styles.side}>
        <TouchableOpacity
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={translate('back')}
          onPress={onBack}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={isLEDTheme ? '#fff' : '#333'}
          />
        </TouchableOpacity>
      </View>
      <Typography style={styles.title}>
        {translate('destinationAgentTitle')}
      </Typography>
      <View style={[styles.side, styles.sideRight]}>
        {showReset ? (
          <TouchableOpacity
            style={styles.resetButton}
            accessibilityRole="button"
            accessibilityLabel={translate('destinationAgentReset')}
            onPress={onReset}
          >
            <Typography style={styles.resetText}>
              {translate('destinationAgentReset')}
            </Typography>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};
