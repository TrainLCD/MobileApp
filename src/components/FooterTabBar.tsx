import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LED_THEME_BG_COLOR } from '~/constants';
import { useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';

type FooterTab = 'home' | 'search' | 'settings';

export const FOOTER_BASE_HEIGHT = 72; // Figma: h=72px

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
    shadowOpacity: 0.16,
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
  button: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

type Props = {
  active?: FooterTab;
  visible?: boolean;
};

const FooterTabBar: React.FC<Props> = ({ active = 'home', visible = true }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const iconColor = useMemo(
    () => ({
      active: '#0A84FF',
      inactive: '#6B7280', // gray-500 相当
    }),
    []
  );

  if (!visible) return null;

  const safePad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

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
        <View style={styles.content}>
          <Pressable
            style={styles.button}
            accessibilityRole="button"
            onPress={() => {
              navigation.navigate('RouteSearch' as never);
            }}
          >
            <Ionicons
              name={active === 'search' ? 'search' : 'search-outline'}
              size={26}
              color={
                active === 'search' ? iconColor.active : iconColor.inactive
              }
            />
          </Pressable>

          <Pressable
            style={styles.button}
            accessibilityRole="button"
            onPress={() => {
              navigation.navigate('SelectLine' as never);
            }}
          >
            <Ionicons
              name={active === 'home' ? 'navigate' : 'navigate-outline'}
              size={28}
              color={active === 'home' ? iconColor.active : iconColor.inactive}
            />
          </Pressable>

          <Pressable
            style={styles.button}
            accessibilityRole="button"
            onPress={() => {
              navigation.navigate('AppSettings' as never);
            }}
          >
            <Ionicons
              name={active === 'settings' ? 'settings' : 'settings-outline'}
              size={26}
              color={
                active === 'settings' ? iconColor.active : iconColor.inactive
              }
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default React.memo(FooterTabBar);
