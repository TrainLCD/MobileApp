import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ASYNC_STORAGE_KEYS, DEFAULT_TTS_VOICE_NAME, FONTS } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import tuningState from '~/store/atoms/tuning';
import { translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import FAB from './FAB';
import { Heading } from './Heading';
import LEDThemeSwitch from './LEDThemeSwitch';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
    height: '100%',
    paddingVertical: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  switchSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
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
  switchSettingItemText: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  picker: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#aaa',
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '50%',
  },
  promptInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#aaa',
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxHeight: 120,
    textAlignVertical: 'top',
    fontSize: RFValue(11),
  },
});

const DEFAULT_JA_PROMPT = [
  '以下の日本語を、現代的な鉄道自動放送のように読み上げてください。',
  '全体的に平板なイントネーションを維持し、感情を込めず淡々と読んでください。',
  '文のイントネーションは文末に向かって自然に下降させてください。',
  '助詞（は、の、で、を等）で不自然にピッチを上げないでください。',
  '駅名や路線名は平板アクセントで読んでください（一般会話のアクセントとは異なります）。',
  '無駄な間を入れず、一定のテンポで読み進めてください。',
  '漢字の読みは一文字も省略せず正確に読んでください。',
  '特に路線名は正式な読みに従ってください（例：副都心線→ふくとしんせん、東海道線→とうかいどうせん、山手線→やまのてせん）。',
  '鉄道会社の略称も正確に読んでください（例：名鉄→めいてつ、京急→けいきゅう、京王→けいおう、阪急→はんきゅう、阪神→はんしん、南海→なんかい、近鉄→きんてつ、西鉄→にしてつ、東急→とうきゅう、小田急→おだきゅう、京成→けいせい、相鉄→そうてつ）。',
].join('');

const DEFAULT_EN_PROMPT = [
  'Read the following in a calm, clear, and composed tone like a modern train announcement.',
  ' Speak quickly and crisply with a swift, efficient delivery.',
  ' Do not linger on words or pause unnecessarily.',
  ' Maintain a steady, relaxed intonation despite the fast pace.',
  ' The text contains Japanese railway station names and line names in romanized form.',
  ' Pronounce them using Japanese vowel rules, NOT English rules: a=ah, i=ee, u=oo, e=eh, o=oh.',
  ' Every vowel is always pronounced the same way regardless of surrounding letters',
  ' (e.g. "Inage" = ee-nah-geh, NOT "inn-idge"; "Meguro" = meh-goo-roh; "Ebisu" = eh-bee-soo; "Ome" = oh-meh, NOT "ohm").',
  ' Never apply English spelling conventions like silent e, soft g, or vowel shifts to these names.',
].join('');

const TTS_VOICE_NAMES = [
  'Achernar',
  'Aoede',
  'Autonoe',
  'Callirrhoe',
  'Despina',
  'Erinome',
  'Gacrux',
  'Kore',
  'Laomedeia',
  'Leda',
  'Pulcherrima',
  'Sulafat',
  'Vindemiatrix',
  'Zephyr',
] as const;

