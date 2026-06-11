import { Ionicons } from '@expo/vector-icons';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { GlassView } from 'expo-glass-effect';
import { useAtomValue } from 'jotai';
import React, { useCallback, useRef } from 'react';
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

const TAB_BUTTON_SIZE = 48;

// 押下中に沈み込むスケール値
const PRESSED_SCALE = 0.85;

// 押下時は素早く沈み、離した時はバウンドしながら戻す
const PRESS_IN_SPRING = { damping: 24, stiffness: 420 } as const;
const PRESS_OUT_SPRING = { damping: 13, stiffness: 320 } as const;
// アプリ初回マウント時のみ使うピルのスケールイン出現スプリング
const ACTIVE_PILL_SPRING = { damping: 15, stiffness: 280 } as const;
// タブ切り替え時にピルが前のタブ位置からスライドするスプリング。
// Apple Music の選択ハイライトのように、目標位置をわずかに通り過ぎて戻る
// 控えめな弾力を持たせる(減衰比 ≈ 0.8。臨界減衰は 2√stiffness ≈ 37)。
// 減衰比 0.7 ではオーバーシュートが移動距離の約 5% となり離れたタブ間で
// はみ出しが過剰だったため、約 1.5% に抑えている
const PILL_SLIDE_SPRING = {
  damping: 30,
  stiffness: 350,
} as const;

// 直前の画面でアクティブだったタブ。タブバーは画面ごとに再マウントされるため、
// マウントをまたいだピルのスライド元をモジュールスコープで保持する
let lastActiveTab: FooterTab | null = null;

// テスト専用。モジュールスコープの lastActiveTab がテスト間でリークして
// 順序依存にならないよう、beforeEach でリセットするためのヘルパー
export const resetLastActiveTabForTesting = (): void => {
  lastActiveTab = null;
};

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
    width: TAB_BUTTON_SIZE,
    height: TAB_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // タブバー全体で 1 つだけ描画する共有ピル。translateX でアクティブタブ間をスライドする
  activePill: {
    position: 'absolute',
    top: (GLASS_BAR_HEIGHT - TAB_BUTTON_SIZE) / 2,
    left: 0,
    width: TAB_BUTTON_SIZE,
    height: TAB_BUTTON_SIZE,
    borderRadius: TAB_BUTTON_SIZE / 2,
    backgroundColor: ACTIVE_PILL_COLOR,
  },
});

type TabButtonProps = {
  active: boolean;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  buttonRef?: React.Ref<View>;
  children: React.ReactNode;
};

