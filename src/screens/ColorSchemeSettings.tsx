import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { lighten } from 'polished';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  Animated as RNAnimated,
  StyleSheet,
  View,
} from 'react-native';
import Button from '~/components/Button';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import { StatePanel } from '~/components/ToggleButton';
import Typography from '~/components/Typography';
import WalkthroughOverlay, {
  type WalkthroughStep,
} from '~/components/WalkthroughOverlay';
import {
  COLOR_SCHEME_PREFERENCE,
  type ColorSchemePreference,
} from '~/models/ColorScheme';
import { useAppColors } from '~/providers/AppColorsProvider';
import { colorSchemePreferenceAtom } from '~/store/atoms/colorScheme';
import {
  portraitModeEnabledAtom,
  portraitPromoAppearanceSeenAtom,
  portraitPromoFinishedAtom,
} from '~/store/atoms/display';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';
import isTablet from '~/utils/isTablet';
import {
  canShowPortraitAppearanceHint,
  finishPortraitPromo,
  markPortraitAppearanceSeen,
} from '~/utils/portraitPromo';
import { RFValue } from '~/utils/rfValue';
import { STORAGE_KEYS } from '../constants';
import { storage } from '../lib/storage';

// WalkthroughOverlay はステップ移動のコールバックを必須にしているが、
// 1ステップだけのスポットライトでは移動先が無い
const noop = () => undefined;

type SettingItem = {
  id: ColorSchemePreference;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  title: {
    flex: 1,
    fontSize: isTablet ? RFValue(12) : RFValue(14),
    fontWeight: 'bold',
  },
  description: {
    marginTop: 16,
    lineHeight: 21,
  },
  // 配色グループと画面レイアウトグループの区切りを視覚的に分かるようにする
  toggleSpacer: {
    marginTop: 32,
  },
  okButton: {
    width: 128,
    alignSelf: 'center',
    marginTop: 32,
  },
});

const SettingsItem = ({
  item,
  isFirst,
  isLast,
  state,
  onSelect,
}: {
  item: SettingItem;
  isFirst: boolean;
  isLast: boolean;
  state: boolean;
  onSelect: () => void;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={item.title}
      accessibilityState={{ checked: state }}
      onPress={onSelect}
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
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: isLEDTheme ? 0 : 8,
          overflow: 'hidden',
          marginRight: 16,
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
          <Ionicons name={item.icon} size={24} color="white" />
        </LinearGradient>
      </View>
      <Typography style={styles.title}>{item.title}</Typography>

      <StatePanel
        state={state}
        onText={translate('inUse')}
        offText={translate('select')}
      />
    </Pressable>
  );
};

const ToggleItem = ({
  title,
  state,
  onToggle,
  onLayout,
}: {
  title: string;
  state: boolean;
  onToggle: () => void;
  onLayout?: () => void;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: state }}
      onPress={onToggle}
      onLayout={onLayout}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: isLEDTheme ? '#333' : colors.card,
        borderRadius: isLEDTheme ? 0 : 12,
      }}
    >
      <Typography style={styles.title}>{title}</Typography>

      <StatePanel state={state} />
    </Pressable>
  );
};

const ColorSchemeSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const currentPreference = useAtomValue(colorSchemePreferenceAtom);
  const setColorSchemePreference = useSetAtom(colorSchemePreferenceAtom);
  const [portraitModeEnabled, setPortraitModeEnabled] = useAtom(
    portraitModeEnabledAtom
  );
  const setAppearanceSeen = useSetAtom(portraitPromoAppearanceSeenAtom);
  const setPromoFinished = useSetAtom(portraitPromoFinishedAtom);

  const navigation = useNavigation();

  // 案C: 外観画面を開いた初回だけ、ポートレートモードのトグルをスポットライトで指す。
  // 開いた時点で既読にする以上、可否はマウント時のスナップショットで持つ
  // (リアクティブに読むと自分自身を即座に閉じてしまう)
  const [canShowSpotlight] = useState(() => canShowPortraitAppearanceHint());
  const [spotlightDismissed, setSpotlightDismissed] = useState(false);
  const [toggleLayout, setToggleLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const toggleRef = useRef<View>(null);

  // 画面を開いた時点で印を消す。次からはスポットライトも出さない。
  // 印を出している画面はここから戻っても再マウントされないので、
  // 永続化と合わせて atom も更新する
  useEffect(() => {
    markPortraitAppearanceSeen();
    setAppearanceSeen(true);
  }, [setAppearanceSeen]);

  const measureToggle = useCallback(() => {
    toggleRef.current?.measureInWindow((x, y, width, height) => {
      setToggleLayout((prev) =>
        prev?.x === x &&
        prev?.y === y &&
        prev?.width === width &&
        prev?.height === height
          ? prev
          : { x, y, width, height }
      );
    });
  }, []);

  // ヘッダー高さが決まるとコンテンツ位置がずれるため、確定後に測り直す
  useEffect(() => {
    if (!headerHeight) {
      return;
    }
    const frameId = requestAnimationFrame(measureToggle);
    return () => cancelAnimationFrame(frameId);
  }, [headerHeight, measureToggle]);

  const spotlightStep = useMemo<WalkthroughStep | null>(
    () =>
      toggleLayout
        ? {
            id: 'portraitMode',
            titleKey: 'portraitModeTitle',
            descriptionKey: 'portraitPromoSpotlightDescription',
            // トグルは画面下部にあるので、ツールチップは必ず上側に出す
            tooltipPosition: 'top',
            spotlightArea: { ...toggleLayout, borderRadius: 12 },
          }
        : null,
    [toggleLayout]
  );

  const settingItems: SettingItem[] = useMemo(
    () => [
      {
        id: COLOR_SCHEME_PREFERENCE.AUTO,
        title: translate('colorSchemeAuto'),
        icon: 'phone-portrait',
        color: '#5B9BD5',
      },
      {
        id: COLOR_SCHEME_PREFERENCE.LIGHT,
        title: translate('colorSchemeLight'),
        icon: 'sunny',
        color: '#FF9500',
      },
      {
        id: COLOR_SCHEME_PREFERENCE.DARK,
        title: translate('colorSchemeDark'),
        icon: 'moon',
        color: '#5856D6',
      },
    ],
    []
  );

  const handleSelect = useCallback(
    (preference: ColorSchemePreference) => {
      const prevPreference = currentPreference;
      setColorSchemePreference(preference);
      try {
        storage.set(STORAGE_KEYS.COLOR_SCHEME_PREFERENCE, preference);
      } catch (error) {
        // 保存に失敗したままだと次回起動時に設定が巻き戻るため、
        // UIと永続値の不整合を防ぐべくatom状態をロールバックする
        setColorSchemePreference(prevPreference);
        console.error('Failed to save color scheme setting', error);
        showDialog(
          translate('errorTitle'),
          translate('failedToSavePreference')
        );
      }
    },
    [currentPreference, setColorSchemePreference]
  );

  const handleTogglePortraitMode = useCallback(() => {
    const flag = !portraitModeEnabled;
    setPortraitModeEnabled(flag);
    try {
      storage.set(STORAGE_KEYS.PORTRAIT_MODE_ENABLED, flag ? 'true' : 'false');
      // 一度でもオンにしたら、以降はオフに戻されても訴求しない
      if (flag) {
        finishPortraitPromo();
        setPromoFinished(true);
      }
    } catch (error) {
      // 保存に失敗したままだと次回起動時に設定が巻き戻るため、
      // UIと永続値の不整合を防ぐべくatom状態をロールバックする
      setPortraitModeEnabled(!flag);
      console.error('Failed to save portrait mode setting', error);
      showDialog(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [portraitModeEnabled, setPortraitModeEnabled, setPromoFinished]);

  const handleDismissSpotlight = useCallback(() => {
    setSpotlightDismissed(true);
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
        <RNAnimated.ScrollView
          contentContainerStyle={
            headerHeight
              ? { marginTop: headerHeight, paddingBottom: headerHeight }
              : null
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {settingItems.map((item, index) => (
            <SettingsItem
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === settingItems.length - 1}
              state={currentPreference === item.id}
              onSelect={() => handleSelect(item.id)}
            />
          ))}
          <Typography
            style={[styles.description, { color: colors.secondaryText }]}
          >
            {translate('colorSchemeDescription')}
          </Typography>
          <View style={styles.toggleSpacer} ref={toggleRef}>
            <ToggleItem
              title={translate('portraitModeTitle')}
              state={portraitModeEnabled}
              onToggle={handleTogglePortraitMode}
              onLayout={measureToggle}
            />
          </View>
          <Typography
            style={[styles.description, { color: colors.secondaryText }]}
          >
            {translate('portraitModeDescription')}
          </Typography>
          <Button
            style={styles.okButton}
            textStyle={{ fontWeight: 'bold' }}
            onPress={() => navigation.goBack()}
          >
            OK
          </Button>
        </RNAnimated.ScrollView>
      </View>
      <SettingsHeader
        title={translate('colorSchemeSettings')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
      {spotlightStep ? (
        <WalkthroughOverlay
          visible={
            canShowSpotlight && !spotlightDismissed && !portraitModeEnabled
          }
          step={spotlightStep}
          currentStepIndex={0}
          totalSteps={1}
          onNext={handleTogglePortraitMode}
          onGoToStep={noop}
          onSkip={handleDismissSpotlight}
          // 背景の誤タップでポートレートモードが入らないよう、
          // 有効化は主ボタンだけに限る
          onBackgroundPress={handleDismissSpotlight}
          primaryLabel={translate('portraitPromoPromptEnable')}
          dismissLabel={translate('portraitPromoSpotlightDismiss')}
        />
      ) : null}
    </>
  );
};

export default React.memo(ColorSchemeSettingsScreen);
