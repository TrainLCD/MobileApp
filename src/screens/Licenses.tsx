import { useActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Linking,
  Platform,
  Animated as RNAnimated,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Button from '~/components/Button';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import Typography from '~/components/Typography';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { isDevApp } from '~/utils/isDevApp';

const LICENSE_MAP = {
  ekidata_jp: 'ekidata_jp',
  toei: 'toei',
  firebase: 'firebase',
  rxjs: 'rxjs',
  roboto: 'roboto',
  other_oss: 'other_oss',
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
const APACHE_2_URL = 'https://www.apache.org/licenses/LICENSE-2.0';
const MIT_URL = 'https://opensource.org/licenses/MIT';

const getLicenseInfo = (
  license: string
): { url: string; name: string } | null => {
  if (license.includes('Apache')) {
    return { url: APACHE_2_URL, name: 'Apache License 2.0' };
  }
  if (license.includes('MIT')) {
    return { url: MIT_URL, name: 'MIT License' };
  }
  if (license.includes('CC BY')) {
    return { url: CC_BY_URL, name: 'CC BY 4.0' };
  }
  return null;
};

const Licenses: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);

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
            devOnly: false,
          },
          {
            id: 'firebase',
            title: 'Firebase',
            icon: '🔥',
            href: 'https://firebase.google.com/',
            license: 'Apache License 2.0',
            devOnly: false,
          },
          {
            id: 'rxjs',
            title: 'RxJS',
            icon: '⚡',
            href: 'https://rxjs.dev/',
            license: 'Apache License 2.0',
            devOnly: false,
          },
          {
            id: 'roboto',
            title: 'Roboto Font',
            icon: '🔤',
            href: 'https://fonts.google.com/specimen/Roboto',
            license: 'Apache License 2.0',
            devOnly: false,
          },
          {
            id: 'other_oss',
            title: translate('otherOss'),
            icon: '📦',
            href: MIT_URL,
            license: 'MIT License',
            devOnly: false,
          },
        ] as const
      ).filter((it) => (isDevApp ? true : !it.devOnly)),
    []
  );

  const handlePressLicenseItem = useCallback(
    (item: LicenseItem) => {
      const licenseInfo = item.license ? getLicenseInfo(item.license) : null;

      if (licenseInfo) {
        const options = [item.title, licenseInfo.name, translate('cancel')];
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
              Linking.openURL(licenseInfo.url);
            }
          }
        );
      } else {
        Linking.openURL(item.href);
      }
    },
    [showActionSheetWithOptions]
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

  const handleScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      scrollY.setValue(e.nativeEvent.contentOffset.y);
    },
    [scrollY]
  );

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
