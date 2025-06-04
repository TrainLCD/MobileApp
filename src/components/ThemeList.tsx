import React, { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { translate } from '~/translation';
import type { SettingsTheme } from '~/utils/theme';
import { useThemeStore } from '../hooks';
import { APP_THEME, type AppTheme } from '../models/Theme';
import { RFValue } from '../utils/rfValue';
import Typography from './Typography';

const styles = StyleSheet.create({
  cell: { paddingHorizontal: 12, paddingVertical: 16 },
  stationNameText: {
    fontSize: RFValue(14),
  },
  descriptionText: {
    fontSize: RFValue(11),
    marginTop: 12,
    fontWeight: 'bold',
  },
  separator: { height: 1, width: '100%', backgroundColor: '#aaa' },
  emptyText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
});

const Separator = () => <View style={styles.separator} />;

const ItemCell = ({
  item,
  isSelected,
  onSelect,
}: {
  item: SettingsTheme;
  onSelect: (item: AppTheme) => void;
  isSelected: boolean;
}) => {
  return (
    <TouchableOpacity style={styles.cell} onPress={() => onSelect(item.value)}>
      <Typography
        style={{
          ...styles.stationNameText,
          fontWeight: isSelected ? 'bold' : 'regular',
        }}
      >
        {item.label}
      </Typography>
      {isSelected ? (
        <Typography style={styles.descriptionText}>
          {translate('currentTheme')}
        </Typography>
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
      style={{
        width: '100%',
        alignSelf: 'center',
        borderColor: isLEDTheme ? '#fff' : '#aaa',
        borderWidth: 1,
      }}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
    />
  );
};
