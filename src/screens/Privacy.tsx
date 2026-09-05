import { StackActions, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '~/providers/AppColorsProvider';
import Button from '../components/Button';
import Typography from '../components/Typography';
import { useFetchCurrentLocationOnce } from '../hooks';
import { setLocation } from '../store/atoms/location';
import { isJapanese, translate } from '../translation';
import { showDialog } from '../utils/dialogPresentation';
import { RFValue } from '../utils/rfValue';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontSize: RFValue(14),
    marginBottom: 12,
    // NOTE: 余白は root 側へ持たせ、Text の幅は親いっぱいに固定する。Text 自身に
    // paddingHorizontal を持たせて親の alignItems: 'center' で内在幅に任せると、
    // 折り返し幅が計測時と描画時でずれる余地が残る。
    alignSelf: 'stretch',
    // NOTE: iOS の lineHeight は fontSize の 1.1719 倍(Roboto 本来の行送り)を超えて
    // はいけない。RN は Text の高さ計測に指定フォント(Roboto)の行送りを使う一方、
    // 描画は lineHeight と実際に使われるフォント(和文はフォールバックされ 1.0em)に
    // 従うため、これを超えると枠に収まらない行が丸ごと捨てられて末尾が欠ける。
    // RFValue(16)/RFValue(14) は端末サイズによらず 1.11〜1.16em に収まる。
    lineHeight: Platform.select({
      ios: RFValue(16),
    }),
  },
  headingText: {
    color: '#03a9f4',
    fontSize: RFValue(21),
    fontWeight: 'bold',
    textAlign: 'center',
    // NOTE: RFValue(24)/RFValue(21) は 1.14〜1.15em で上記の上限内。見出しが元から
    // 欠けていなかったのはこのため。
    lineHeight: Platform.select({
      ios: RFValue(24),
    }),
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  linkText: {
    fontSize: RFValue(14),
    textAlign: 'center',
    color: '#03a9f4',
    fontWeight: 'bold',
  },
  link: {
    borderBottomColor: '#03a9f4',
    borderBottomWidth: 1,
  },
});

const PrivacyScreen: React.FC = () => {
  const colors = useAppColors();
  const navigation = useNavigation();
  const { fetchCurrentLocation } = useFetchCurrentLocationOnce();

  const handleLocationGranted = useCallback(async () => {
    navigation.dispatch(
      StackActions.replace('MainStack', { screen: 'SelectLine' })
    );

    const location = (await fetchCurrentLocation()) ?? null;
    if (location) {
      setLocation(location);
    }
  }, [fetchCurrentLocation, navigation]);

  const handleStartWithoutPermissionPress = useCallback(
    () =>
      navigation.dispatch(
        StackActions.replace('MainStack', {
          screen: 'SelectLine',
        })
      ),
    [navigation]
  );

  const handleLocationDenied = useCallback(
    (devicePermissionDenied?: boolean) => {
      showDialog(
        translate('announcementTitle'),
        translate(
          devicePermissionDenied ? 'privacyDeniedByDevice' : 'privacyDenied'
        ),
        [
          {
            text: 'OK',
            onPress: handleStartWithoutPermissionPress,
          },
        ],
        { cancelable: false }
      );
    },
    [handleStartWithoutPermissionPress]
  );

  const handleApprovePress = useCallback(async () => {
    try {
      const { locationServicesEnabled } =
        await Location.getProviderStatusAsync();
      if (!locationServicesEnabled) {
        handleLocationDenied(true);
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      await Notifications.requestPermissionsAsync();
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      }

      switch (status) {
        case Location.PermissionStatus.GRANTED:
          handleLocationGranted();
          break;
        case Location.PermissionStatus.DENIED:
          handleLocationDenied();
          break;
        case Location.PermissionStatus.UNDETERMINED:
          await Notifications.requestPermissionsAsync();
          break;
      }
    } catch (_err) {
      showDialog(translate('errorTitle'), translate('fetchLocationFailed'), [
        { text: 'OK' },
      ]);
    }
  }, [handleLocationDenied, handleLocationGranted]);

  const openPrivacyPolicyIAB = (): void => {
    if (isJapanese) {
      WebBrowser.openBrowserAsync('https://trainlcd.app/privacy-policy');
    } else {
      WebBrowser.openBrowserAsync('https://trainlcd.app/privacy-policy-en');
    }
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.subtleSurface }]}
    >
      <Typography style={[styles.text, styles.headingText]}>
        {translate('privacyTitle')}
      </Typography>
      <Typography style={[styles.text, { color: colors.text }]}>
        {translate('privacyDescription')}
      </Typography>

      <TouchableOpacity style={styles.link} onPress={openPrivacyPolicyIAB}>
        <Typography style={styles.linkText}>
          {translate('privacyPolicy')}
        </Typography>
      </TouchableOpacity>
      <View style={styles.buttons}>
        <Button onPress={handleApprovePress}>{translate('continue')}</Button>
      </View>
    </SafeAreaView>
  );
};

export default React.memo(PrivacyScreen);
