import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { GlassView } from 'expo-glass-effect';
import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnUI } from 'react-native-worklets';
import { LED_THEME_BG_COLOR } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { LIQUID_GLASS_AVAILABLE } from '~/utils/liquidGlass';

type FooterTab = 'home' | 'search' | 'settings';

export const FOOTER_BASE_HEIGHT = 72; // Figma: h=72px

const GLASS_BAR_HEIGHT = 64;
const GLASS_BAR_MIN_BOTTOM_MARGIN = 12;

// タブバーが画面下部で占有する実高さ。描画モード（Liquid Glass / 従来バー）で
// 高さが異なるため、各画面の bottom padding 計算は必ずこのフックを使うこと
export const useFooterHeight = (): number => {
  const insets = useSafeAreaInsets();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const safePad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  if (LIQUID_GLASS_AVAILABLE && !isLEDTheme) {
    return GLASS_BAR_HEIGHT + Math.max(safePad, GLASS_BAR_MIN_BOTTOM_MARGIN);
  }
  return FOOTER_BASE_HEIGHT + safePad;
};

export type ButtonLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const ICON_COLOR = {
  active: '#0A84FF',
  inactive: '#6B7280', // gray-500 相当
} as const;

// アクティブタブのアイコン裏に敷くピル。iOS 26 純正タブバーの選択ハイライトを模した
// アクセントカラーの半透明ティント
const ACTIVE_PILL_COLOR = 'rgba(10, 132, 255, 0.16)';

// 押下中に沈み込むスケール値
const PRESSED_SCALE = 0.85;

// 押下時は素早く沈み、離した時はバウンドしながら戻す
const PRESS_IN_SPRING = { damping: 24, stiffness: 420 } as const;
const PRESS_OUT_SPRING = { damping: 13, stiffness: 320 } as const;
// アクティブピルの出現スプリング。画面遷移直後に弾みながら現れる
const ACTIVE_PILL_SPRING = { damping: 15, stiffness: 280 } as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    // iOS shadow
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    // Android shadow fallback
    elevation: 4,
  },
  content: {
    height: FOOTER_BASE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 24,
  },
  // iOS 26 のフローティングタブバーを模したカプセル形状。
  // 占有高さが FOOTER_BASE_HEIGHT + insets.bottom に収まるよう高さを抑えている
  glassBar: {
    height: GLASS_BAR_HEIGHT,
    borderRadius: GLASS_BAR_HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 20,
  },
  button: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24, // button(48px) の半分で正円にする
    backgroundColor: ACTIVE_PILL_COLOR,
  },
});

type TabButtonProps = {
  active: boolean;
  /** アクティブタブの背面ピルを表示するか（Liquid Glass バーのみ true） */
  showActivePill: boolean;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  buttonRef?: React.Ref<View>;
  children: React.ReactNode;
};

const TabButton: React.FC<TabButtonProps> = ({
  active,
  showActivePill,
  onPress,
  onLayout,
  buttonRef,
  children,
}) => {
  const pressScale = useSharedValue(1);
  // 0 → 1 でピルがスプリング出現する。タブバーは画面ごとにマウントされるため、
  // 遷移直後のマウント時アニメーションが実質的な「選択が移った」表現になる
  const pillProgress = useSharedValue(0);

  useEffect(() => {
    scheduleOnUI(() => {
      'worklet';
      pillProgress.value = withSpring(active ? 1 : 0, ACTIVE_PILL_SPRING);
    });
  }, [active, pillProgress]);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(PRESSED_SCALE, PRESS_IN_SPRING);
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, PRESS_OUT_SPRING);
  }, [pressScale]);

  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pillProgress.value,
    transform: [{ scale: 0.5 + pillProgress.value * 0.5 }],
  }));

  return (
    <AnimatedPressable
      ref={buttonRef}
      style={[styles.button, pressAnimatedStyle]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={onLayout}
    >
      {showActivePill && active ? (
        <Animated.View
          testID="footer-active-pill"
          pointerEvents="none"
          style={[styles.activePill, pillAnimatedStyle]}
        />
      ) : null}
      {children}
    </AnimatedPressable>
  );
};

type Props = {
  active?: FooterTab;
  visible?: boolean;
  onSearchButtonLayout?: (layout: ButtonLayout) => void;
  onSettingsButtonLayout?: (layout: ButtonLayout) => void;
};

const FooterTabBar: React.FC<Props> = ({
  active = 'home',
  visible = true,
  onSearchButtonLayout,
  onSettingsButtonLayout,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const searchButtonRef = useRef<View>(null);
  const settingsButtonRef = useRef<View>(null);

  const handleSearchButtonLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      if (onSearchButtonLayout && searchButtonRef.current) {
        searchButtonRef.current.measureInWindow((x, y, width, height) => {
          onSearchButtonLayout({ x, y, width, height });
        });
      }
    },
    [onSearchButtonLayout]
  );

  const handleSettingsButtonLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      if (onSettingsButtonLayout && settingsButtonRef.current) {
        settingsButtonRef.current.measureInWindow((x, y, width, height) => {
          onSettingsButtonLayout({ x, y, width, height });
        });
      }
    },
    [onSettingsButtonLayout]
  );

  if (!visible) return null;

  const safePad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  // LED テーマは独自の質感を持つためガラス化せず従来のソリッドなバーを維持する
  const isGlassBar = LIQUID_GLASS_AVAILABLE && !isLEDTheme;

  const tabButtons = (
    <>
      <TabButton
        buttonRef={searchButtonRef}
        active={active === 'search'}
        showActivePill={isGlassBar}
        onPress={() => {
          navigation.navigate('RouteSearch' as never);
        }}
        onLayout={handleSearchButtonLayout}
      >
        <Ionicons
          name={active === 'search' ? 'git-commit' : 'git-commit-outline'}
          size={26}
          color={active === 'search' ? ICON_COLOR.active : ICON_COLOR.inactive}
        />
      </TabButton>

      <TabButton
        active={active === 'home'}
        showActivePill={isGlassBar}
        onPress={() => {
          navigation.navigate('SelectLine' as never);
        }}
      >
        <Ionicons
          name={active === 'home' ? 'navigate' : 'navigate-outline'}
          size={28}
          color={active === 'home' ? ICON_COLOR.active : ICON_COLOR.inactive}
        />
      </TabButton>

      <TabButton
        buttonRef={settingsButtonRef}
        active={active === 'settings'}
        showActivePill={isGlassBar}
        onPress={() => {
          navigation.navigate('AppSettings' as never);
        }}
        onLayout={handleSettingsButtonLayout}
      >
        <Ionicons
          name={active === 'settings' ? 'settings' : 'settings-outline'}
          size={26}
          color={
            active === 'settings' ? ICON_COLOR.active : ICON_COLOR.inactive
          }
        />
      </TabButton>
    </>
  );

  if (isGlassBar) {
    return (
      <View pointerEvents="box-none" style={styles.container}>
        <GlassView
          glassEffectStyle="regular"
          // タッチに反応してガラスが揺らぐ iOS 26 ネイティブのインタラクションを有効化
          isInteractive
          style={[
            styles.glassBar,
            {
              marginBottom: Math.max(safePad, GLASS_BAR_MIN_BOTTOM_MARGIN),
            },
          ]}
        >
          {tabButtons}
        </GlassView>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View
        style={[
          styles.bar,
          {
            paddingBottom: safePad,
            backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          },
        ]}
      >
        <View style={styles.content}>{tabButtons}</View>
      </View>
    </View>
  );
};

export default React.memo(FooterTabBar);
