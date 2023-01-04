import { CommonActions, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSetRecoilState } from 'recoil';
import Button from '../components/Button';
import Layout from '../components/Layout';
import locationState from '../store/atoms/location';
import navigationState from '../store/atoms/navigation';
import { isJapanese, translate } from '../translation';

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
    paddingHorizontal: 32,
  },
  headingText: {
    color: '#03a9f4',
    fontSize: RFValue(21),
    lineHeight: undefined,
    fontWeight: 'bold',
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
    lineHeight: RFValue(18),
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

  const handleStartWithoutPermissionPress = useCallback(() => {
    setNavigation((prev) => ({
      ...prev,
      requiredPermissionGranted: false,
    }));
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'FakeStation' }],
      })
    );
  }, [navigation, setNavigation]);

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
          Alert.alert(translate('notice'), translate('privacyDenied'), [
            {
              text: 'OK',
              onPress: handleStartWithoutPermissionPress,
            },
          ]);
        }
      }
    } catch (err) {
      Alert.alert(translate('errorTitle'), translate('fetchLocationFailed'), [
        { text: 'OK' },
      ]);
    }
  }, [handleLocationGranted, handleStartWithoutPermissionPress]);

  const openPrivacyPolicyIAB = (): void => {
    if (isJapanese) {
      WebBrowser.openBrowserAsync('https://trainlcd.app/privacy-policy');
    } else {
      WebBrowser.openBrowserAsync('https://trainlcd.app/privacy-policy-en');
    }
  };

  return (
    <Layout>
      <View style={styles.root}>
        <Text style={[styles.text, styles.headingText]}>
          {translate('privacyTitle')}
        </Text>
        <Text style={styles.text}>{translate('privacyDescription')}</Text>

        <TouchableOpacity style={styles.link} onPress={openPrivacyPolicyIAB}>
          <Text style={styles.linkText}>{translate('privacyPolicy')}</Text>
        </TouchableOpacity>
        <View style={styles.buttons}>
          <Button color="#008ffe" onPress={handleApprovePress}>
            {translate('approve')}
          </Button>
          <View style={styles.buttonSpacer} />
          <Button onPress={handleStartWithoutPermissionPress} color="#555">
            {translate('withoutPermission')}
          </Button>
        </View>
      </View>
    </Layout>
  );
};

export default PrivacyScreen;