const TabButton: React.FC<TabButtonProps> = ({
  active,
  onPress,
  onLayout,
  buttonRef,
  children,
}) => {
  const pressScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(PRESSED_SCALE, PRESS_IN_SPRING);
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, PRESS_OUT_SPRING);
  }, [pressScale]);

  const pressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
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
  const route = useRoute();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  // タブ間の移動で履歴を積まないよう navigate ではなく replace で遷移する。
  // 同一画面への replace は画面の再マウントになるだけなので無視する
  const replaceTo = useCallback(
    (screen: string) => {
      if (route.name === screen) return;
      navigation.dispatch(StackActions.replace(screen));
    },
    [navigation, route.name]
  );
  const searchButtonRef = useRef<View>(null);
  const settingsButtonRef = useRef<View>(null);

  const pillTranslateX = useSharedValue(0);
  // 0 → 1 でピルがスケールインする。初回マウント時の出現にのみ使い、
  // タブ切り替え時は 1 のままスライドだけを行う
  const pillProgress = useSharedValue(0);
  const pillBaseXRef = useRef<number | null>(null);
  const slotXsRef = useRef<Partial<Record<FooterTab, number>>>({});
  const pillPlacedRef = useRef(false);

  // ピル自身と各タブの onLayout が揃った時点で一度だけ配置を確定する。
  // 直前の画面でアクティブだったタブが異なる場合は、その位置からスライドさせて
  // Apple Music のように選択ハイライトが移動して見えるようにする
  const placePillIfReady = useCallback(() => {
    if (pillPlacedRef.current) return;
    const baseX = pillBaseXRef.current;
    const activeX = slotXsRef.current[active];
    if (baseX == null || activeX == null) return;
    const fromTab = lastActiveTab;
    const fromX = fromTab == null ? null : slotXsRef.current[fromTab];
    // スライド元スロットの位置が未測定なら、その onLayout を待つ
    if (fromTab != null && fromTab !== active && fromX == null) return;
    pillPlacedRef.current = true;
    lastActiveTab = active;
    if (fromTab != null && fromTab !== active && fromX != null) {
      pillProgress.value = 1;
      pillTranslateX.value = fromX - baseX;
      pillTranslateX.value = withSpring(activeX - baseX, PILL_SLIDE_SPRING);
      return;
    }
    pillTranslateX.value = activeX - baseX;
    // 同一タブ内の画面遷移（設定サブ画面間など）ではアニメーションを再生しない
    pillProgress.value =
      fromTab === active ? 1 : withSpring(1, ACTIVE_PILL_SPRING);
  }, [active, pillProgress, pillTranslateX]);

  const handlePillLayout = useCallback(
    (event: LayoutChangeEvent) => {
      pillBaseXRef.current = event.nativeEvent.layout.x;
      placePillIfReady();
    },
    [placePillIfReady]
  );

  const registerSlotLayout = useCallback(
    (tab: FooterTab, event: LayoutChangeEvent) => {
      const x = event.nativeEvent.layout.x;
      const prevX = slotXsRef.current[tab];
      slotXsRef.current[tab] = x;
      if (pillPlacedRef.current) {
        // 配置確定後のレイアウト変化（回転など）にはアニメーションなしで追従する
        if (tab === active && prevX !== x && pillBaseXRef.current != null) {
          pillTranslateX.value = x - pillBaseXRef.current;
        }
        return;
      }
      placePillIfReady();
    },
    [active, pillTranslateX, placePillIfReady]
  );

  const handleSearchButtonLayout = useCallback(
    (event: LayoutChangeEvent) => {
      registerSlotLayout('search', event);
      if (onSearchButtonLayout && searchButtonRef.current) {
        searchButtonRef.current.measureInWindow((x, y, width, height) => {
          onSearchButtonLayout({ x, y, width, height });
        });
      }
    },
    [onSearchButtonLayout, registerSlotLayout]
  );

  const handleHomeButtonLayout = useCallback(
    (event: LayoutChangeEvent) => {
      registerSlotLayout('home', event);
    },
    [registerSlotLayout]
  );

  const handleSettingsButtonLayout = useCallback(
    (event: LayoutChangeEvent) => {
      registerSlotLayout('settings', event);
      if (onSettingsButtonLayout && settingsButtonRef.current) {
        settingsButtonRef.current.measureInWindow((x, y, width, height) => {
          onSettingsButtonLayout({ x, y, width, height });
        });
      }
    },
    [onSettingsButtonLayout, registerSlotLayout]
  );

  const pillAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pillProgress.value,
    transform: [
      { translateX: pillTranslateX.value },
      { scale: 0.5 + pillProgress.value * 0.5 },
    ],
  }));

  if (!visible) return null;

  const safePad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  // LED テーマは独自の質感を持つためガラス化せず従来のソリッドなバーを維持する
  const isGlassBar = LIQUID_GLASS_AVAILABLE && !isLEDTheme;

  const tabButtons = (
    <>
      <TabButton
        buttonRef={searchButtonRef}
        active={active === 'search'}
        onPress={() => {
          replaceTo('RouteSearch');
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
        onPress={() => {
          replaceTo('SelectLine');
        }}
        onLayout={handleHomeButtonLayout}
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
        onPress={() => {
          replaceTo('AppSettings');
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
          <Animated.View
            testID="footer-active-pill"
            pointerEvents="none"
            onLayout={handlePillLayout}
            style={[styles.activePill, pillAnimatedStyle]}
          />
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
