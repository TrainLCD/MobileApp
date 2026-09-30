import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useAppColors } from '~/providers/AppColorsProvider';
import { stationSearchModalVisibleAtom } from '~/store/atoms/stationSearchPrompt';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import Button from './Button';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
    padding: 20,
    gap: 12,
    borderRadius: 8,
    // CommonCard と同じ影値
    boxShadow: '0px 0px 8px rgba(51, 51, 51, 0.25)',
  },
  ledBg: {
    backgroundColor: '#212121',
    borderColor: '#fff',
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 12,
    lineHeight: 18,
  },
  buttons: {
    gap: 8,
    marginTop: 4,
  },
});

type Props = {
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
};

// 起動時に現在駅を解決できなかったとき、路線リストの代わりに出す案内。
// 駅名検索での手動選択を主導線にし、位置情報を直した後の再取得も選べるようにする。
export const CurrentStationUnavailableCard = ({ onRetry, style }: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const setModalVisible = useSetAtom(stationSearchModalVisibleAtom);

  const handleSearch = useCallback(() => {
    setModalVisible(true);
  }, [setModalVisible]);

  return (
    <View
      style={[
        styles.root,
        isLEDTheme ? styles.ledBg : { backgroundColor: colors.card },
        style,
      ]}
    >
      <Typography style={styles.title}>
        {translate('currentStationUnavailableTitle')}
      </Typography>
      <Typography style={[styles.text, { color: colors.secondaryText }]}>
        {translate('currentStationUnavailableText')}
      </Typography>
      <View style={styles.buttons}>
        <Button onPress={handleSearch}>
          {translate('searchByStationName')}
        </Button>
        <Button outline onPress={onRetry}>
          {translate('retryFetchLocation')}
        </Button>
      </View>
    </View>
  );
};
