import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue, useSetAtom } from 'jotai';
import { lighten } from 'polished';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  type GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';
import Button from '~/components/Button';
import { CustomModal } from '~/components/CustomModal';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import { StatePanel } from '~/components/ToggleButton';
import Typography from '~/components/Typography';
import { APP_THEME, type AppTheme } from '~/models/Theme';
import { isLEDThemeAtom, themeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { isDevApp } from '~/utils/isDevApp';
import { getSettingsThemes } from '~/utils/theme';
import {
  ASYNC_STORAGE_KEYS,
  IN_USE_COLOR_MAP,
  LED_THEME_BG_COLOR,
} from '../constants';

type SettingItem = {
  id: AppTheme;
  title: string;
  hidden: boolean;
};

const getThemeDescription = (theme: AppTheme): string => {
  const descriptionMap: Record<AppTheme, string> = {
    [APP_THEME.TOKYO_METRO]: translate('themeDescriptionTokyoMetro'),
    [APP_THEME.TOEI]: translate('themeDescriptionToei'),
    [APP_THEME.YAMANOTE]: translate('themeDescriptionYamanote'),
    [APP_THEME.JR_WEST]: translate('themeDescriptionJrWest'),
    [APP_THEME.TY]: translate('themeDescriptionTy'),
    [APP_THEME.SAIKYO]: translate('themeDescriptionSaikyo'),
    [APP_THEME.LED]: translate('themeDescriptionLed'),
    [APP_THEME.JO]: translate('themeDescriptionJo'),
    [APP_THEME.JL]: translate('themeDescriptionJl'),
    [APP_THEME.JR_KYUSHU]: translate('themeDescriptionJrKyushu'),
  };
  return descriptionMap[theme];
};

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  screenBg: {
    backgroundColor: '#FAFAFA',
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
      <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
        {item.title}
      </Typography>

      <StatePanel
        state={state}
        onText={translate('inUse')}
        offText={translate('settings')}
      />
    </Pressable>
  );
};

const ThemeSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [pendingTheme, setPendingTheme] = useState<SettingItem | null>(null);

  const scrollY = useSharedValue(0);

  const currentTheme = useAtomValue(themeAtom);
  const setTheme = useSetAtom(themeAtom);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

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

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

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
      <CustomModal
        visible={pendingTheme !== null}
        onClose={handleCloseModal}
        contentContainerStyle={{
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          padding: 24,
        }}
      >
        {pendingTheme && (
          <View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: isLEDTheme ? 0 : 8,
                  overflow: 'hidden',
                  marginRight: 12,
                }}
              >
                <LinearGradient
                  colors={[
                    IN_USE_COLOR_MAP[pendingTheme.id],
                    lighten(0.1, IN_USE_COLOR_MAP[pendingTheme.id]),
                  ]}
                  style={{ flex: 1 }}
                />
              </View>
              <Typography
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  flex: 1,
                }}
              >
                {pendingTheme.title}
              </Typography>
            </View>
            <Typography
              style={{
                fontSize: 16,
                lineHeight: 24,
                marginBottom: 16,
              }}
            >
              {getThemeDescription(pendingTheme.id)}
            </Typography>
            <View
              style={{
                width: '100%',
                aspectRatio: 16 / 9,
                backgroundColor: isLEDTheme ? '#444' : '#e0e0e0',
                borderRadius: isLEDTheme ? 0 : 8,
                marginBottom: 24,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* TODO: テーマのスクリーンショットを表示 */}
              <Typography
                style={{
                  fontSize: 14,
                  color: isLEDTheme ? '#888' : '#999',
                }}
              >
                Preview
              </Typography>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: 12,
              }}
            >
              <Button
                style={{ minWidth: 100 }}
                textStyle={{ fontWeight: 'bold' }}
                onPress={handleCloseModal}
                outline
              >
                {translate('cancel')}
              </Button>
              <Button
                style={{ minWidth: 100 }}
                textStyle={{ fontWeight: 'bold' }}
                onPress={handleConfirmThemeChange}
              >
                {translate('themeConfirmApply')}
              </Button>
            </View>
          </View>
        )}
      </CustomModal>
    </>
  );
};

export default React.memo(ThemeSettingsScreen);
