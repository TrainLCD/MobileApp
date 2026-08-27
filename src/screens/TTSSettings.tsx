import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
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
import { useRemoteTTSEnabled } from '~/hooks/useRemoteTTSEnabled';
import { useTTSFeatureEnabled } from '~/hooks/useTTSFeatureEnabled';
import {
  TTS_SPEED_PREFERENCE,
  type TTSSpeedPreference,
} from '~/models/TTSSpeed';
import { useAppColors } from '~/providers/AppColorsProvider';
import speechState, { ttsSpeedPreferenceAtom } from '~/store/atoms/speech';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';
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

type TTSSpeedSettingItem = {
  id: TTSSpeedPreference;
  title: string;
};

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
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
  const colors = useAppColors();

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
        backgroundColor: isLEDTheme ? '#333' : colors.card,
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

// 速度はトグルではなく三択なので、配色設定（ColorSchemeSettings）と同じく
// radio ロールで「使用中 / 設定」を出し分ける。
const SpeedSettingsItem = ({
  item,
  isFirst,
  isLast,
  state,
  disabled,
  onSelect,
}: {
  item: TTSSpeedSettingItem;
  isFirst: boolean;
  isLast: boolean;
  state: boolean;
  disabled: boolean;
  onSelect: () => void;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={item.title}
      accessibilityState={{ checked: state, disabled }}
      onPress={onSelect}
      disabled={disabled}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: isLEDTheme ? '#333' : colors.card,
        borderTopLeftRadius: isFirst && !isLEDTheme ? 12 : 0,
        borderTopRightRadius: isFirst && !isLEDTheme ? 12 : 0,
        borderBottomLeftRadius: isLast && !isLEDTheme ? 12 : 0,
        borderBottomRightRadius: isLast && !isLEDTheme ? 12 : 0,
      }}
    >
      <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
        {item.title}
      </Typography>

      <StatePanel
        state={state}
        disabled={disabled}
        onText={translate('inUse')}
        offText={translate('select')}
      />
    </Pressable>
  );
};

