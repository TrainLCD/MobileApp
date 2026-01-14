import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import { lighten } from 'polished';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { SectionBase, SectionListRenderItemInfo } from 'react-native';
import { SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { isClip } from 'react-native-app-clip';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { CardChevron } from '~/components/CardChevron';
import { Heading } from '~/components/Heading';
import { SettingsHeader } from '~/components/SettingsHeader';
import Typography from '~/components/Typography';
import WalkthroughOverlay from '~/components/WalkthroughOverlay';
import { useSettingsWalkthrough } from '~/hooks/useSettingsWalkthrough';
import { isDevApp } from '~/utils/isDevApp';
import FooterTabBar, { FOOTER_BASE_HEIGHT } from '../components/FooterTabBar';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';

const SETTING_ITEM_ID_MAP = {
  personalize_theme: 'personalize_theme',
  personalize_tts: 'personalize_tts',
  personalize_languages: 'personalize_languages',
  about_app_licenses: 'about_app_licenses',
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
    flexGrow: 1,
    marginHorizontal: 24,
    marginTop: 24,
  },
  betaNotice: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
});

type ItemLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const SettingsItem = React.forwardRef<
  View,
  {
    item: SettingsSectionData;
    isFirst: boolean;
    isLast: boolean;
    onPress?: () => void;
    onItemLayout?: (layout: ItemLayout) => void;
  }
>(({ item, isFirst, isLast, onPress, onItemLayout }, ref) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const viewRef = useRef<View>(null);

  const handleLayout = useCallback(() => {
    if (viewRef.current && onItemLayout) {
      viewRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          onItemLayout({ x, y, width, height });
        }
      );
    }
  }, [onItemLayout]);

  React.useImperativeHandle(ref, () => viewRef.current as View);

  const iconName = useMemo(() => {
    switch (item.id) {
      case 'personalize_theme':
        return 'color-palette';
      case 'personalize_tts':
        return 'volume-high';
      case 'personalize_languages':
        return 'globe';
      case 'about_app_licenses':
        return 'key';
      case 'developer_tuning':
        return 'settings';
      default:
        return 'help';
    }
  }, [item.id]);

  return (
    <View ref={viewRef} onLayout={handleLayout}>
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 16,
          backgroundColor: isLEDTheme ? '#333' : 'white',
          opacity: onPress ? 1 : 0.5,
          borderTopLeftRadius: isFirst && !isLEDTheme ? 12 : 0,
          borderTopRightRadius: isFirst && !isLEDTheme ? 12 : 0,
          borderBottomLeftRadius: isLast && !isLEDTheme ? 12 : 0,
          borderBottomRightRadius: isLast && !isLEDTheme ? 12 : 0,
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
              borderRadius: isLEDTheme ? 0 : 8,
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
    </View>
  );
});

const AnimatedSelectionList = Animated.createAnimatedComponent(
  SectionList<SettingsSectionData, SettingsSection>
);

const AppSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [themeItemLayout, setThemeItemLayout] = useState<ItemLayout | null>(
    null
  );
  const [ttsItemLayout, setTtsItemLayout] = useState<ItemLayout | null>(null);
  const [languagesItemLayout, setLanguagesItemLayout] =
    useState<ItemLayout | null>(null);

  const scrollY = useSharedValue(0);
  const { bottom: safeAreaBottom } = useSafeAreaInsets();

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const navigation = useNavigation();

  const {
    isWalkthroughActive,
    currentStepIndex,
    currentStepId,
    currentStep,
    totalSteps,
    nextStep,
    goToStep,
    skipWalkthrough,
    setSpotlightArea,
  } = useSettingsWalkthrough();

  useEffect(() => {
    if (currentStepId === 'settingsTheme' && themeItemLayout) {
      setSpotlightArea({
        x: themeItemLayout.x,
        y: themeItemLayout.y,
        width: themeItemLayout.width,
        height: themeItemLayout.height,
        borderRadius: 12,
      });
    }
  }, [currentStepId, themeItemLayout, setSpotlightArea]);

  useEffect(() => {
    if (currentStepId === 'settingsTts' && ttsItemLayout) {
      setSpotlightArea({
        x: ttsItemLayout.x,
        y: ttsItemLayout.y,
        width: ttsItemLayout.width,
        height: ttsItemLayout.height,
        borderRadius: 0,
      });
    }
  }, [currentStepId, ttsItemLayout, setSpotlightArea]);

  useEffect(() => {
    if (currentStepId === 'settingsLanguages' && languagesItemLayout) {
      setSpotlightArea({
        x: languagesItemLayout.x,
        y: languagesItemLayout.y,
        width: languagesItemLayout.width,
        height: languagesItemLayout.height,
        borderRadius: 12,
      });
    }
  }, [currentStepId, languagesItemLayout, setSpotlightArea]);

  const SETTINGS_SECTIONS: SettingsSection[] = useMemo(
    () =>
      [
        {
          key: 'personalize',
          data: [
            {
              id: SETTING_ITEM_ID_MAP.personalize_theme,
              title: translate('selectThemeTitle'),
              color: '#FF9500',
              onPress: () => navigation.navigate('ThemeSettings' as never),
            },
            {
              id: SETTING_ITEM_ID_MAP.personalize_tts,
              title: translate('autoAnnounce'),
              color: '#34C759',
              onPress: () => navigation.navigate('TTSSettings' as never),
            },
            {
              id: SETTING_ITEM_ID_MAP.personalize_languages,
              title: translate('displayLanguages'),
              color: '#007AFF',
              onPress: () =>
                navigation.navigate('EnabledLanguagesSettings' as never),
            },
          ].filter((dat) =>
            isClip() ? dat.id !== SETTING_ITEM_ID_MAP.personalize_tts : true
          ), // Remove TTS setting in App Clip
        },
        {
          key: 'aboutApp',
          data: [
            {
              id: SETTING_ITEM_ID_MAP.about_app_licenses,
              title: translate('license'),
              color: '#333',
              onPress: () => navigation.navigate('Licenses' as never),
            },
          ],
        },
        {
          key: 'forDevelopers',
          data: isDevApp
            ? [
                {
                  id: SETTING_ITEM_ID_MAP.developer_tuning,
                  title: translate('tuning'),
                  color: '#5856D6',
                  onPress: () => navigation.navigate('TuningSettings' as never),
                },
              ]
            : ([] as SettingsSectionData[]),
        },
      ].filter((section) => section.data.length > 0),
    [navigation]
  );

  const getItemLayoutCallback = useCallback((itemId: SettingItemId) => {
    switch (itemId) {
      case 'personalize_theme':
        return setThemeItemLayout;
      case 'personalize_tts':
        return setTtsItemLayout;
      case 'personalize_languages':
        return setLanguagesItemLayout;
      default:
        return undefined;
    }
  }, []);

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
        onItemLayout={getItemLayoutCallback(item.id)}
      />
    ),
    [getItemLayoutCallback]
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
            headerHeight ? { paddingTop: headerHeight } : null,
            { paddingBottom: FOOTER_BASE_HEIGHT + safeAreaBottom },
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
        title={translate('settings')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
      {currentStep && (
        <WalkthroughOverlay
          visible={isWalkthroughActive}
          step={currentStep}
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          onNext={nextStep}
          onGoToStep={goToStep}
          onSkip={skipWalkthrough}
        />
      )}
    </>
  );
};

export default React.memo(AppSettingsScreen);
