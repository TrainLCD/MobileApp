import { useActionSheet } from '@expo/react-native-action-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import Button from '~/components/Button';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import Typography from '~/components/Typography';
import navigationState from '~/store/atoms/navigation';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { isDevApp } from '~/utils/isDevApp';
import { ASYNC_STORAGE_KEYS, type AvailableLanguage } from '../constants';

const LICENSE_MAP = {
  ekidata_jp: 'ekidata_jp',
  toei: 'toei',
} as const;

type LicenseItem = {
  id: keyof typeof LICENSE_MAP;
  title: string;
  icon: string;
  href: string;
  devOnly: boolean;
  license?: string;
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

const LicenseHolder = ({
  item,
  isFirst,
  isLast,
  onPress,
}: {
  item: LicenseItem;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <TouchableOpacity
      onPress={onPress}
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
        <Typography style={{ fontSize: 21 }}>{item.icon}</Typography>
      </View>
      <View style={{ flex: 1 }}>
        <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
          {item.title}
        </Typography>
        <Typography
          style={{
            marginTop: 4,
            color: '#666',
          }}
        >
          {item.href}
        </Typography>
        {item.license ? (
          <Typography style={{ color: '#666', marginTop: 2 }}>
            {item.license}
          </Typography>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const CC_BY_URL = 'https://creativecommons.org/licenses/by/4.0/';

const Licenses: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useSharedValue(0);

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const [{ enabledLanguages }, setNavigation] = useAtom(navigationState);

  const navigation = useNavigation();
  const { showActionSheetWithOptions } = useActionSheet();

  const LICENSE_ITEMS: LicenseItem[] = useMemo(
    () =>
      (
        [
          {
            id: 'ekidata_jp',
            title: translate('ekidatajp'),
            icon: '🚃',
            href: 'https://www.ekidata.jp/',
            devOnly: false,
          },
          {
            id: 'toei',
            title: translate('toei'),
            icon: '🚌',
            href: 'https://www.kotsu.metro.tokyo.jp/',
            license: translate('ccby'),
            devOnly: true,
          },
        ] as const
      ).filter((it) => (isDevApp ? true : !it.devOnly)),
    []
  );

  const handlePressLicenseItem = useCallback(
    (item: LicenseItem) => {
      if (item.id === 'toei') {
        const options = [translate('toei'), 'CC BY 4.0', translate('cancel')];
        const cancelButtonIndex = 2;

        showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex,
          },
          (selectedIndex) => {
            if (selectedIndex === 0) {
              Linking.openURL(item.href);
            } else if (selectedIndex === 1) {
              Linking.openURL(CC_BY_URL);
            }
          }
        );
      } else {
        Linking.openURL(item.href);
      }
    },
    [showActionSheetWithOptions]
  );

  const _handleToggleLanguage = useCallback(
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
        Alert.alert(
          translate('errorTitle'),
          translate('failedToSavePreference')
        );
      }
    },
    [enabledLanguages, setNavigation]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: LicenseItem; index: number }) => {
      return (
        <LicenseHolder
          item={item}
          isFirst={index === 0}
          isLast={index === LICENSE_ITEMS.length - 1}
          onPress={() => handlePressLicenseItem(item)}
        />
      );
    },
    [LICENSE_ITEMS.length, handlePressLicenseItem]
  );

  const keyExtractor = useCallback((item: LicenseItem) => item.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<LicenseItem> | null | undefined, index: number) => ({
      length: 76,
      offset: 76 * index,
      index,
    }),
    []
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
          data={LICENSE_ITEMS}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={[
            headerHeight
              ? { marginTop: headerHeight, paddingBottom: headerHeight }
              : null,
          ]}
          renderItem={renderItem}
          onScroll={handleScroll}
          ListFooterComponent={() => (
            <Button
              style={{ width: 128, alignSelf: 'center', marginTop: 32 }}
              textStyle={{ fontWeight: 'bold' }}
              onPress={() => navigation.goBack()}
            >
              OK
            </Button>
          )}
        />
      </View>
      <SettingsHeader
        title={translate('license')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
    </>
  );
};

export default React.memo(Licenses);
