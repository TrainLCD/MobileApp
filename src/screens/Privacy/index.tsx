import { CommonActions, useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSetRecoilState } from 'recoil';
import locationState from '../../store/atoms/location';
import navigationState from '../../store/atoms/navigation';
import { isJapanese, translate } from '../../translation';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
    paddingHorizontal: 32,
  },
  text: {
    fontSize: RFValue(14),
    color: '#333',
    textAlign: 'center',
    lineHeight: RFValue(18),
    marginBottom: 12,
  },
  boldText: {
    fontWeight: 'bold',
  },
  headingText: {
    color: '#03a9f4',
    fontSize: RFValue(21),
    lineHeight: undefined,
    fontWeight: 'bold',
  },
  button: {
    borderRadius: 4,
    backgroundColor: '#03a9f4',
    padding: 12,
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    marginBottom: 0,
  },
  linkText: {
    color: '#03a9f4',
    marginBottom: 0,
  },
  link: {
    borderBottomColor: '#03a9f4',
    borderBottomWidth: 1,
  },
});

const PrivacyScreen: React.FC = () => {
  const navigation = useNavigation();
  const setNavigation = useSetRecoilState(navigationState);
  const setLocation = useSetRecoilState(locationState);

  const handleLocationGranted = useCallback(async () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainStack' }],
      })
    );
    setNavigation((prev) => ({
      ...prev,
      requiredPermissionGranted: true,
    }));
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setLocation((prev) => ({
      ...prev,
      location,
    }));
    Notifications.requestPermissionsAsync();
  }, [navigation, setLocation, setNavigation]);

  const openFailedToOpenSettingsAlert = useCallback(
    () =>
      Alert.alert(translate('errorTitle'), translate('failedToOpenSettings'), [
        {
          text: 'OK',
        },
      ]),
    []
  );

  const showNotGrantedAlert = useCallback(() => {
    Alert.alert(translate('errorTitle'), translate('privacyDenied'), [
      {
        text: 'OK',
      },
      {
        text: translate('settings'),
        onPress: async (): Promise<void> => {
          Linking.openSettings().catch(() => {
            openFailedToOpenSettingsAlert();
          });
        },
      },
    ]);
  }, [openFailedToOpenSettingsAlert]);

  const handleApprovePress = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const granted = status === Location.PermissionStatus.GRANTED;
      await Location.enableNetworkProviderAsync();

      if (granted) {
        handleLocationGranted();
      } else {
        const { status: requestStatus } =
          await Location.requestForegroundPermissionsAsync();
        const requestGranted =
          requestStatus === Location.PermissionStatus.GRANTED;
        if (requestGranted) {
          handleLocationGranted();
        } else {
          showNotGrantedAlert();
        }
      }
    } catch (err) {
      Alert.alert(translate('errorTitle'), translate('fetchLocationFailed'), [
        { text: 'OK' },
      ]);
    }
  }, [handleLocationGranted, showNotGrantedAlert]);

  const openPrivacyPolicyIAB = (): void => {
    if (isJapanese) {
      WebBrowser.openBrowserAsync('https://trainlcd.app/privacy-policy');
    } else {
      WebBrowser.openBrowserAsync('https://trainlcd.app/privacy-policy-en');
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <Text style={[styles.text, styles.headingText]}>
        {translate('privacyTitle')}
      </Text>
      <Text style={[styles.text]}>{translate('privacyDescription')}</Text>

      <TouchableOpacity style={[styles.link]} onPress={openPrivacyPolicyIAB}>
        <Text style={[styles.text, styles.boldText, styles.linkText]}>
          {translate('privacyPolicy')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleApprovePress} style={styles.button}>
        <Text style={[styles.text, styles.boldText, styles.buttonText]}>
          {translate('approve')}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default PrivacyScreen;
