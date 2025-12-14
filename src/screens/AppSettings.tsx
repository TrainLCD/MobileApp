import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { lighten } from 'polished';
import React, { useCallback, useMemo, useState } from 'react';
import type { SectionBase, SectionListRenderItemInfo } from 'react-native';
import { SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { isClip } from 'react-native-app-clip';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardChevron } from '~/components/CardChevron';
import { Heading } from '~/components/Heading';
import { SettingsHeader } from '~/components/SettingsHeader';
import Typography from '~/components/Typography';
import { isDevApp } from '~/utils/isDevApp';
import FooterTabBar from '../components/FooterTabBar';
import { useThemeStore } from '../hooks';
import { APP_THEME } from '../models/Theme';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';

const SETTING_ITEM_ID_MAP = {
  personalize_theme: 'personalize_theme',
  personalize_tts: 'personalize_tts',
  personalize_languages: 'personalize_languages',
  developer_tuning: 'developer_tuning',
} as const;

type SettingItemId = keyof typeof SETTING_ITEM_ID_MAP;

type SettingsSectionData = {
  id: SettingItemId;
  title: string;
  color: string;
  onPress?: () => void;
};

interface SettingsSection extends SectionBase<SettingsSectionData> {
  key: string;
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, flex: 1 },
  screenBg: {
    backgroundColor: '#FAFAFA',
  },
  listContainerStyle: {
    flex: 1,
    marginHorizontal: 24,
  },
  betaNotice: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 32,
  },
});

const SettingsItem = ({
  item,
  isFirst,
  isLast,
  onPress,
}: {
  item: SettingsSectionData;
  isFirst: boolean;
  isLast: boolean;
  onPress?: () => void;
}) => {
  const iconName = useMemo(() => {
    switch (item.id) {
      case 'personalize_theme':
        return 'color-palette';
      case 'personalize_tts':
        return 'volume-high';
      case 'personalize_languages':
        return 'globe';
      default:
        return 'settings';
    }
  }, [item.id]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderTopLeftRadius: isFirst ? 12 : 0,
        borderTopRightRadius: isFirst ? 12 : 0,
        borderBottomLeftRadius: isLast ? 12 : 0,
        borderBottomRightRadius: isLast ? 12 : 0,
        marginBottom: isLast ? 32 : 0,
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 44,
            height: 44,
            backgroundColor: item.color,
            marginRight: 16,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={[item.color, lighten(0.1, item.color)]}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name={iconName} size={24} color="white" />
          </LinearGradient>
        </View>
        <Typography style={{ fontSize: 21, fontWeight: 'bold' }}>
          {item.title}
        </Typography>
      </View>

      <CardChevron stroke="black" />
    </TouchableOpacity>
  );
};

const AnimatedSelectionList = Animated.createAnimatedComponent(
  SectionList<SettingsSectionData, SettingsSection>
);

const AppSettingsScreen: React.FC = () => {
  const [nowHeaderHeight, setNowHeaderHeight] = useState(0);

  const scrollY = useSharedValue(0);

  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const navigation = useNavigation();

  const toThemeSettings = () => navigation.navigate('ThemeSettings' as never);
  const toTTSSettings = () => navigation.navigate('TTSSettings' as never);
  const toEnabledLanguagesSettings = () =>
    navigation.navigate('EnabledLanguagesSettings' as never);
  const toTuning = () => navigation.navigate('TuningSettings' as never);

  const SETTINGS_SECTIONS: SettingsSection[] = [
    {
      key: 'personalize',
      data: [
        {
          id: SETTING_ITEM_ID_MAP.personalize_theme,
          title: translate('selectThemeTitle'),
          color: '#FF9500',
          onPress: toThemeSettings,
        },
        {
          id: SETTING_ITEM_ID_MAP.personalize_tts,
          title: translate('autoAnnounce'),
          color: '#34C759',
          onPress: toTTSSettings,
        },
        {
          id: SETTING_ITEM_ID_MAP.personalize_languages,
          title: translate('selectLanguagesTitle'),
          color: '#007AFF',
          onPress: toEnabledLanguagesSettings,
        },
      ].filter((dat) =>
        isClip() ? dat.id !== SETTING_ITEM_ID_MAP.personalize_tts : true
      ), // Remove TTS setting in App Clip
    },
    {
      key: 'forDevelopers',
      data: isDevApp
        ? [
            {
              id: SETTING_ITEM_ID_MAP.developer_tuning,
              title: translate('tuning'),
              color: '#5856D6',
              onPress: toTuning,
            },
          ]
        : ([] as SettingsSectionData[]),
    },
  ] as const;

  const renderItem = useCallback(
    ({
      item,
      index,
      section,
    }: SectionListRenderItemInfo<SettingsSectionData, SettingsSection>) => (
      <SettingsItem
        item={item}
        isFirst={index === 0}
        isLast={index === section.data.length - 1}
        onPress={item.onPress}
      />
    ),
    []
  );
  const keyExtractor = useCallback(
    (section: SettingsSectionData) => `key-${section.id}`,
    []
  );

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const renderSectionHeader = useCallback(
    (info: { section: SettingsSection }) => (
      <Heading style={{ marginBottom: 24, fontSize: 21 }}>
        {translate(info.section.key ?? '')}
      </Heading>
    ),
    []
  );

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <AnimatedSelectionList
          style={StyleSheet.absoluteFill}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.listContainerStyle,
            nowHeaderHeight ? { paddingTop: nowHeaderHeight } : null,
          ]}
          renderSectionHeader={renderSectionHeader}
          sections={SETTINGS_SECTIONS}
          ListFooterComponent={() => (
            <Typography style={styles.betaNotice}>
              {isDevApp ? translate('canaryNotice') : translate('betaNotice')}
            </Typography>
          )}
        />
      </SafeAreaView>
      <SettingsHeader
        onLayout={(e) => setNowHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
    </>
  );
};

export default React.memo(AppSettingsScreen);
