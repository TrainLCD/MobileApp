import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import { lighten } from 'polished';
import type React from 'react';
import { useCallback, useMemo } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  AUTO_THEME_GRADIENT_COLORS,
  IN_USE_COLOR_MAP,
  LED_THEME_BG_COLOR,
} from '~/constants';
import { THEME_PREFERENCE, type ThemePreference } from '~/models/Theme';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import { getSettingsThemes, type SettingsTheme } from '~/utils/theme';
import Button from './Button';
import { CustomModal } from './CustomModal';
import { Heading } from './Heading';
import { StatePanel } from './ToggleButton';
import Typography from './Typography';

const ITEM_HEIGHT = 72;
const HEADER_HEIGHT = 64;
const FOOTER_HEIGHT = 72;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentView: {
    width: '100%',
    overflow: 'hidden',
  },
  list: {
    flex: 1,
  },
  headerContainer: {
    height: HEADER_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  closeButtonContainer: {
    height: FOOTER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  closeButton: { width: '100%' },
  closeButtonText: { fontWeight: 'bold' },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingHorizontal: 16,
  },
  swatch: {
    width: 44,
    height: 44,
    overflow: 'hidden',
    marginRight: 16,
  },
  swatchInner: { flex: 1 },
  title: {
    flex: 1,
    fontSize: isTablet ? RFValue(12) : RFValue(14),
    fontWeight: 'bold',
  },
});

type Props = {
  visible: boolean;
  currentPreference: ThemePreference;
  onClose: () => void;
  onSelect: (preference: ThemePreference) => void;
};

export const ThemeListModal: React.FC<Props> = ({
  visible,
  currentPreference,
  onClose,
  onSelect,
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const { height: windowHeight } = useWindowDimensions();

  const items = useMemo(() => getSettingsThemes(), []);

  const dynamicHeight = useMemo(() => {
    const content = HEADER_HEIGHT + items.length * ITEM_HEIGHT + FOOTER_HEIGHT;
    return Math.min(content, windowHeight * 0.8);
  }, [items.length, windowHeight]);

  const renderItem = useCallback(
    ({ item, index }: { item: SettingsTheme; index: number }) => {
      const isAuto = item.value === THEME_PREFERENCE.AUTO;
      const themeColor = isAuto
        ? AUTO_THEME_GRADIENT_COLORS[0]
        : IN_USE_COLOR_MAP[item.value as keyof typeof IN_USE_COLOR_MAP];
      const isFirst = index === 0;
      const isLast = index === items.length - 1;
      const selected = currentPreference === item.value;

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected }}
          onPress={() => onSelect(item.value)}
          style={[
            styles.item,
            {
              backgroundColor: isLEDTheme ? '#333' : '#fff',
              borderTopLeftRadius: isFirst && !isLEDTheme ? 12 : 0,
              borderTopRightRadius: isFirst && !isLEDTheme ? 12 : 0,
              borderBottomLeftRadius: isLast && !isLEDTheme ? 12 : 0,
              borderBottomRightRadius: isLast && !isLEDTheme ? 12 : 0,
            },
          ]}
        >
          <View style={[styles.swatch, { borderRadius: isLEDTheme ? 0 : 8 }]}>
            <LinearGradient
              colors={
                isAuto
                  ? AUTO_THEME_GRADIENT_COLORS
                  : [themeColor, lighten(0.1, themeColor)]
              }
              style={styles.swatchInner}
            />
          </View>
          <Typography style={styles.title}>{item.label}</Typography>
          <StatePanel
            state={selected}
            onText={translate('inUse')}
            offText={translate('select')}
          />
        </Pressable>
      );
    },
    [items.length, currentPreference, isLEDTheme, onSelect]
  );

  const keyExtractor = useCallback((item: SettingsTheme) => item.value, []);

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      containerStyle={styles.root}
      contentContainerStyle={[
        styles.contentView,
        {
          height: dynamicHeight,
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#FAFAFA',
          borderRadius: isLEDTheme ? 0 : 8,
        },
        isTablet && {
          width: '80%',
          maxHeight: '80%',
          borderRadius: isLEDTheme ? 0 : 16,
        },
      ]}
    >
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#FAFAFA' },
        ]}
      >
        <Heading>{translate('theme')}</Heading>
      </View>
      <FlatList<SettingsTheme>
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={Platform.OS === 'android'}
      />
      <View style={styles.closeButtonContainer}>
        <Button
          style={styles.closeButton}
          textStyle={styles.closeButtonText}
          onPress={onClose}
        >
          {translate('close')}
        </Button>
      </View>
    </CustomModal>
  );
};
