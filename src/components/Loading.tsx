import { Ionicons } from '@expo/vector-icons';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import Typography from './Typography';

const styles = StyleSheet.create({
  loading: {
    ...StyleSheet.absoluteFillObject,
    left: 0,
    top: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    position: 'absolute',
    textAlign: 'center',
    fontWeight: 'bold',
    alignSelf: 'center',
    bottom: '33.33%',
    fontSize: RFValue(14),
  },
  additionalLinkButton: {
    position: 'absolute',
    bottom: 44,
    alignSelf: 'center',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalLinkText: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: RFValue(14),
    color: '#008ffe',
  },
  icon: {
    color: '#008ffe',
    fontSize: RFValue(18),
    marginRight: 4,
  },
});

const Loading = ({
  message,
  linkType,
}: {
  message?: string;
  linkType?: 'serverStatus' | 'searchStation';
}) => {
  const navigation = useNavigation();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <View
      style={[
        styles.loading,
        {
          backgroundColor: isLEDTheme ? '#212121' : '#fff',
        },
      ]}
    >
      <ActivityIndicator size="large" />
      {message ? (
        <Typography style={styles.loadingText}>{message}</Typography>
      ) : null}
      {linkType === 'serverStatus' ? (
        <Pressable
          style={styles.additionalLinkButton}
          onPress={() => Linking.openURL('https://status.trainlcd.app')}
        >
          <Ionicons style={styles.icon} name="alert-circle-outline" size={32} />

          <Typography style={styles.additionalLinkText}>
            {translate('openStatusText')}
          </Typography>
        </Pressable>
      ) : null}
      {linkType === 'searchStation' ? (
        <Pressable
          style={styles.additionalLinkButton}
          onPress={() =>
            navigation.dispatch(StackActions.replace('FakeStation'))
          }
        >
          <Ionicons style={styles.icon} name="search-outline" size={32} />

          <Typography style={styles.additionalLinkText}>
            {translate('searchFirstStationTitle')}
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
};

export default Loading;
