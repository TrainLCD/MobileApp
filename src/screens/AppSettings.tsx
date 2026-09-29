import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
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
  Platform,
  Animated as RNAnimated,
  type ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardChevron } from '~/components/CardChevron';
import { Heading } from '~/components/Heading';
import NewFeatureDot from '~/components/NewFeatureDot';
import { SettingsHeader } from '~/components/SettingsHeader';
import Typography from '~/components/Typography';
import WalkthroughOverlay from '~/components/WalkthroughOverlay';
import { FAQ_URL } from '~/constants';
import { usePortraitPromoAppearanceHint } from '~/hooks/usePortraitPromoAppearanceHint';
import { useSettingsWalkthrough } from '~/hooks/useSettingsWalkthrough';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isBetaBuild } from '~/utils/isBetaBuild';
import { isDevApp } from '~/utils/isDevApp';
import FooterTabBar, { useFooterHeight } from '../components/FooterTabBar';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { translate } from '../translation';
import { RFValue } from '../utils/rfValue';

const SETTING_ITEM_ID_MAP = {
  personalize_theme: 'personalize_theme',
  personalize_color_scheme: 'personalize_color_scheme',
  personalize_tts: 'personalize_tts',
  personalize_languages: 'personalize_languages',
  personalize_notifications: 'personalize_notifications',
  personalize_battery: 'personalize_battery',
  personalize_ride_log: 'personalize_ride_log',
  personalize_experimental: 'personalize_experimental',
  personalize_android: 'personalize_android',
  about_app_faq: 'about_app_faq',
  about_app_licenses: 'about_app_licenses',
} as const;

type SettingItemId = keyof typeof SETTING_ITEM_ID_MAP;

// ウォークスルーの切り抜きは対象項目がリストの先頭・中間・末尾のいずれでも同じ角丸にする
const SPOTLIGHT_BORDER_RADIUS = 12;

type SettingsSectionData = {
  id: SettingItemId;
  title: string;
  color: string;
  onPress?: () => void;
};

type PersonalizeSection = {
  id: 'display' | 'notifications' | 'activity' | 'device' | 'other';
  titleKey: string;
  items: SettingsSectionData[];
};

