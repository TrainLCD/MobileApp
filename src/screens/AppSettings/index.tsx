import React, { useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Switch,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRecoilState } from 'recoil';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RFValue } from 'react-native-responsive-fontsize';
import Heading from '../../components/Heading';
import { translate } from '../../translation';
import FAB from '../../components/FAB';
import speechState from '../../store/atoms/speech';
import Button from '../../components/Button';

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
  const [{ speechEnabled }, setSpeech] = useRecoilState(speechState);

  const showBetaAlert = useCallback(() => {
    Alert.alert(translate('notice'), translate('betaAlertText'), [
      {
        text: 'OK',
      },
    ]);
  }, []);

  const onSpeechEnabledValueChange = useCallback(
    async (flag: boolean) => {
      // 下のコードがnullを返せば一回もONにしたことがないはず
      const maybeNull = await AsyncStorage.getItem('@TrainLCD:speechEnabled');

      if (flag && maybeNull === null) {
        showBetaAlert();
      }

      AsyncStorage.setItem('@TrainLCD:speechEnabled', flag ? 'true' : 'false');
      setSpeech((prev) => ({
        ...prev,
        speechEnabled: flag,
      }));
    },
    [setSpeech, showBetaAlert]
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
      </ScrollView>
      <FAB onPress={onPressBack} icon="md-close" />
    </>
  );
};

export default AppSettingsScreen;
