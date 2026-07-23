import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  Linking,
  Platform,
  Pressable,
  Animated as RNAnimated,
  StyleSheet,
  View,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import Button from '~/components/Button';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import { StatePanel } from '~/components/ToggleButton';
import Typography from '~/components/Typography';
import { useTTSFeatureEnabled } from '~/hooks/useTTSFeatureEnabled';
import speechState from '~/store/atoms/speech';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { STATUS_URL, STORAGE_KEYS } from '../constants';
import { storage } from '../lib/storage';

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

const ListFooter = ({
  ttsLanguageItems,
  ttsEnabledLanguages,
  speechEnabled,
  ttsFeatureEnabled,
  onToggleTTSLanguage,
  onPressServiceStatus,
  onPressOK,
}: {
  ttsLanguageItems: TTSLanguageSettingItem[];
  ttsEnabledLanguages: TTSLanguage[];
  speechEnabled: boolean;
  ttsFeatureEnabled: boolean;
  onToggleTTSLanguage: (language: TTSLanguage) => void;
  onPressServiceStatus: () => void;
  onPressOK: () => void;
}) => (
  <>
    <View style={{ marginTop: 16 }}>
      {ttsLanguageItems.map((item, index) => {
        const state = ttsEnabledLanguages.includes(item.id);
        const disabled =
          !speechEnabled ||
          (item.id === 'JA' && state && !ttsEnabledLanguages.includes('EN')) ||
          (item.id === 'EN' && state && !ttsEnabledLanguages.includes('JA'));

        return (
          <SettingsItem
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === ttsLanguageItems.length - 1}
            onToggle={() => onToggleTTSLanguage(item.id)}
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
    <Typography
      style={{
        marginTop: 8,
        textAlign: 'center',
        color: '#8B8B8B',
      }}
    >
      {translate(
        Platform.OS === 'ios'
          ? 'ttsVoiceQualityNoticeIOS'
          : 'ttsVoiceQualityNoticeAndroid'
      )}
    </Typography>
    {!ttsFeatureEnabled ? (
      <>
        <Typography
          style={{
            marginTop: 16,
            textAlign: 'center',
            color: '#8B8B8B',
          }}
        >
          {translate('ttsFeatureDisabledText')}
        </Typography>
        <Typography
          accessibilityRole="link"
          onPress={onPressServiceStatus}
          style={{
            marginTop: 8,
            textAlign: 'center',
            color: '#008ffe',
            textDecorationLine: 'underline',
          }}
        >
          {translate('serviceStatus')}
        </Typography>
      </>
    ) : null}
    <Button
      style={{ width: 128, alignSelf: 'center', marginTop: 32 }}
      textStyle={{ fontWeight: 'bold' }}
      onPress={onPressOK}
    >
      OK
    </Button>
  </>
);

const TTSSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const [
    { enabled: speechEnabled, backgroundEnabled, ttsEnabledLanguages },
    setSpeechState,
  ] = useAtom(speechState);

  const navigation = useNavigation();

  // Remote Config のキルスイッチ。起動時の非同期取得完了後に値が届いた場合も
  // 購読経由で再レンダーされ、トグルの無効化が確実に反映される。
  const ttsFeatureEnabled = useTTSFeatureEnabled();

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
    (flag: boolean) => {
      if (!ttsFeatureEnabled) {
        return;
      }

      try {
        if (flag && !storage.contains(STORAGE_KEYS.TTS_NOTICE)) {
          Alert.alert(translate('notice'), translate('ttsAlertText'), [
            {
              text: translate('doNotShowAgain'),
              style: 'cancel',
              onPress: (): void => {
                try {
                  storage.set(STORAGE_KEYS.TTS_NOTICE, 'true');
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

        storage.set(STORAGE_KEYS.SPEECH_ENABLED, flag ? 'true' : 'false');
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
    [setSpeechState, ttsFeatureEnabled]
  );

  const handleToggleBgTTS = useCallback(
    (flag: boolean) => {
      if (isClip()) {
        Alert.alert(translate('notice'), translate('bgTtsAppClipAlertText'));
        return;
      }

      try {
        if (flag && !storage.contains(STORAGE_KEYS.BG_TTS_NOTICE)) {
          Alert.alert(translate('notice'), translate('bgTtsAlertText'), [
            {
              text: translate('doNotShowAgain'),
              style: 'cancel',
              onPress: (): void => {
                try {
                  storage.set(STORAGE_KEYS.BG_TTS_NOTICE, 'true');
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

        storage.set(STORAGE_KEYS.BG_TTS_ENABLED, flag ? 'true' : 'false');
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
    (language: TTSLanguage) => {
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
        storage.set(
          STORAGE_KEYS.TTS_ENABLED_LANGUAGES,
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

  // キルスイッチOFF時は保存済みのユーザー設定を保持したまま、表示上はOFF・操作不可にする。
  const effectiveSpeechEnabled = speechEnabled && ttsFeatureEnabled;

  const renderItem = useCallback(
    ({ item, index }: { item: SettingItem; index: number }) => {
      const state = (() => {
        switch (item.id) {
          case 'enable_tts':
            return effectiveSpeechEnabled;
          case 'enable_bg_tts':
            return effectiveSpeechEnabled ? backgroundEnabled : false;
          default:
            return false;
        }
      })();

      const disabled = (() => {
        switch (item.id) {
          case 'enable_tts':
            return !ttsFeatureEnabled;
          case 'enable_bg_tts':
            return !effectiveSpeechEnabled;
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
          state={state}
          disabled={disabled}
        />
      );
    },
    [
      handleToggleTTS,
      handleToggleBgTTS,
      speechEnabled,
      effectiveSpeechEnabled,
      backgroundEnabled,
      ttsFeatureEnabled,
      SETTING_ITEMS.length,
    ]
  );

  const handleServiceStatusPress = useCallback(() => {
    Linking.openURL(STATUS_URL).catch((error) => {
      console.error('Failed to open service status page', error);
      Alert.alert(translate('errorTitle'), translate('failedToOpenLink'));
    });
  }, []);

  const handleScroll = useRef(
    RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    })
  ).current;

  return (
    <>
      <View style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <RNAnimated.FlatList
          data={SETTING_ITEMS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            headerHeight
              ? { marginTop: headerHeight, paddingBottom: headerHeight }
              : null,
          ]}
          renderItem={renderItem}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListFooterComponent={
            <ListFooter
              ttsLanguageItems={TTS_LANGUAGE_ITEMS}
              ttsEnabledLanguages={ttsEnabledLanguages}
              speechEnabled={effectiveSpeechEnabled}
              ttsFeatureEnabled={ttsFeatureEnabled}
              onToggleTTSLanguage={handleToggleTTSLanguage}
              onPressServiceStatus={handleServiceStatusPress}
              onPressOK={() => navigation.goBack()}
            />
          }
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
