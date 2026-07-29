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
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
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
  // リセット非表示時もタイトルが中央に留まるよう戻るボタンと同じ幅を確保する
  resetPlaceholder: {
    width: 44,
    height: 44,
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
      <Typography style={styles.title}>
        {translate('destinationAgentTitle')}
      </Typography>
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
      ) : (
        <View style={styles.resetPlaceholder} />
      )}
    </View>
  );
};
