import { StackActions, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback } from 'react';
import {
  Alert,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Button from '../components/Button';
import Typography from '../components/Typography';
import { useFetchCurrentLocationOnce, useLocationStore } from '../hooks';
import { isJapanese, translate } from '../translation';
import { RFValue } from '../utils/rfValue';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
  },
  text: {
    fontSize: RFValue(14),
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 24,
    lineHeight: Platform.select({
      ios: RFValue(18),
    }),
  },
  headingText: {
    color: '#03a9f4',
    fontSize: RFValue(21),
    fontWeight: 'bold',
    width: '100%',
    textAlign: 'center',
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
  buttonSpacer: { width: 16 },
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
  const navigation = useNavigation();
  const { fetchCurrentLocation } = useFetchCurrentLocationOnce();

  const handleLocationGranted = useCallback(async () => {
    navigation.dispatch(
      StackActions.replace('MainStack', { screen: 'SelectLine' })
    );

    const location = (await fetchCurrentLocation()) ?? null;
    if (location) {
      useLocationStore.setState(location);
    }
  }, [fetchCurrentLocation, navigation]);

  const handleStartWithoutPermissionPress = useCallback(() => {
    navigation.dispatch(StackActions.replace('FakeStation'));
  }, [navigation]);

  const handleLocationDenied = useCallback(
    (devicePermissionDenied?: boolean) => {
      Alert.alert(
        translate('announcementTitle'),
        translate(
          devicePermissionDenied ? 'privacyDeniedByDevice' : 'privacyDenied'
        ),
        [
          {
            text: 'OK',
            onPress: handleStartWithoutPermissionPress,
          },
        ]
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
      Alert.alert(translate('errorTitle'), translate('fetchLocationFailed'), [
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
    <SafeAreaView style={styles.root}>
      <Typography style={[styles.text, styles.headingText]}>
        {translate('privacyTitle')}
      </Typography>
      <Typography style={styles.text}>
        {translate('privacyDescription')}
      </Typography>

      <TouchableOpacity style={styles.link} onPress={openPrivacyPolicyIAB}>
        <Typography style={styles.linkText}>
          {translate('privacyPolicy')}
        </Typography>
      </TouchableOpacity>
      <View style={styles.buttons}>
        <Button color="#008ffe" onPress={handleApprovePress}>
          {translate('continue')}
        </Button>
      </View>
    </SafeAreaView>
  );
};

export default React.memo(PrivacyScreen);