const ListFooter = ({
  ttsLanguageItems,
  ttsEnabledLanguages,
  ttsSpeedItems,
  ttsSpeedPreference,
  remoteTTSEnabled,
  speechEnabled,
  ttsFeatureEnabled,
  onToggleTTSLanguage,
  onSelectTTSSpeed,
  onPressServiceStatus,
  onPressOK,
}: {
  ttsLanguageItems: TTSLanguageSettingItem[];
  ttsEnabledLanguages: TTSLanguage[];
  ttsSpeedItems: TTSSpeedSettingItem[];
  ttsSpeedPreference: TTSSpeedPreference;
  remoteTTSEnabled: boolean;
  speechEnabled: boolean;
  ttsFeatureEnabled: boolean;
  onToggleTTSLanguage: (language: TTSLanguage) => void;
  onSelectTTSSpeed: (preference: TTSSpeedPreference) => void;
  onPressServiceStatus: () => void;
  onPressOK: () => void;
}) => {
  const colors = useAppColors();

  return (
    <>
      <View style={{ marginTop: 16 }}>
        {ttsLanguageItems.map((item, index) => {
          const state = ttsEnabledLanguages.includes(item.id);
          const disabled =
            !speechEnabled ||
            (item.id === 'JA' &&
              state &&
              !ttsEnabledLanguages.includes('EN')) ||
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
          color: colors.secondaryText,
        }}
      >
        {translate('requireJapaneseOrEnglish')}
      </Typography>
      {/* 速度指定が効くのはリモート合成の経路だけ。端末内蔵TTSで読み上げる構成では
        端末の読み上げ速度設定が使われるため、選ばせても反映されず誤解を招く */}
      {remoteTTSEnabled ? (
        <>
          <Typography
            style={{
              marginTop: 24,
              marginBottom: 8,
              fontSize: 18,
              fontWeight: 'bold',
            }}
          >
            {translate('ttsSpeedTitle')}
          </Typography>
          {ttsSpeedItems.map((item, index) => (
            <SpeedSettingsItem
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === ttsSpeedItems.length - 1}
              onSelect={() => onSelectTTSSpeed(item.id)}
              state={ttsSpeedPreference === item.id}
              disabled={!speechEnabled}
            />
          ))}
          <Typography
            style={{
              marginTop: 16,
              textAlign: 'center',
              color: colors.secondaryText,
            }}
          >
            {translate('ttsSpeedDescription')}
          </Typography>
        </>
      ) : null}
      {/* iOSはリモート合成のため品質案内は不要。案内文はAndroidのTTSエンジン設定を
        指す内容なので、該当する設定を持たないweb等でも出さない */}
      {Platform.OS === 'android' ? (
        <Typography
          style={{
            marginTop: 8,
            textAlign: 'center',
            color: colors.secondaryText,
          }}
        >
          {translate('ttsVoiceQualityNoticeAndroid')}
        </Typography>
      ) : null}
      {!ttsFeatureEnabled ? (
        <>
          <Typography
            style={{
              marginTop: 16,
              textAlign: 'center',
              color: colors.secondaryText,
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
              color: colors.accent,
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
};

const TTSSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const [
    { enabled: speechEnabled, backgroundEnabled, ttsEnabledLanguages },
    setSpeechState,
  ] = useAtom(speechState);
  const [ttsSpeedPreference, setTTSSpeedPreference] = useAtom(
    ttsSpeedPreferenceAtom
  );

  const navigation = useNavigation();

  // Remote Config のキルスイッチ。起動時の非同期取得完了後に値が届いた場合も
  // 購読経由で再レンダーされ、トグルの無効化が確実に反映される。
  const ttsFeatureEnabled = useTTSFeatureEnabled();
  // 速度設定はリモート合成でのみ効くため、同じく購読して表示を切り替える。
  const remoteTTSEnabled = useRemoteTTSEnabled();

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

  const TTS_SPEED_ITEMS: TTSSpeedSettingItem[] = useMemo(
    () => [
      {
        id: TTS_SPEED_PREFERENCE.SLOW,
        title: translate('ttsSpeedSlow'),
      },
      {
        id: TTS_SPEED_PREFERENCE.NORMAL,
        title: translate('ttsSpeedNormal'),
      },
      {
        id: TTS_SPEED_PREFERENCE.FAST,
        title: translate('ttsSpeedFast'),
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
          // iOSはリモート合成（通信不可時のみ内蔵TTSへフォールバック）で経路が
          // 異なるため注意文を分ける。Androidとwebはいずれも端末・ブラウザの
          // 読み上げ音声を使うため、同じ注意文を共有する（web専用キーは設けない）
          const alertTextKey =
            Platform.OS === 'ios' ? 'ttsAlertTextIOS' : 'ttsAlertTextAndroid';

          showDialog(translate('notice'), translate(alertTextKey), [
            {
              text: translate('doNotShowAgain'),
              style: 'checkbox',
              onPress: (): void => {
                try {
                  storage.set(STORAGE_KEYS.TTS_NOTICE, 'true');
                } catch (error) {
                  console.error('Failed to persist TTS notice flag', error);
                  showDialog(
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
        showDialog(
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
        showDialog(translate('notice'), translate('bgTtsAppClipAlertText'));
        return;
      }

      try {
        if (flag && !storage.contains(STORAGE_KEYS.BG_TTS_NOTICE)) {
          showDialog(translate('notice'), translate('bgTtsAlertText'), [
            {
              text: translate('doNotShowAgain'),
              style: 'checkbox',
              onPress: (): void => {
                try {
                  storage.set(STORAGE_KEYS.BG_TTS_NOTICE, 'true');
                } catch (error) {
                  console.error('Failed to persist BG TTS notice flag', error);
                  showDialog(
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
        showDialog(
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
        showDialog(
          translate('errorTitle'),
          translate('failedToSavePreference')
        );
      }
    },
    [setSpeechState, ttsEnabledLanguages]
  );

  const handleSelectTTSSpeed = useCallback(
    (preference: TTSSpeedPreference) => {
      setTTSSpeedPreference(preference);

      try {
        storage.set(STORAGE_KEYS.TTS_SPEED_PREFERENCE, preference);
      } catch (error) {
        console.error('Failed to save TTS speed preference:', error);
        showDialog(
          translate('errorTitle'),
          translate('failedToSavePreference')
        );
      }
    },
    [setTTSSpeedPreference]
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
      showDialog(translate('errorTitle'), translate('failedToOpenLink'));
    });
  }, []);

  const handleScroll = useRef(
    RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    })
  ).current;

  return (
    <>
      <View
        style={[
          styles.root,
          !isLEDTheme && { backgroundColor: colors.background },
        ]}
      >
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
              ttsSpeedItems={TTS_SPEED_ITEMS}
              ttsSpeedPreference={ttsSpeedPreference}
              remoteTTSEnabled={remoteTTSEnabled}
              speechEnabled={effectiveSpeechEnabled}
              ttsFeatureEnabled={ttsFeatureEnabled}
              onToggleTTSLanguage={handleToggleTTSLanguage}
              onSelectTTSSpeed={handleSelectTTSSpeed}
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
