import React, { useCallback } from 'react';
import { Alert, Linking, SafeAreaView, StyleSheet, Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import * as Permissions from 'expo-permissions';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import * as WebBrowser from 'expo-web-browser';
import { isJapanese, translate } from '../../translation';
import { updateGrantedRequiredPermission } from '../../store/actions/navigation';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fcfcfc',
    paddingHorizontal: 32,
  },
  text: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: 'bold',
  },
  headingText: {
    color: '#03a9f4',
    fontSize: 24,
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
    lineHeight: 24,
  },
  link: {
    borderBottomColor: '#03a9f4',
    borderBottomWidth: 1,
  },
});

const PrivacyScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

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
          Linking.openSettings().catch((err) => {
            console.error(err);
            openFailedToOpenSettingsAlert();
          });
        },
      },
    ]);
  }, [openFailedToOpenSettingsAlert]);

  const handleApprovePress = useCallback(async () => {
    try {
      const { granted } = await Permissions.askAsync(Permissions.LOCATION);
      await Permissions.askAsync(Permissions.USER_FACING_NOTIFICATIONS);
      if (granted) {
        navigation.navigate('SelectLine');
        dispatch(updateGrantedRequiredPermission(granted));
      } else {
        showNotGrantedAlert();
      }
    } catch (err) {
      console.error(err);
    }
  }, [dispatch, navigation, showNotGrantedAlert]);

  const openPrivacyPolicyIAB = (): void => {
    if (isJapanese) {
      WebBrowser.openBrowserAsync(
        'https://trainlcd.tinykitten.me/privacy-policy'
      );
    } else {
      WebBrowser.openBrowserAsync(
        'https://trainlcd.tinykitten.me/privacy-policy-en'
      );
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
