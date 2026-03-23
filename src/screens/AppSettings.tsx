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
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Animated as RNAnimated,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import Animated from 'react-native-reanimated';
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
import { isBetaBuild } from '~/utils/isBetaBuild';
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
  sectionHeading: {
    marginBottom: 24,
    fontSize: 21,
  },
  sectionContainer: {
    marginBottom: 0,
  },
});

type ItemLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

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

      <CardChevron stroke={isLEDTheme ? 'white' : 'black'} />
    </TouchableOpacity>
  );
};

const AppSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [themeItemLayout, setThemeItemLayout] = useState<ItemLayout | null>(
    null
  );
  const [ttsItemLayout, setTtsItemLayout] = useState<ItemLayout | null>(null);
  const [languagesItemLayout, setLanguagesItemLayout] =
    useState<ItemLayout | null>(null);

  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const { bottom: safeAreaBottom } = useSafeAreaInsets();

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const navigation = useNavigation();

  const themeRef = useRef<View>(null);
  const ttsRef = useRef<View>(null);
  const languagesRef = useRef<View>(null);

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

  const handleThemeLayout = useCallback(() => {
    if (themeRef.current) {
      themeRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setThemeItemLayout({ x, y, width, height });
        }
      );
    }
  }, []);

  const handleTtsLayout = useCallback(() => {
    if (ttsRef.current) {
      ttsRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setTtsItemLayout({ x, y, width, height });
        }
      );
    }
  }, []);

  const handleLanguagesLayout = useCallback(() => {
    if (languagesRef.current) {
      languagesRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setLanguagesItemLayout({ x, y, width, height });
        }
      );
    }
  }, []);

  // Re-measure all items when headerHeight changes
  useEffect(() => {
    if (headerHeight > 0) {
      // Use requestAnimationFrame to ensure layout has been applied
      requestAnimationFrame(() => {
        handleThemeLayout();
        handleTtsLayout();
        handleLanguagesLayout();
      });
    }
  }, [headerHeight, handleThemeLayout, handleTtsLayout, handleLanguagesLayout]);

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

  const personalizeItems: SettingsSectionData[] = useMemo(
    () =>
      [
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
      ) as SettingsSectionData[],
    [navigation]
  );

  const aboutAppItems: SettingsSectionData[] = useMemo(
    () => [
      {
        id: SETTING_ITEM_ID_MAP.about_app_licenses,
        title: translate('license'),
        color: '#333',
        onPress: () => navigation.navigate('Licenses' as never),
      },
    ],
    [navigation]
  );

  const developerItems: SettingsSectionData[] = useMemo(
    () =>
      isDevApp
        ? [
            {
              id: SETTING_ITEM_ID_MAP.developer_tuning,
              title: translate('tuning'),
              color: '#5856D6',
              onPress: () => navigation.navigate('TuningSettings' as never),
            },
          ]
        : [],
    [navigation]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.setValue(e.nativeEvent.contentOffset.y);
    },
    [scrollY]
  );

  const showTtsItem = !isClip();

  return (
    <>
      <SafeAreaView style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <Animated.ScrollView
          style={StyleSheet.absoluteFill}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.listContainerStyle,
            headerHeight ? { paddingTop: headerHeight } : null,
            { paddingBottom: FOOTER_BASE_HEIGHT + safeAreaBottom },
          ]}
        >
          {/* パーソナライズセクション */}
          <View style={styles.sectionContainer}>
            <Heading style={styles.sectionHeading}>
              {translate('personalize')}
            </Heading>
            <View ref={themeRef} onLayout={handleThemeLayout}>
              <SettingsItem
                item={personalizeItems[0]}
                isFirst={true}
                isLast={!showTtsItem && personalizeItems.length === 1}
                onPress={personalizeItems[0].onPress}
              />
            </View>
            {showTtsItem && (
              <View ref={ttsRef} onLayout={handleTtsLayout}>
                <SettingsItem
                  item={personalizeItems[1]}
                  isFirst={false}
                  isLast={false}
                  onPress={personalizeItems[1].onPress}
                />
              </View>
            )}
            <View ref={languagesRef} onLayout={handleLanguagesLayout}>
              <SettingsItem
                item={personalizeItems[showTtsItem ? 2 : 1]}
                isFirst={false}
                isLast={true}
                onPress={personalizeItems[showTtsItem ? 2 : 1].onPress}
              />
            </View>
          </View>

          {/* アプリについてセクション */}
          <View style={styles.sectionContainer}>
            <Heading style={styles.sectionHeading}>
              {translate('aboutApp')}
            </Heading>
            {aboutAppItems.map((item, index) => (
              <SettingsItem
                key={item.id}
                item={item}
                isFirst={index === 0}
                isLast={index === aboutAppItems.length - 1}
                onPress={item.onPress}
              />
            ))}
          </View>

          {/* 開発者向けセクション */}
          {developerItems.length > 0 && (
            <View style={styles.sectionContainer}>
              <Heading style={styles.sectionHeading}>
                {translate('forDevelopers')}
              </Heading>
              {developerItems.map((item, index) => (
                <SettingsItem
                  key={item.id}
                  item={item}
                  isFirst={index === 0}
                  isLast={index === developerItems.length - 1}
                  onPress={item.onPress}
                />
              ))}
            </View>
          )}

          {/* ビルド情報 */}
          {isDevApp || isBetaBuild ? (
            <Typography style={styles.betaNotice}>
              {isDevApp ? translate('canaryNotice') : ''}
              {!isDevApp && isBetaBuild ? translate('betaNotice') : ''}
            </Typography>
          ) : null}
        </Animated.ScrollView>
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