const styles = StyleSheet.create({
  root: { paddingHorizontal: 24, flex: 1 },
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
  showNewFeatureDot,
}: {
  item: SettingsSectionData;
  isFirst: boolean;
  isLast: boolean;
  onPress?: () => void;
  /** 新機能の在り処を示す印。シェブロンの手前に置く */
  showNewFeatureDot?: boolean;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();

  const iconName = useMemo(() => {
    switch (item.id) {
      case 'personalize_theme':
        return 'color-palette';
      case 'personalize_color_scheme':
        return 'contrast';
      case 'personalize_tts':
        return 'volume-high';
      case 'personalize_languages':
        return 'globe';
      case 'personalize_notifications':
        return 'notifications';
      case 'personalize_battery':
        return 'battery-half';
      case 'personalize_ride_log':
        return 'stats-chart';
      case 'personalize_experimental':
        return 'flask';
      case 'personalize_android':
        return 'phone-portrait';
      case 'about_app_faq':
        return 'help-circle';
      case 'about_app_licenses':
        return 'key';
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
        backgroundColor: isLEDTheme ? '#333' : colors.card,
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

      {showNewFeatureDot ? (
        <View style={{ marginRight: 12 }}>
          <NewFeatureDot color={colors.accent} />
        </View>
      ) : null}

      {/*
        FAQ はアプリ内ブラウザで Web ページを開く項目で、アプリ内の別画面へ進む
        他の項目とは遷移先の種類が違う。同じシェブロンのままでは押すまで区別が
        つかないため、末尾の印を外部リンクのものに差し替えて事前に知らせる。
      */}
      {item.id === SETTING_ITEM_ID_MAP.about_app_faq ? (
        // size 24 では実描画が 19.3dp になり、隣のシェブロン(実測 16.7dp)より
        // 一回り大きく見えるため、高さが揃う 20 にしている。CardChevron は
        // 24dp の枠内でパスが右に 8dp 余白を持つ一方こちらは枠いっぱいに描かれ、
        // そのままだと視覚的な右端が 4dp 外へ出るため marginRight で吸収する
        <Ionicons
          name="open-outline"
          size={20}
          color={isLEDTheme || colors.isDark ? 'white' : 'black'}
          style={{ marginRight: 4 }}
        />
      ) : (
        <CardChevron stroke={isLEDTheme || colors.isDark ? 'white' : 'black'} />
      )}
    </TouchableOpacity>
  );
};

const AppSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [themeItemLayout, setThemeItemLayout] = useState<ItemLayout | null>(
    null
  );
  const [colorSchemeItemLayout, setColorSchemeItemLayout] =
    useState<ItemLayout | null>(null);
  const [ttsItemLayout, setTtsItemLayout] = useState<ItemLayout | null>(null);
  const [languagesItemLayout, setLanguagesItemLayout] =
    useState<ItemLayout | null>(null);

  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  // ウォークスルー中は背景の Pressable が画面全体のタッチを受けるため、ユーザーは
  // スクロールできない。スクロール位置はウォークスルーが動かした値だけになるので、
  // それを覚えておき、各行の位置をスクロールしていないときの座標にそろえて持つ
  const scrollOffsetRef = useRef(0);
  const footerHeight = useFooterHeight();

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const navigation = useNavigation();
  const showPortraitPromoHint = usePortraitPromoAppearanceHint();

  const themeRef = useRef<View>(null);
  const colorSchemeRef = useRef<View>(null);
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
          setThemeItemLayout({
            x,
            y: y + scrollOffsetRef.current,
            width,
            height,
          });
        }
      );
    }
  }, []);

  const handleColorSchemeLayout = useCallback(() => {
    if (colorSchemeRef.current) {
      colorSchemeRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setColorSchemeItemLayout({
            x,
            y: y + scrollOffsetRef.current,
            width,
            height,
          });
        }
      );
    }
  }, []);

  const handleTtsLayout = useCallback(() => {
    if (ttsRef.current) {
      ttsRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setTtsItemLayout({
            x,
            y: y + scrollOffsetRef.current,
            width,
            height,
          });
        }
      );
    }
  }, []);

  const handleLanguagesLayout = useCallback(() => {
    if (languagesRef.current) {
      languagesRef.current.measureInWindow(
        (x: number, y: number, width: number, height: number) => {
          setLanguagesItemLayout({
            x,
            y: y + scrollOffsetRef.current,
            width,
            height,
          });
        }
      );
    }
  }, []);

  // ヘッダーの高さが決まったら、スポットライト対象の行をすべて測り直す。
  // 行の onLayout は見出しの中での位置しか見ないため、上の見出しの高さが変わって
  // 下の見出しごと動いたときに備えてコンテンツの高さが変わったときも測り直す
  // biome-ignore lint/correctness/useExhaustiveDependencies: contentHeight は測り直すきっかけとして使う
  useEffect(() => {
    if (headerHeight > 0) {
      // Use requestAnimationFrame to ensure layout has been applied
      requestAnimationFrame(() => {
        handleThemeLayout();
        handleColorSchemeLayout();
        handleTtsLayout();
        handleLanguagesLayout();
      });
    }
  }, [
    headerHeight,
    contentHeight,
    handleThemeLayout,
    handleColorSchemeLayout,
    handleTtsLayout,
    handleLanguagesLayout,
  ]);

  const spotlightTargetLayout = useMemo(() => {
    switch (currentStepId) {
      case 'settingsTheme':
        return themeItemLayout;
      case 'settingsColorScheme':
        return colorSchemeItemLayout;
      case 'settingsTts':
        return ttsItemLayout;
      case 'settingsLanguages':
        return languagesItemLayout;
      default:
        return null;
    }
  }, [
    currentStepId,
    themeItemLayout,
    colorSchemeItemLayout,
    ttsItemLayout,
    languagesItemLayout,
  ]);

  // 見出しで分けたことで、下の見出しにある行は小さい端末だとフッターの裏に隠れる。
  // 案内する行を、スクロールしていないときのテーマ設定の行と同じ高さまで動かす。
  // 吹き出しは行の下に出るので、最初のステップで収まっている位置にそろえれば
  // 吹き出しの高さを見積もらずに済む
  useEffect(() => {
    if (!spotlightTargetLayout) {
      return;
    }
    const anchorY = themeItemLayout?.y ?? spotlightTargetLayout.y;
    const maxOffset = Math.max(0, contentHeight - viewportHeight);
    const offset = Math.min(
      Math.max(0, spotlightTargetLayout.y - anchorY),
      maxOffset
    );
    if (offset !== scrollOffsetRef.current) {
      scrollOffsetRef.current = offset;
      scrollViewRef.current?.scrollTo({ y: offset, animated: false });
    }
    setSpotlightArea({
      x: spotlightTargetLayout.x,
      y: spotlightTargetLayout.y - offset,
      width: spotlightTargetLayout.width,
      height: spotlightTargetLayout.height,
      borderRadius: SPOTLIGHT_BORDER_RADIUS,
    });
  }, [
    spotlightTargetLayout,
    themeItemLayout,
    contentHeight,
    viewportHeight,
    setSpotlightArea,
  ]);

  // 各項目の表示条件（App Clip・カナリアリリース・Android 限定）は見出しで分ける前と同じ。
  // 項目が1つも残らない見出しは出さない
  const personalizeSections: PersonalizeSection[] = useMemo(() => {
    const sections: PersonalizeSection[] = [
      {
        id: 'display',
        titleKey: 'settingsSectionDisplay',
        items: [
          {
            id: SETTING_ITEM_ID_MAP.personalize_theme,
            title: translate('selectThemeTitle'),
            color: '#FF9500',
            onPress: () => navigation.navigate('ThemeSettings' as never),
          },
          {
            id: SETTING_ITEM_ID_MAP.personalize_color_scheme,
            title: translate('colorSchemeSettings'),
            color: '#5856D6',
            onPress: () => navigation.navigate('ColorSchemeSettings' as never),
          },
          {
            id: SETTING_ITEM_ID_MAP.personalize_languages,
            title: translate('displayLanguages'),
            color: '#007AFF',
            onPress: () =>
              navigation.navigate('EnabledLanguagesSettings' as never),
          },
        ],
      },
      {
        id: 'notifications',
        titleKey: 'settingsSectionNotifications',
        items: [
          {
            id: SETTING_ITEM_ID_MAP.personalize_notifications,
            title: translate('notificationSettings'),
            color: '#FF3B30',
            onPress: () => navigation.navigate('NotificationSettings' as never),
          },
          ...(isClip()
            ? []
            : [
                {
                  id: SETTING_ITEM_ID_MAP.personalize_tts,
                  title: translate('autoAnnounce'),
                  color: '#34C759',
                  onPress: () => navigation.navigate('TTSSettings' as never),
                },
              ]),
        ],
      },
      // 振り返り(#5751)。#7134 で決めた見出しの分け方に合わせ、通知とアナウンスとデバイスのあいだに置く
      {
        id: 'activity',
        titleKey: 'settingsSectionActivity',
        items: [
          {
            id: SETTING_ITEM_ID_MAP.personalize_ride_log,
            title: translate('rideLogSettings'),
            color: '#FF2D55',
            onPress: () => navigation.navigate('RideLogSettings' as never),
          },
        ],
      },
      {
        id: 'device',
        titleKey: 'settingsSectionDevice',
        items: [
          {
            id: SETTING_ITEM_ID_MAP.personalize_battery,
            title: translate('batterySettings'),
            color: '#30B0C7',
            onPress: () => navigation.navigate('BatterySettings' as never),
          },
          ...(Platform.OS === 'android'
            ? [
                {
                  id: SETTING_ITEM_ID_MAP.personalize_android,
                  title: translate('androidSettings'),
                  color: '#3A86FF',
                  onPress: () =>
                    navigation.navigate('AndroidSettings' as never),
                },
              ]
            : []),
        ],
      },
      {
        id: 'other',
        titleKey: 'settingsSectionOther',
        // 試験的機能はカナリアリリース(devアプリ)限定で表示する
        items: isDevApp
          ? [
              {
                id: SETTING_ITEM_ID_MAP.personalize_experimental,
                title: translate('experimentalSettings'),
                color: '#AF52DE',
                onPress: () =>
                  navigation.navigate('ExperimentalSettings' as never),
              },
            ]
          : [],
      },
    ];
    return sections.filter((section) => section.items.length > 0);
  }, [navigation]);

  const aboutAppItems: SettingsSectionData[] = useMemo(
    () => [
      {
        id: SETTING_ITEM_ID_MAP.about_app_faq,
        title: translate('faq'),
        color: '#5AC8FA',
        // 外部ブラウザへ遷移すると設定画面から離脱してしまうため、
        // プライバシーポリシー(src/screens/Privacy.tsx)と同じくアプリ内ブラウザで開き、
        // 閉じれば元の位置に戻れるようにする。
        onPress: () => {
          WebBrowser.openBrowserAsync(FAQ_URL).catch((error) => {
            console.warn('よくある質問を開けませんでした:', error);
          });
        },
      },
      {
        id: SETTING_ITEM_ID_MAP.about_app_licenses,
        title: translate('license'),
        color: '#333',
        onPress: () => navigation.navigate('Licenses' as never),
      },
    ],
    [navigation]
  );

  const handleScroll = useRef(
    RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    })
  ).current;

  return (
    <>
      <SafeAreaView
        style={[
          styles.root,
          !isLEDTheme && { backgroundColor: colors.background },
        ]}
      >
        <RNAnimated.ScrollView
          ref={scrollViewRef}
          style={StyleSheet.absoluteFill}
          onScroll={handleScroll}
          onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, height) => setContentHeight(height)}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.listContainerStyle,
            headerHeight ? { paddingTop: headerHeight } : null,
            { paddingBottom: footerHeight },
          ]}
        >
          {personalizeSections.map((section) => (
            <View key={section.id} style={styles.sectionContainer}>
              <Heading style={styles.sectionHeading}>
                {translate(section.titleKey)}
              </Heading>
              {section.items.map((item, index) => {
                const row = (
                  <SettingsItem
                    key={item.id}
                    item={item}
                    isFirst={index === 0}
                    isLast={index === section.items.length - 1}
                    onPress={item.onPress}
                    showNewFeatureDot={
                      showPortraitPromoHint &&
                      item.id === SETTING_ITEM_ID_MAP.personalize_color_scheme
                    }
                  />
                );
                // ウォークスルーのスポットライト対象はレイアウト計測用のViewで包む
                switch (item.id) {
                  case 'personalize_theme':
                    return (
                      <View
                        key={item.id}
                        ref={themeRef}
                        onLayout={handleThemeLayout}
                      >
                        {row}
                      </View>
                    );
                  case 'personalize_color_scheme':
                    return (
                      <View
                        key={item.id}
                        ref={colorSchemeRef}
                        onLayout={handleColorSchemeLayout}
                      >
                        {row}
                      </View>
                    );
                  case 'personalize_tts':
                    return (
                      <View
                        key={item.id}
                        ref={ttsRef}
                        onLayout={handleTtsLayout}
                      >
                        {row}
                      </View>
                    );
                  case 'personalize_languages':
                    return (
                      <View
                        key={item.id}
                        ref={languagesRef}
                        onLayout={handleLanguagesLayout}
                      >
                        {row}
                      </View>
                    );
                  default:
                    return row;
                }
              })}
            </View>
          ))}

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

          {/* ビルド情報 */}
          {isDevApp || isBetaBuild ? (
            <Typography style={styles.betaNotice}>
              {isDevApp ? translate('canaryNotice') : ''}
              {!isDevApp && isBetaBuild ? translate('betaNotice') : ''}
            </Typography>
          ) : null}
        </RNAnimated.ScrollView>
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
