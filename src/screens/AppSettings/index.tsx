import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilState } from 'recoil';
import Button from '../../components/Button';
import FAB from '../../components/FAB';
import Heading from '../../components/Heading';
import AsyncStorageKeys from '../../constants/asyncStorageKeys';
import changeAppIcon from '../../nativeUtils/customIconModule';
import devState from '../../store/atoms/dev';
import speechState from '../../store/atoms/speech';
import { translate } from '../../translation';

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
  },
  settingsItemHeading: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  settingItem: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
});

const AppSettingsScreen: React.FC = () => {
  const [{ enabled: speechEnabled }, setSpeech] = useRecoilState(speechState);
  const [{ devMode }, setDevState] = useRecoilState(devState);

  const onSpeechEnabledValueChange = useCallback(
    async (flag: boolean) => {
      const ttsNoticeConfirmed = await AsyncStorage.getItem(
        AsyncStorageKeys.TTSNotice
      );
      if (flag && ttsNoticeConfirmed === null) {
        Alert.alert(translate('notice'), translate('ttsAlertText'), [
          {
            text: translate('dontShowAgain'),
            style: 'cancel',
            onPress: async (): Promise<void> => {
              await AsyncStorage.setItem(AsyncStorageKeys.TTSNotice, 'true');
            },
          },
          {
            text: 'OK',
          },
        ]);
      }

      await AsyncStorage.setItem(
        AsyncStorageKeys.SpeechEnabled,
        flag ? 'true' : 'false'
      );
      setSpeech((prev) => ({
        ...prev,
        enabled: flag,
      }));
    },
    [setSpeech]
  );

  const navigation = useNavigation();

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);
  const toThemeSettings = () => navigation.navigate('ThemeSettings');
  const toEnabledLanguagesSettings = () =>
    navigation.navigate('EnabledLanguagesSettings');
  const disableDevMode = async () => {
    Alert.alert(translate('warning'), translate('confirmDisableDevMode'), [
      {
        text: 'OK',
        onPress: async () => {
          await AsyncStorage.removeItem(AsyncStorageKeys.DevModeEnabled);
          setDevState((prev) => ({ ...prev, devMode: false }));
          Alert.alert(
            translate('warning'),
            translate('disabledDevModeDescription')
          );
          await changeAppIcon(null);
        },
        style: 'destructive',
      },
      {
        text: translate('cancel'),
        style: 'cancel',
      },
    ]);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{translate('settings')}</Heading>
        <View
          style={[
            styles.settingItem,
            {
              flexDirection: 'row',
            },
          ]}
        >
          <Switch
            style={{ marginRight: 8 }}
            value={speechEnabled}
            onValueChange={onSpeechEnabledValueChange}
          />

          <Text style={styles.settingsItemHeading}>
            {translate('autoAnnounceItemTitle')}
          </Text>
        </View>
        <View style={styles.settingItem}>
          <Button onPress={toThemeSettings}>
            {translate('selectThemeTitle')}
          </Button>
        </View>
        <View style={styles.settingItem}>
          <Button onPress={toEnabledLanguagesSettings}>
            {translate('selectLanguagesTitle')}
          </Button>
        </View>
        {devMode ? (
          <View style={styles.settingItem}>
            <Button onPress={disableDevMode}>
              {translate('disableDevMode')}
            </Button>
          </View>
        ) : null}
      </ScrollView>
      <FAB onPress={onPressBack} icon="md-close" />
    </>
  );
};

export default AppSettingsScreen;
