import { StackActions, useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useAtomValue } from 'jotai';
import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STATUS_URL } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: RFValue(16),
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 32,
  },
  headingText: {
    color: '#03a9f4',
    fontSize: RFValue(24),
    fontWeight: 'bold',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  buttons: { flexDirection: 'row' },
  button: {
    borderRadius: 4,
    backgroundColor: '#03a9f4',
    padding: 12,
    marginTop: 24,
    marginHorizontal: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: RFValue(16),
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

type Props = {
  title: string;
  text: string;
  onRetryPress?: () => void;
  showSearchStation?: boolean;
  showStatus?: boolean;
  isFetching?: boolean;
};

const ErrorScreen: React.FC<Props> = ({
  title,
  text,
  onRetryPress,
  showSearchStation,
  showStatus,
  isFetching,
}: Props) => {
  const openStatusPage = useCallback(() => Linking.openURL(STATUS_URL), []);
  const navigation = useNavigation();
  const handleToStationSearch = useCallback(
    () =>
      navigation.dispatch(
        StackActions.replace('MainStack', {
          screen: 'SelectLine',
        })
      ),
    [navigation]
  );
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <SafeAreaView
      style={[
        styles.root,
        {
          backgroundColor: isLEDTheme ? '#212121' : '#fff',
        },
      ]}
    >
      <Typography style={[styles.text, styles.headingText]}>{title}</Typography>
      <Typography style={styles.text}>{text}</Typography>

      <View style={styles.buttons}>
        {onRetryPress ? (
          <TouchableOpacity
            onPress={onRetryPress}
            disabled={isFetching}
            style={[{ opacity: isFetching ? 0.5 : 1 }, styles.button]}
          >
            <Typography style={styles.buttonText}>
              {translate('retry')}
            </Typography>
          </TouchableOpacity>
        ) : null}
        {showSearchStation ? (
          <TouchableOpacity
            onPress={handleToStationSearch}
            style={styles.button}
          >
            <Typography style={styles.buttonText}>
              {translate('home')}
            </Typography>
          </TouchableOpacity>
        ) : null}
        {showStatus ? (
          <TouchableOpacity onPress={openStatusPage} style={styles.button}>
            <Typography style={styles.buttonText}>
              {translate('openStatusText')}
            </Typography>
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default React.memo(ErrorScreen);
