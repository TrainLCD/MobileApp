import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
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
  id: 'enable_tts' | 'enable_bg_tts';
  title: string;
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
      <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
        {item.title}
      </Typography>

      <StatePanel state={disabled ? false : state} disabled={disabled} />
    </Pressable>
  );
};

const TTSSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useSharedValue(0);

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const [{ enabled: speechEnabled, backgroundEnabled }, setSpeechState] =
    useAtom(speechState);

  const navigation = useNavigation();

  // Android 16 (API 36) ではバックグラウンド音声再生が制限されるため無効化
  const isAndroid16OrHigher =
    Platform.OS === 'android' && Number(Platform.Version) >= 36;

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
          state={state}
          disabled={
            item.id === 'enable_bg_tts' &&
            (!speechEnabled || isAndroid16OrHigher)
          }
        />
      );
    },
    [
      handleToggleTTS,
      handleToggleBgTTS,
      speechEnabled,
      backgroundEnabled,
      isAndroid16OrHigher,
      SETTING_ITEMS.length,
    ]
  );

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

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
              {isAndroid16OrHigher ? (
                <Typography
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: isLEDTheme ? '#ccc' : '#666',
                  }}
                >
                  {translate('bgTtsUnavailableOnAndroid16')}
                </Typography>
              ) : null}
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