const TuningSettings: React.FC = () => {
  const [settings, setSettings] = useAtom(tuningState);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const navigation = useNavigation();
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const [enVoice, jaVoice, jaPrompt, enPrompt] = await Promise.all([
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TTS_EN_VOICE_NAME),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TTS_JA_VOICE_NAME),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TTS_JA_PROMPT),
        AsyncStorage.getItem(ASYNC_STORAGE_KEYS.TTS_EN_PROMPT),
      ]);
      setSettings((prev) => ({
        ...prev,
        ttsEnVoiceName: enVoice || DEFAULT_TTS_VOICE_NAME,
        ttsJaVoiceName: jaVoice || DEFAULT_TTS_VOICE_NAME,
        ttsJaPrompt: jaPrompt ?? '',
        ttsEnPrompt: enPrompt ?? '',
      }));
    })();
  }, [setSettings]);

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

  const handleHeaderIntervalChange = (text: string) => {
    const value = parseNumberFromText(settings.headerTransitionInterval, text);
    setSettings((prev) => ({
      ...prev,
      headerTransitionInterval: value,
    }));
    AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.HEADER_TRANSITION_INTERVAL,
      String(value)
    );
  };
  const handleHeaderDelayChange = (text: string) => {
    const value = parseNumberFromText(settings.headerTransitionDelay, text);
    setSettings((prev) => ({
      ...prev,
      headerTransitionDelay: value,
    }));
    AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.HEADER_TRANSITION_DELAY,
      String(value)
    );
  };

  const handleBottomDelayChange = (text: string) => {
    const value = parseNumberFromText(settings.bottomTransitionInterval, text);
    setSettings((prev) => ({
      ...prev,
      bottomTransitionInterval: value,
    }));
    AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.BOTTOM_TRANSITION_INTERVAL,
      String(value)
    );
  };

  const [voicePickerState, setVoicePickerState] = useState<{
    current: string;
    onSelect: (voice: string) => void;
  } | null>(null);

  const showVoicePicker = (
    current: string,
    onSelect: (voice: string) => void
  ) => {
    if (Platform.OS === 'ios') {
      const options = [...TTS_VOICE_NAMES, translate('cancel')];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
        },
        (index) => {
          if (index < TTS_VOICE_NAMES.length) {
            onSelect(TTS_VOICE_NAMES[index]);
          }
        }
      );
    } else {
      setVoicePickerState({ current, onSelect });
    }
  };

  const handleEnVoiceNameChange = (voice: string) => {
    setSettings((prev) => ({ ...prev, ttsEnVoiceName: voice }));
    AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TTS_EN_VOICE_NAME, voice);
  };

  const handleJaPromptChange = (text: string) => {
    setSettings((prev) => ({ ...prev, ttsJaPrompt: text }));
    AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TTS_JA_PROMPT, text);
  };

  const handleEnPromptChange = (text: string) => {
    setSettings((prev) => ({ ...prev, ttsEnPrompt: text }));
    AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TTS_EN_PROMPT, text);
  };

  const handleJaVoiceNameChange = (voice: string) => {
    setSettings((prev) => ({ ...prev, ttsJaVoiceName: voice }));
    AsyncStorage.setItem(ASYNC_STORAGE_KEYS.TTS_JA_VOICE_NAME, voice);
  };

  const toggleDevOverlayEnabled = () => {
    const nextValue = !settings.devOverlayEnabled;
    setSettings((prev) => ({
      ...prev,
      devOverlayEnabled: nextValue,
    }));
    AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.DEV_OVERLAY_ENABLED,
      String(nextValue)
    );
  };

  const toggleUntouchableModeEnabled = () => {
    const nextValue = !settings.untouchableModeEnabled;
    setSettings((prev) => ({
      ...prev,
      untouchableModeEnabled: nextValue,
    }));
    AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.UNTOUCHABLE_MODE_ENABLED,
      String(nextValue)
    );
  };

  const toggleTelemetryEnabled = () => {
    const nextValue = !settings.telemetryEnabled;
    setSettings((prev) => ({
      ...prev,
      telemetryEnabled: nextValue,
    }));
    AsyncStorage.setItem(
      ASYNC_STORAGE_KEYS.TELEMETRY_ENABLED,
      String(nextValue)
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.root,
          {
            backgroundColor: isLEDTheme ? '#212121' : '#fff',
            paddingLeft: safeAreaLeft || 32,
            paddingRight: safeAreaRight || 32,
          },
        ]}
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
            style={[
              styles.textInput,
              {
                color: isLEDTheme ? '#fff' : 'black',
                fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
              },
            ]}
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
            style={[
              styles.textInput,
              {
                color: isLEDTheme ? '#fff' : 'black',
                fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
              },
            ]}
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
            style={[
              styles.textInput,
              {
                color: isLEDTheme ? '#fff' : 'black',
                fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
              },
            ]}
            onChangeText={handleBottomDelayChange}
            value={settings.bottomTransitionInterval.toString()}
            placeholder={settings.bottomTransitionInterval.toString()}
            keyboardType="number-pad"
          />
          <Typography style={styles.settingItemUnit}>ms</Typography>
        </View>

        <Typography style={styles.settingItemGroupTitle}>
          {translate('tuningItemTTSVoice')}
        </Typography>

        <Typography style={styles.settingItemTitle}>
          {translate('tuningItemTTSJaVoiceName')}
        </Typography>
        <Pressable
          style={[styles.picker, { borderColor: isLEDTheme ? '#666' : '#aaa' }]}
          onPress={() =>
            showVoicePicker(settings.ttsJaVoiceName, handleJaVoiceNameChange)
          }
        >
          <Typography
            style={{
              color: isLEDTheme ? '#fff' : 'black',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            }}
          >
            {settings.ttsJaVoiceName}
          </Typography>
        </Pressable>

        <Typography style={styles.settingItemTitle}>
          {translate('tuningItemTTSEnVoiceName')}
        </Typography>
        <Pressable
          style={[styles.picker, { borderColor: isLEDTheme ? '#666' : '#aaa' }]}
          onPress={() =>
            showVoicePicker(settings.ttsEnVoiceName, handleEnVoiceNameChange)
          }
        >
          <Typography
            style={{
              color: isLEDTheme ? '#fff' : 'black',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            }}
          >
            {settings.ttsEnVoiceName}
          </Typography>
        </Pressable>

        <Typography style={styles.settingItemTitle}>
          {translate('tuningItemTTSJaPrompt')}
        </Typography>
        <TextInput
          style={[
            styles.promptInput,
            {
              color: isLEDTheme ? '#fff' : 'black',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
              borderColor: isLEDTheme ? '#666' : '#aaa',
            },
          ]}
          onChangeText={handleJaPromptChange}
          value={settings.ttsJaPrompt || DEFAULT_JA_PROMPT}
          placeholder={DEFAULT_JA_PROMPT}
          placeholderTextColor="#999"
          multiline
        />

        <Typography style={styles.settingItemTitle}>
          {translate('tuningItemTTSEnPrompt')}
        </Typography>
        <TextInput
          style={[
            styles.promptInput,
            {
              color: isLEDTheme ? '#fff' : 'black',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
              borderColor: isLEDTheme ? '#666' : '#aaa',
            },
          ]}
          onChangeText={handleEnPromptChange}
          value={settings.ttsEnPrompt || DEFAULT_EN_PROMPT}
          placeholder={DEFAULT_EN_PROMPT}
          placeholderTextColor="#999"
          multiline
        />

        <View style={styles.switchSettingItem}>
          {isLEDTheme ? (
            <LEDThemeSwitch
              value={!settings.devOverlayEnabled}
              onValueChange={toggleDevOverlayEnabled}
              accessibilityLabel={translate('tuningItemDisableDevOverlay')}
            />
          ) : (
            <Switch
              value={!settings.devOverlayEnabled}
              onValueChange={toggleDevOverlayEnabled}
              ios_backgroundColor={'#fff'}
              accessibilityLabel={translate('tuningItemDisableDevOverlay')}
            />
          )}

          <Typography
            style={styles.switchSettingItemText}
            onPress={toggleDevOverlayEnabled}
            accessibilityRole="button"
          >
            {translate('disableDevOverlay')}
          </Typography>
        </View>

        <View style={styles.switchSettingItem}>
          {isLEDTheme ? (
            <LEDThemeSwitch
              value={settings.untouchableModeEnabled}
              onValueChange={toggleUntouchableModeEnabled}
              accessibilityLabel={translate('enableUntouchableMode')}
            />
          ) : (
            <Switch
              value={settings.untouchableModeEnabled}
              onValueChange={toggleUntouchableModeEnabled}
              ios_backgroundColor={'#fff'}
              accessibilityLabel={translate('enableUntouchableMode')}
            />
          )}

          <Typography
            style={styles.switchSettingItemText}
            onPress={toggleUntouchableModeEnabled}
            accessibilityRole="button"
          >
            {translate('enableUntouchableMode')}
          </Typography>
        </View>

        <View style={styles.switchSettingItem}>
          {isLEDTheme ? (
            <LEDThemeSwitch
              value={settings.telemetryEnabled}
              onValueChange={toggleTelemetryEnabled}
              accessibilityLabel={translate('optInTelemetryTitle')}
            />
          ) : (
            <Switch
              value={settings.telemetryEnabled}
              onValueChange={toggleTelemetryEnabled}
              ios_backgroundColor={'#fff'}
              accessibilityLabel={translate('optInTelemetryTitle')}
            />
          )}

          <Typography
            style={styles.switchSettingItemText}
            onPress={toggleTelemetryEnabled}
            accessibilityRole="button"
          >
            {translate('optInTelemetryTitle')}
          </Typography>
        </View>
      </ScrollView>
      <FAB onPress={onPressBack} icon="close" />

      {voicePickerState && (
        <Modal
          transparent
          animationType="fade"
          visible
          onRequestClose={() => setVoicePickerState(null)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={() => setVoicePickerState(null)}
          >
            <Pressable
              style={{
                backgroundColor: isLEDTheme ? '#222' : '#fff',
                borderRadius: 12,
                width: '80%',
                maxHeight: '60%',
                paddingVertical: 8,
              }}
            >
              <FlatList
                data={TTS_VOICE_NAMES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <Pressable
                    style={{ paddingHorizontal: 20, paddingVertical: 12 }}
                    onPress={() => {
                      voicePickerState.onSelect(item);
                      setVoicePickerState(null);
                    }}
                  >
                    <Typography
                      style={{
                        fontSize: RFValue(14),
                        color: isLEDTheme ? '#fff' : '#000',
                        fontFamily: isLEDTheme
                          ? FONTS.JFDotJiskan24h
                          : undefined,
                      }}
                    >
                      {voicePickerState.current === item ? `● ${item}` : item}
                    </Typography>
                  </Pressable>
                )}
              />
              <Pressable
                style={{
                  paddingVertical: 12,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: isLEDTheme ? '#555' : '#ccc',
                  alignItems: 'center',
                }}
                onPress={() => setVoicePickerState(null)}
              >
                <Typography
                  style={{
                    fontSize: RFValue(14),
                    color: '#999',
                    fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
                  }}
                >
                  {translate('cancel')}
                </Typography>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
};

export default React.memo(TuningSettings);
