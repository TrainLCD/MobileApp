import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue, useSetAtom } from 'jotai';
import { lighten } from 'polished';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import {
  COLOR_SCHEME_PREFERENCE,
  type ColorSchemePreference,
} from '~/models/ColorScheme';
import { useAppColors } from '~/providers/AppColorsProvider';
import { colorSchemePreferenceAtom } from '~/store/atoms/colorScheme';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import { STORAGE_KEYS } from '../constants';
import { storage } from '../lib/storage';

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

const ColorSchemeSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const currentPreference = useAtomValue(colorSchemePreferenceAtom);
  const setColorSchemePreference = useSetAtom(colorSchemePreferenceAtom);

  const navigation = useNavigation();

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
    </>
  );
};

export default React.memo(ColorSchemeSettingsScreen);
