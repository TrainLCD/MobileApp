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

// NOTE: iOS の lineHeight は fontSize の 1.1719 倍(= Roboto 本来の行送り)を超えては
// いけない。RN は Text の高さ計測に指定フォント(Roboto)の行送りを使う一方、描画は
// lineHeight と実際に使われるフォント(和文は Roboto にグリフが無くフォールバックされ
// 1.0em)に従うため、これを超えると確定した枠に収まらない行が丸ごと捨てられ、末尾が
// 欠ける。RFValue は値ごとに Math.round するため RFValue(16)/RFValue(14) のような比は
// 画面高で変動し(画面高 844 では 20/17 = 1.18em で上限超過)、安全域を保証できない。
// fontSize から直接算出して比率を固定する。
const IOS_LINE_HEIGHT_RATIO = 1.15;
const DESCRIPTION_FONT_SIZE = RFValue(14);
const HEADING_FONT_SIZE = RFValue(21);
const iosLineHeight = (fontSize: number) =>
  Platform.select({ ios: Math.floor(fontSize * IOS_LINE_HEIGHT_RATIO) });

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  text: {
    fontSize: DESCRIPTION_FONT_SIZE,
    marginBottom: 12,
    // NOTE: 余白は root 側へ持たせ、Text の幅は親いっぱいに固定する。Text 自身に
    // paddingHorizontal を持たせて親の alignItems: 'center' で内在幅に任せると、
    // 折り返し幅が計測時と描画時でずれる余地が残る。
    alignSelf: 'stretch',
    lineHeight: iosLineHeight(DESCRIPTION_FONT_SIZE),
  },
  headingText: {
    color: '#03a9f4',
    fontSize: HEADING_FONT_SIZE,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: iosLineHeight(HEADING_FONT_SIZE),
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
