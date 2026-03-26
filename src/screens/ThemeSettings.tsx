import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue, useSetAtom } from 'jotai';
import { lighten } from 'polished';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  Animated as RNAnimated,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Button from '~/components/Button';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import { ThemeConfirmModal } from '~/components/ThemeConfirmModal';
import { StatePanel } from '~/components/ToggleButton';
import Typography from '~/components/Typography';
import { APP_THEME, type AppTheme } from '~/models/Theme';
import { isLEDThemeAtom, themeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { isDevApp } from '~/utils/isDevApp';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import { getSettingsThemes } from '~/utils/theme';
import { ASYNC_STORAGE_KEYS, IN_USE_COLOR_MAP } from '../constants';

type SettingItem = {
  id: AppTheme;
  title: string;
  hidden: boolean;
};

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  screenBg: {
    backgroundColor: '#FAFAFA',
  },
  title: {
    flex: 1,
    fontSize: isTablet ? RFValue(12) : RFValue(14),
    fontWeight: 'bold',
  },
});

const SettingsItem = ({
  item,
  isFirst,
  isLast,
  state,
  onToggle,
}: {
  item: SettingItem;
  isFirst: boolean;
  isLast: boolean;
  state: boolean;
  onToggle: (event: GestureResponderEvent) => void;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const themeColor = IN_USE_COLOR_MAP[item.id];

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={item.title}
      accessibilityState={{ checked: state }}
      onPress={onToggle}
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
          colors={[themeColor, lighten(0.1, themeColor)]}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        />
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

const ThemeSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [pendingTheme, setPendingTheme] = useState<SettingItem | null>(null);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const currentTheme = useAtomValue(themeAtom);
  const setTheme = useSetAtom(themeAtom);

  const navigation = useNavigation();

  const SETTING_ITEMS: SettingItem[] = useMemo(() => {
    const themes = getSettingsThemes();
    return themes.map((theme) => ({
      id: theme.value,
      title: theme.label,
      hidden: !isDevApp && theme.devOnly,
    }));
  }, []);

  const visibleItems = useMemo(
    () => SETTING_ITEMS.filter((item) => !item.hidden),
    [SETTING_ITEMS]
  );

  const handleApplyTheme = useCallback(
    async (theme: AppTheme) => {
      try {
        await AsyncStorage.setItem(ASYNC_STORAGE_KEYS.PREVIOUS_THEME, theme);
        setTheme(theme);
      } catch (error) {
        console.error('Failed to toggle theme setting', error);
        Alert.alert(
          translate('errorTitle'),
          translate('failedToSavePreference')
        );
      }
    },
    [setTheme]
  );

  const handleConfirmThemeChange = useCallback(() => {
    if (pendingTheme) {
      handleApplyTheme(pendingTheme.id);
      setPendingTheme(null);
    }
  }, [pendingTheme, handleApplyTheme]);

  const handleCloseModal = useCallback(() => {
    setPendingTheme(null);
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: SettingItem; index: number }) => {
      const state = currentTheme === item.id;

      const onToggle = () => {
        if (state) {
          return;
        }
        setPendingTheme(item);
      };

      return (
        <SettingsItem
          item={item}
          isFirst={index === 0}
          isLast={index === visibleItems.length - 1}
          onToggle={onToggle}
          state={state}
        />
      );
    },
    [visibleItems.length, currentTheme]
  );

  const keyExtractor = useCallback((item: SettingItem) => item.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<SettingItem> | null | undefined, index: number) => ({
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
      <View
        style={[styles.root, currentTheme !== APP_THEME.LED && styles.screenBg]}
      >
        <Animated.FlatList
          data={visibleItems}
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
        title={translate('theme')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
      <ThemeConfirmModal
        visible={pendingTheme !== null}
        themeId={pendingTheme?.id ?? null}
        themeTitle={pendingTheme?.title ?? ''}
        onClose={handleCloseModal}
        onConfirm={handleConfirmThemeChange}
      />
    </>
  );
};

export default React.memo(ThemeSettingsScreen);
