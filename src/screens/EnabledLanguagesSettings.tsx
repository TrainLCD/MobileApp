import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, Link, useNavigation } from '@react-navigation/native';
import { useAtom } from 'jotai';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import Button from '~/components/Button';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import { StatePanel } from '~/components/ToggleButton';
import Typography from '~/components/Typography';
import { APP_THEME } from '~/models/Theme';
import navigationState from '~/store/atoms/navigation';
import { translate } from '~/translation';
import { isDevApp } from '~/utils/isDevApp';
import { ASYNC_STORAGE_KEYS, type AvailableLanguage } from '../constants';
import { useThemeStore } from '../hooks';

type SettingItem = {
  id: 'japanese' | 'english' | 'chinese' | 'korean';
  title: string;
  nationalFlag: string;
  disabled?: boolean;
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
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

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
      <View style={{ marginRight: 12 }}>
        <Typography style={{ fontSize: 21 }}>{item.nationalFlag}</Typography>
      </View>
      <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
        {item.title}
      </Typography>

      <StatePanel state={disabled ? true : state} disabled={disabled} />
    </Pressable>
  );
};

const EnabledLanguagesSettings: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useSharedValue(0);

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const [{ enabledLanguages }, setNavigation] = useAtom(navigationState);

  const navigation = useNavigation();

  const SETTING_ITEMS: SettingItem[] = [
    {
      id: 'japanese',
      title: translate('japanese'),
      nationalFlag: '🇯🇵',
      disabled: true,
    },
    {
      id: 'english',
      title: translate('english'),
      nationalFlag: '🇺🇸',
    },
    {
      id: 'chinese',
      title: translate('chinese'),
      nationalFlag: '🇨🇳',
    },
    {
      id: 'korean',
      title: translate('korean'),
      nationalFlag: '🇰🇷',
    },
  ] as const;

  const handleToggleLanguage = useCallback(
    async (language: AvailableLanguage) => {
      const newEnabledLanguages = enabledLanguages.includes(language)
        ? enabledLanguages.filter((lang) => lang !== language)
        : [...enabledLanguages, language];

      setNavigation((prev) => ({
        ...prev,
        enabledLanguages: newEnabledLanguages,
      }));

      try {
        await AsyncStorage.setItem(
          ASYNC_STORAGE_KEYS.ENABLED_LANGUAGES,
          JSON.stringify(newEnabledLanguages)
        );
      } catch (error) {
        console.error('Failed to save enabled languages:', error);
        Alert.alert(translate('error'), translate('failedToSaveSettings'));
      }
    },
    [enabledLanguages, setNavigation]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SettingItem; index: number }) => {
      const state = (() => {
        switch (item.id) {
          case 'japanese':
            return enabledLanguages.includes('JA');
          case 'english':
            return enabledLanguages.includes('EN');
          case 'chinese':
            return enabledLanguages.includes('ZH');
          case 'korean':
            return enabledLanguages.includes('KO');
          default:
            return false;
        }
      })();

      const onToggle = () => {
        switch (item.id) {
          case 'japanese':
            handleToggleLanguage('JA');
            break;
          case 'english':
            handleToggleLanguage('EN');
            break;
          case 'chinese':
            handleToggleLanguage('ZH');
            break;
          case 'korean':
            handleToggleLanguage('KO');
            break;
          default:
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
          disabled={item.disabled ?? false}
        />
      );
    },
    [enabledLanguages, handleToggleLanguage, SETTING_ITEMS.length]
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
            headerHeight ? { marginTop: headerHeight } : null,
          ]}
          renderItem={renderItem}
          onScroll={handleScroll}
          ListFooterComponent={() => (
            <>
              <Button
                style={{ width: 128, alignSelf: 'center', marginTop: 32 }}
                textStyle={{ fontWeight: 'bold' }}
                onPress={() => navigation.goBack()}
              >
                OK
              </Button>

              {/* NOTE: 現状未実装のため本番では非表示 */}
              {isDevApp ? (
                <View
                  style={{
                    marginTop: 32,
                  }}
                >
                  <Link
                    style={{
                      textAlign: 'center',
                      fontWeight: 'bold',
                    }}
                    action={CommonActions.navigate('TTSSettings' as never)}
                  >
                    自動アナウンスの言語設定
                  </Link>
                </View>
              ) : null}
            </>
          )}
        />
      </View>
      <SettingsHeader
        title={translate('displayLanguages')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
    </>
  );
};

export default React.memo(EnabledLanguagesSettings);
