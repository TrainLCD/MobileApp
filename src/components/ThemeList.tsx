import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { translate } from '~/translation';
import type { SettingsTheme } from '~/utils/theme';
import { useThemeStore } from '../hooks';
import { APP_THEME, type AppTheme } from '../models/Theme';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

const styles = StyleSheet.create({
  list: {
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
  },
  cell: {
    paddingHorizontal: 24,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stationNameText: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  activeContainer: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  activeText: {
    fontSize: RFValue(11),
    fontWeight: 'bold',
    color: 'white',
  },
  separator: { height: 1, width: '100%', backgroundColor: '#cfcfcf' },
  emptyText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const Separator = () => <View style={styles.separator} />;

const IN_USE_COLOR_MAP: Record<AppTheme, string> = {
  TOKYO_METRO: '#00a9ce',
  TY: '#dc143c',
  YAMANOTE: '#9acd32',
  JR_WEST: '#0072bc',
  SAIKYO: '#00ac9a',
  TOEI: '#45B035',
  LED: '#212121',
  JO: '#0067C0',
  JL: '#808080',
  JR_KYUSHU: '#E50012',
};

const ItemCell = ({
  item,
  isSelected,
  onSelect,
}: {
  item: SettingsTheme;
  onSelect: (item: AppTheme) => void;
  isSelected: boolean;
}) => {
  const theme = useThemeStore((state) => state);
  const isLEDTheme = useMemo(() => theme === APP_THEME.LED, [theme]);

  const rootBackgroundColor = useMemo(() => {
    if (isLEDTheme) {
      return 'transparent';
    }
    return isSelected ? '#f5f5f5' : '#fff';
  }, [isSelected, isLEDTheme]);

  return (
    <TouchableOpacity
      style={[
        styles.cell,
        {
          backgroundColor: rootBackgroundColor,
        },
      ]}
      onPress={() => onSelect(item.value)}
    >
      <Typography style={styles.stationNameText}>{item.label}</Typography>
      {isSelected ? (
        <View
          style={[
            styles.activeContainer,
            {
              backgroundColor: IN_USE_COLOR_MAP[theme],
            },
          ]}
        >
          <Typography style={styles.activeText}>
            {translate('inUse')}
          </Typography>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

export const ThemeList = ({
  data,
  onSelect,
}: {
  data: SettingsTheme[];
  onSelect: (item: AppTheme) => void;
}) => {
  const theme = useThemeStore((state) => state);
  const isLEDTheme = useMemo(() => theme === APP_THEME.LED, [theme]);

  const renderItem = useCallback(
    ({ item }: { item: SettingsTheme; index: number }) => {
      return (
        <ItemCell
          item={item}
          onSelect={onSelect}
          isSelected={item.value === theme}
        />
      );
    },
    [onSelect, theme]
  );
  const keyExtractor = useCallback(
    (item: SettingsTheme) => item.value.toString(),
    []
  );

  return (
    <FlatList
      initialNumToRender={data.length}
      style={[
        styles.list,
        {
          borderColor: isLEDTheme ? '#fff' : '#aaa',
        },
      ]}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
    />
  );
};
