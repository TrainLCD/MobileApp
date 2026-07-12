import { useActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';
import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Linking,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
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

type LicenseId =
  | 'ekidata_jp'
  | 'toei'
  | 'tokyo_metro'
  | 'mir'
  | 'tama_monorail'
  | 'twr'
  | 'kyoto_city'
  | 'yokohama_city'
  | 'seibu_bus'
  | 'keio_bus'
  | 'tokyu_bus'
  | 'hakodate_city'
  | 'roboto'
  | 'other_oss';

type LicenseItem = {
  id: LicenseId;
  title: string;
  icon: string;
  href: string;
  devOnly: boolean;
} & (
  | { license?: undefined; licenseUrl?: undefined }
  | { license: string; licenseUrl: string }
);

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
const ODPT_BASIC_LICENSE_URL =
  'https://developer.odpt.org/terms/data_basic_license.html';
// 公共交通オープンデータセンターのGTFSデータ利用規約 (ckan.odpt.org の函館市電データセットが指定するライセンス)
const GTFS_RUL_URL = 'https://gtfs-jp.org/GTFS-RUL(ODPT).pdf';

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
            licenseUrl: CC_BY_URL,
            devOnly: false,
          },
          {
            id: 'tokyo_metro',
            title: translate('tokyoMetro'),
            icon: '🚇',
            href: 'https://www.tokyometro.jp/',
            license: translate('odptBasicLicense'),
            licenseUrl: ODPT_BASIC_LICENSE_URL,
            devOnly: false,
          },
          {
            id: 'mir',
            title: translate('mir'),
            icon: '🚃',
            href: 'https://www.mir.co.jp/',
            license: translate('odptBasicLicense'),
            licenseUrl: ODPT_BASIC_LICENSE_URL,
            devOnly: false,
          },
          {
            id: 'tama_monorail',
            title: translate('tamaMonorail'),
            icon: '🚝',
            href: 'https://www.tama-monorail.co.jp/',
            license: translate('odptBasicLicense'),
            licenseUrl: ODPT_BASIC_LICENSE_URL,
            devOnly: false,
          },
          {
            id: 'twr',
            title: translate('twr'),
            icon: '🚃',
            href: 'https://www.twr.co.jp/',
            license: translate('odptBasicLicense'),
            licenseUrl: ODPT_BASIC_LICENSE_URL,
            devOnly: false,
          },
          {
            id: 'kyoto_city',
            title: translate('kyotoCity'),
            icon: '🚇',
            href: 'https://www.city.kyoto.lg.jp/kotsu/',
            license: translate('odptBasicLicense'),
            licenseUrl: ODPT_BASIC_LICENSE_URL,
            devOnly: false,
          },
          {
            id: 'yokohama_city',
            title: translate('yokohamaCity'),
            icon: '🚇',
            href: 'https://www.city.yokohama.lg.jp/kotsu/',
            license: translate('odptBasicLicense'),
            licenseUrl: ODPT_BASIC_LICENSE_URL,
            devOnly: false,
          },
          {
            id: 'seibu_bus',
            title: translate('seibuBus'),
            icon: '🚌',
            href: 'https://www.seibubus.co.jp/',
            license: translate('odptBasicLicense'),
            licenseUrl: ODPT_BASIC_LICENSE_URL,
            devOnly: false,
          },
          {
            id: 'keio_bus',
            title: translate('keioBus'),
            icon: '🚌',
            href: 'https://www.keio-bus.com/',
            license: translate('odptBasicLicense'),
            licenseUrl: ODPT_BASIC_LICENSE_URL,
            devOnly: false,
          },
          {
            id: 'tokyu_bus',
            title: translate('tokyuBus'),
            icon: '🚌',
            href: 'https://www.tokyubus.co.jp/',
            license: translate('odptBasicLicense'),
            licenseUrl: ODPT_BASIC_LICENSE_URL,
            devOnly: false,
          },
          {
            id: 'hakodate_city',
            title: translate('hakodateCity'),
            icon: '🚋',
            href: 'https://www.city.hakodate.hokkaido.jp/tram/',
            license: translate('odptGtfs'),
            licenseUrl: GTFS_RUL_URL,
            devOnly: false,
          },
          {
            id: 'roboto',
            title: 'Roboto Font',
            icon: '🔤',
            href: 'https://fonts.google.com/specimen/Roboto',
            license: 'Apache License 2.0',
            licenseUrl: APACHE_2_URL,
            devOnly: false,
          },
          {
            id: 'other_oss',
            title: translate('otherOss'),
            icon: '📦',
            href: MIT_URL,
            license: 'MIT License',
            licenseUrl: MIT_URL,
            devOnly: false,
          },
        ] as const
      ).filter((it) => (isDevApp ? true : !it.devOnly)),
    []
  );

  const handlePressLicenseItem = useCallback(
    (item: LicenseItem) => {
      const { license, licenseUrl } = item;

      if (license && licenseUrl) {
        const options = [item.title, license, translate('cancel')];
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
              Linking.openURL(licenseUrl);
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
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
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
            <>
              <Typography
                style={[
                  { marginTop: 24, fontSize: 14, lineHeight: 21 },
                  !isLEDTheme && { color: '#666' },
                ]}
              >
                {translate('odptDisclaimer')}
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
        title={translate('license')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
    </>
  );
};

export default React.memo(Licenses);
