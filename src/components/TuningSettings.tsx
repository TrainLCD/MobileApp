import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoilState } from 'recoil';
import { FONTS } from '../constants';
import { useThemeStore } from '../hooks/useThemeStore';
import { APP_THEME } from '../models/Theme';
import tuningState from '../store/atoms/tuning';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';
import FAB from './FAB';
import Heading from './Heading';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
    height: Dimensions.get('window').height,
    paddingVertical: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  settingItemGroupTitle: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    marginTop: 12,
  },
  settingItemTitle: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
    marginTop: 12,
  },
  settingItemUnit: { fontSize: RFValue(12), fontWeight: 'bold', marginLeft: 8 },
  textInput: {
    width: '50%',
    height: 32,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#aaa',
    paddingHorizontal: 10,
  },
});

const TuningSettings: React.FC = () => {
  const [settings, setSettings] = useRecoilState(tuningState);
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const navigation = useNavigation();
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets();

  const hasInvalidNumber =
    settings.bottomTransitionInterval < 0 ||
    settings.headerTransitionDelay < 0 ||
    settings.headerTransitionInterval < 0;

  const onPressBack = useCallback(async () => {
    if (hasInvalidNumber) {
      Alert.alert(translate('errorTitle'), translate('nanErrorText'));
      return;
    }
    if (settings.headerTransitionDelay > settings.headerTransitionInterval) {
      Alert.alert(
        translate('errorTitle'),
        translate('headerDelayTooShortErrorText')
      );
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [
    hasInvalidNumber,
    navigation,
    settings.headerTransitionDelay,
    settings.headerTransitionInterval,
  ]);

  const parseNumberFromText = (prev: number, text: string) =>
    Number.isNaN(Number(text)) ? prev : Number(text);

  const handleHeaderIntervalChange = (text: string) =>
    setSettings((prev) => ({
      ...prev,
      headerTransitionInterval: parseNumberFromText(
        prev.headerTransitionInterval,
        text
      ),
    }));
  const handleHeaderDelayChange = (text: string) =>
    setSettings((prev) => ({
      ...prev,
      headerTransitionDelay: parseNumberFromText(
        prev.headerTransitionDelay,
        text
      ),
    }));

  const handleBottomDelayChange = (text: string) =>
    setSettings((prev) => ({
      ...prev,
      bottomTransitionInterval: parseNumberFromText(
        prev.bottomTransitionInterval,
        text
      ),
    }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          ...styles.root,
          backgroundColor: isLEDTheme ? '#212121' : '#fff',
          paddingLeft: safeAreaLeft || 32,
          paddingRight: safeAreaRight || 32,
        }}
      >
        <Heading>{translate('tuning')}</Heading>
        <Typography style={styles.settingItemGroupTitle}>
          {translate('tuningItemTiming')}
        </Typography>

        <Typography style={styles.settingItemTitle}>
          {translate('tuningItemHeaderDelay')}
        </Typography>
        <View style={styles.settingItem}>
          <TextInput
            style={{
              ...styles.textInput,
              color: isLEDTheme ? '#fff' : 'black',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            }}
            onChangeText={handleHeaderIntervalChange}
            value={settings.headerTransitionInterval.toString()}
            placeholder={settings.headerTransitionInterval.toString()}
            keyboardType="number-pad"
          />
          <Typography style={styles.settingItemUnit}>ms</Typography>
        </View>

        <Typography style={styles.settingItemTitle}>
          {translate('tuningItemHeaderDuration')}
        </Typography>
        <View style={styles.settingItem}>
          <TextInput
            style={{
              ...styles.textInput,
              color: isLEDTheme ? '#fff' : 'black',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            }}
            onChangeText={handleHeaderDelayChange}
            value={settings.headerTransitionDelay.toString()}
            placeholder={settings.headerTransitionDelay.toString()}
            keyboardType="number-pad"
          />
          <Typography style={styles.settingItemUnit}>ms</Typography>
        </View>

        <Typography style={styles.settingItemTitle}>
          {translate('tuningItemBottomTransitionDelay')}
        </Typography>
        <View style={styles.settingItem}>
          <TextInput
            style={{
              ...styles.textInput,
              color: isLEDTheme ? '#fff' : 'black',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            }}
            onChangeText={handleBottomDelayChange}
            value={settings.bottomTransitionInterval.toString()}
            placeholder={settings.bottomTransitionInterval.toString()}
            keyboardType="number-pad"
          />
          <Typography style={styles.settingItemUnit}>ms</Typography>
        </View>
      </ScrollView>
      <FAB onPress={onPressBack} icon="close" />
    </KeyboardAvoidingView>
  );
};

export default React.memo(TuningSettings);
