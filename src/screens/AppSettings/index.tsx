import React, { useCallback } from 'react';
import { StyleSheet, ScrollView, View, Text, Switch } from 'react-native';
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

  const onSpeechEnabledValueChange = useCallback(
    (flag: boolean) => {
      AsyncStorage.setItem('@TrainLCD:speechEnabled', flag ? 'true' : 'false');
      setSpeech((prev) => ({
        ...prev,
        speechEnabled: flag,
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
            自動アナウンスを使用する(ベータ版)
          </Text>
        </View>
        <View style={styles.settingItem}>
          <Button onPress={toThemeSettings}>テーマ設定</Button>
        </View>
      </ScrollView>
      <FAB onPress={onPressBack} icon="md-close" />
    </>
  );
};

export default AppSettingsScreen;
