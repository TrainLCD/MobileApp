import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Animated as RNAnimated,
  StyleSheet,
  View,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import Animated from 'react-native-reanimated';
import Button from '~/components/Button';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import { StatePanel } from '~/components/ToggleButton';
import Typography from '~/components/Typography';
import speechState from '~/store/atoms/speech';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { ASYNC_STORAGE_KEYS } from '../constants';

type SettingItem = {
  id: string;
  title: string;
  nationalFlag?: string;
};

type TTSLanguage = 'JA' | 'EN';

type TTSLanguageSettingItem = {
  id: TTSLanguage;
  title: string;
  nationalFlag: string;
};

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  screenBg: {
    backgroundColor: '#FAFAFA',
  },
});

const SettingsItem = ({
  item,
  isFirst,
  isLast,
  state,
  disabled,
  onToggle,
}: {
  item: SettingItem;
  isFirst: boolean;
  isLast: boolean;
  state: boolean;
  disabled: boolean;
  onToggle: (event: GestureResponderEvent) => void;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={item.title}
      accessibilityState={{ checked: state, disabled }}
      onPress={onToggle}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: isLEDTheme ? '#333' : 'white',
        borderTopLeftRadius: isFirst && !isLEDTheme ? 12 : 0,
        borderTopRightRadius: isFirst && !isLEDTheme ? 12 : 0,
        borderBottomLeftRadius: isLast && !isLEDTheme ? 12 : 0,
        borderBottomRightRadius: isLast && !isLEDTheme ? 12 : 0,
      }}
    >
      {item.nationalFlag ? (
        <View style={{ marginRight: 12 }}>
          <Typography style={{ fontSize: 21 }}>{item.nationalFlag}</Typography>
        </View>
      ) : null}
      <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
        {item.title}
      </Typography>

      <StatePanel state={state} disabled={disabled} />
    </Pressable>
  );
};

const TTSSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const [
    { enabled: speechEnabled, backgroundEnabled, ttsEnabledLanguages },
    setSpeechState,
  ] = useAtom(speechState);

  const navigation = useNavigation();

  const SETTING_ITEMS: SettingItem[] = [
    {
      id: 'enable_tts',
      title: translate('toEnabled'),
    },
    {
      id: 'enable_bg_tts',
      title: translate('autoAnnounceBackgroundTitle'),
    },
  ] as const;

  const TTS_LANGUAGE_ITEMS: TTSLanguageSettingItem[] = useMemo(
    () => [
      {
        id: 'JA',
        title: translate('japanese'),
        nationalFlag: '🇯🇵',
      },
      {
        id: 'EN',
        title: translate('english'),
        nationalFlag: '🇺🇸',
      },
    ],
    []
  );

  const handleToggleTTS = useCallback(
    async (flag: boolean) => {
      try {
        const noticeConfirmed = await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.TTS_NOTICE
        );

        if (flag && noticeConfirmed === null) {
          Alert.alert(translate('notice'), translate('ttsAlertText'), [
            {
              text: translate('doNotShowAgain'),
              style: 'cancel',
              onPress: async (): Promise<void> => {
                try {
                  await AsyncStorage.setItem(
                    ASYNC_STORAGE_KEYS.TTS_NOTICE,
                    'true'
                  );
                } catch (error) {
                  console.error('Failed to persist TTS notice flag', error);
                  Alert.alert(
                    translate('errorTitle'),
                    translate('failedToSavePreference')
                  );
                }
              },
            },
            {
              text: 'OK',
            },
          ]);
        }

        await AsyncStorage.setItem(
          ASYNC_STORAGE_KEYS.SPEECH_ENABLED,
          flag ? 'true' : 'false'
        );
        setSpeechState((prev) => ({
          ...prev,
          enabled: flag,
        }));
      } catch (error) {
        console.error('Failed to toggle TTS setting', error);
        Alert.alert(
          translate('errorTitle'),
          translate('failedToSavePreference')
        );
      }
    },
    [setSpeechState]
  );

  const handleToggleBgTTS = useCallback(
    async (flag: boolean) => {
      if (isClip()) {
        Alert.alert(translate('notice'), translate('bgTtsAppClipAlertText'));
        return;
      }

      try {
        const noticeConfirmed = await AsyncStorage.getItem(
          ASYNC_STORAGE_KEYS.BG_TTS_NOTICE
        );

        if (flag && noticeConfirmed === null) {
          Alert.alert(translate('notice'), translate('bgTtsAlertText'), [
            {
              text: translate('doNotShowAgain'),
              style: 'cancel',
              onPress: async (): Promise<void> => {
                try {
                  await AsyncStorage.setItem(
                    ASYNC_STORAGE_KEYS.BG_TTS_NOTICE,
                    'true'
                  );
                } catch (error) {
                  console.error('Failed to persist BG TTS notice flag', error);
                  Alert.alert(
                    translate('errorTitle'),
                    translate('failedToSavePreference')
                  );
                }
              },
            },
            {
              text: 'OK',
            },
          ]);
        }

        await AsyncStorage.setItem(
          ASYNC_STORAGE_KEYS.BG_TTS_ENABLED,
          flag ? 'true' : 'false'
        );
        setSpeechState((prev) => ({
          ...prev,
          backgroundEnabled: flag,
        }));
      } catch (error) {
        console.error('Failed to toggle background TTS setting', error);
        Alert.alert(
          translate('errorTitle'),
          translate('failedToSavePreference')
        );
      }
    },
    [setSpeechState]
  );

  const handleToggleTTSLanguage = useCallback(
    async (language: TTSLanguage) => {
      const isJapaneseOff = !ttsEnabledLanguages.includes('JA');
      const isEnglishOff = !ttsEnabledLanguages.includes('EN');
      const isCurrentEnabled = ttsEnabledLanguages.includes(language);
      const shouldDisableJapanese =
        language === 'JA' && isCurrentEnabled && isEnglishOff;
      const shouldDisableEnglish =
        language === 'EN' && isCurrentEnabled && isJapaneseOff;

      if (shouldDisableJapanese || shouldDisableEnglish) {
        return;
      }

      const toggledLanguages = ttsEnabledLanguages.includes(language)
        ? ttsEnabledLanguages.filter((lang) => lang !== language)
        : [...ttsEnabledLanguages, language];
      const normalizedLanguages: Array<'JA' | 'EN'> = [
        ...(toggledLanguages.includes('JA') ? (['JA'] as const) : []),
        ...(toggledLanguages.includes('EN') ? (['EN'] as const) : []),
      ];

      setSpeechState((prev) => ({
        ...prev,
        ttsEnabledLanguages: normalizedLanguages,
      }));

      try {
        await AsyncStorage.setItem(
          ASYNC_STORAGE_KEYS.TTS_ENABLED_LANGUAGES,
          JSON.stringify(normalizedLanguages)
        );
      } catch (error) {
        console.error('Failed to save TTS enabled languages:', error);
        Alert.alert(
          translate('errorTitle'),
          translate('failedToSavePreference')
        );
      }
    },
    [setSpeechState, ttsEnabledLanguages]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SettingItem; index: number }) => {
      const state = (() => {
        switch (item.id) {
          case 'enable_tts':
            return speechEnabled;
          case 'enable_bg_tts':
            return backgroundEnabled;
          default:
            return false;
        }
      })();

      const onToggle = () => {
        switch (item.id) {
          case 'enable_tts':
            handleToggleTTS(!speechEnabled);
            break;
          case 'enable_bg_tts':
            handleToggleBgTTS(!backgroundEnabled);
            break;
        }
      };

      return (
        <SettingsItem
          item={item}
          isFirst={index === 0}
          isLast={index === SETTING_ITEMS.length - 1}
          onToggle={onToggle}
          state={item.id === 'enable_bg_tts' && !speechEnabled ? false : state}
          disabled={item.id === 'enable_bg_tts' && !speechEnabled}
        />
      );
    },
    [
      handleToggleTTS,
      handleToggleBgTTS,
      speechEnabled,
      backgroundEnabled,
      SETTING_ITEMS.length,
    ]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.setValue(e.nativeEvent.contentOffset.y);
    },
    [scrollY]
  );

  return (
    <>
      <View style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <Animated.FlatList
          data={SETTING_ITEMS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            headerHeight
              ? { marginTop: headerHeight, paddingBottom: headerHeight }
              : null,
          ]}
          renderItem={renderItem}
          onScroll={handleScroll}
          ListFooterComponent={() => (
            <>
              <View style={{ marginTop: 16 }}>
                {TTS_LANGUAGE_ITEMS.map((item, index) => {
                  const state = ttsEnabledLanguages.includes(item.id);
                  const disabled =
                    !speechEnabled ||
                    (item.id === 'JA' &&
                      state &&
                      !ttsEnabledLanguages.includes('EN')) ||
                    (item.id === 'EN' &&
                      state &&
                      !ttsEnabledLanguages.includes('JA'));

                  return (
                    <SettingsItem
                      key={item.id}
                      item={item}
                      isFirst={index === 0}
                      isLast={index === TTS_LANGUAGE_ITEMS.length - 1}
                      onToggle={() => handleToggleTTSLanguage(item.id)}
                      state={state}
                      disabled={disabled}
                    />
                  );
                })}
              </View>
              <Typography
                style={{
                  marginTop: 16,
                  textAlign: 'center',
                  color: '#8B8B8B',
                }}
              >
                {translate('requireJapaneseOrEnglish')}
              </Typography>
              <Button
                style={{ width: 128, alignSelf: 'center', marginTop: 32 }}
                textStyle={{ fontWeight: 'bold' }}
                onPress={() => navigation.goBack()}
              >
                OK
              </Button>
            </>
          )}
        />
      </View>
      <SettingsHeader
        title={translate('autoAnnounce')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
    </>
  );
};

export default React.memo(TTSSettingsScreen);
