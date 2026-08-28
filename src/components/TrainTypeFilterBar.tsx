import { Ionicons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { LED_THEME_BG_COLOR } from '~/constants';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import {
  EMPTY_TRAIN_TYPE_FILTER,
  isTrainTypeFilterActive,
  type TrainTypeFilterOption,
  type TrainTypeFilterOptions,
  type TrainTypeFilterState,
  toggleTrainTypeFilterValue,
} from '~/utils/trainTypeFilter';
import { SearchBar } from './SearchBar';
import Typography from './Typography';

/**
 * モーダルヘッダーの左右パディング。展開パネルはこの分だけ外側へはみ出させて
 * 全幅に敷き、「軸チップとは別の入力面」に見せる。
 */
const HEADER_HORIZONTAL_INSET = 24;
/** パネルを閉じているときにヘッダー下端との間に残す余白 */
const CLOSED_BOTTOM_INSET = 12;
/** 展開パネルを背景から一段浮かせる面の色（電光掲示板風テーマ用） */
const LED_SURFACE_COLOR = '#333';

type AxisKey = 'typeNames' | 'lines';

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  rootClosed: {
    paddingBottom: CLOSED_BOTTOM_INSET,
  },
  search: {
    marginTop: 12,
  },
  chipsRow: {
    marginTop: 10,
  },
  chipsRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 2,
  },
  chipText: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
  },
  badge: {
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
  panel: {
    marginTop: 10,
    marginHorizontal: -HEADER_HORIZONTAL_INSET,
    paddingHorizontal: HEADER_HORIZONTAL_INSET,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  panelHeadText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  panelResetText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  panelChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  valueChipText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

type Props = {
  options: TrainTypeFilterOptions;
  filter: TrainTypeFilterState;
  onChange: (next: TrainTypeFilterState) => void;
};

export const TrainTypeFilterBar = ({ options, filter, onChange }: Props) => {
  const colors = useAppColors();
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const [openAxis, setOpenAxis] = useState<AxisKey | null>(null);

  // 電光掲示板風テーマは黒地に白抜きの独自配色を持つので、選択状態の塗りも反転させる
  const palette = useMemo(
    () => ({
      surface: isLEDTheme ? LED_THEME_BG_COLOR : colors.surface,
      chipBorder: isLEDTheme ? '#fff' : colors.accent,
      chipFill: isLEDTheme ? '#fff' : colors.accent,
      chipTextOn: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
      chipTextOff: isLEDTheme ? '#fff' : colors.accent,
      badgeFill: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
      badgeText: isLEDTheme ? '#fff' : colors.accent,
      clearBorder: isLEDTheme ? '#fff' : colors.strongBorder,
      clearText: isLEDTheme ? '#fff' : colors.secondaryText,
      panelBackground: isLEDTheme ? LED_SURFACE_COLOR : colors.cardExpanded,
      panelBorder: isLEDTheme ? '#fff' : colors.border,
      panelHeadText: isLEDTheme ? '#fff' : colors.secondaryText,
      valueBorder: isLEDTheme ? '#fff' : colors.border,
      valueFillOff: isLEDTheme ? LED_THEME_BG_COLOR : colors.card,
      valueTextOff: isLEDTheme ? '#fff' : colors.text,
    }),
    [colors, isLEDTheme]
  );

  const filterActive = isTrainTypeFilterActive(filter);

  const handleQueryChange = useCallback(
    (query: string) => onChange({ ...filter, query }),
    [filter, onChange]
  );

  // 絞り込みは 1 文字ごとに反映されるので、検索ボタンと送信キーはキーボードを
  // 畳んで結果を見せる役に回す
  const handleSubmitQuery = useCallback(() => Keyboard.dismiss(), []);

  const handleClearAll = useCallback(() => {
    setOpenAxis(null);
    onChange(EMPTY_TRAIN_TYPE_FILTER);
  }, [onChange]);

  const handleToggleAxis = useCallback(
    (axis: AxisKey) => setOpenAxis((prev) => (prev === axis ? null : axis)),
    []
  );

  const handleToggleTypeName = useCallback(
    (value: string) =>
      onChange({
        ...filter,
        typeNames: toggleTrainTypeFilterValue(filter.typeNames, value),
      }),
    [filter, onChange]
  );

  const handleToggleLineId = useCallback(
    (value: number) =>
      onChange({
        ...filter,
        lineIds: toggleTrainTypeFilterValue(filter.lineIds, value),
      }),
    [filter, onChange]
  );

  const handleResetAxis = useCallback(
    (axis: AxisKey) =>
      onChange(
        axis === 'typeNames'
          ? { ...filter, typeNames: [] }
          : { ...filter, lineIds: [] }
      ),
    [filter, onChange]
  );

  const renderAxisChip = (
    axis: AxisKey,
    label: string,
    selectedCount: number
  ) => {
    const open = openAxis === axis;
    const on = selectedCount > 0;

    return (
      <TouchableOpacity
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, selected: on }}
        testID={`trainTypeFilterAxis-${axis}`}
        onPress={() => handleToggleAxis(axis)}
        style={[
          styles.chip,
          {
            borderColor: palette.chipBorder,
            backgroundColor: on ? palette.chipFill : palette.surface,
          },
        ]}
      >
        <Typography
          numberOfLines={1}
          style={[
            styles.chipText,
            { color: on ? palette.chipTextOn : palette.chipTextOff },
          ]}
        >
          {label}
        </Typography>
        {on ? (
          <View style={[styles.badge, { backgroundColor: palette.badgeFill }]}>
            <Typography
              style={[styles.badgeText, { color: palette.badgeText }]}
            >
              {selectedCount}
            </Typography>
          </View>
        ) : null}
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={on ? palette.chipTextOn : palette.chipTextOff}
        />
      </TouchableOpacity>
    );
  };

  const renderValueChip = <T extends string | number>(
    option: TrainTypeFilterOption<T>,
    selected: boolean,
    onPress: (value: T) => void
  ) => (
    <TouchableOpacity
      key={String(option.value)}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      testID={`trainTypeFilterValue-${option.value}`}
      onPress={() => onPress(option.value)}
      style={[
        styles.valueChip,
        {
          borderColor: selected ? palette.chipFill : palette.valueBorder,
          backgroundColor: selected ? palette.chipFill : palette.valueFillOff,
        },
      ]}
    >
      <Typography
        numberOfLines={1}
        style={[
          styles.valueChipText,
          { color: selected ? palette.chipTextOn : palette.valueTextOff },
        ]}
      >
        {option.label}
      </Typography>
      {selected ? (
        <Ionicons name="checkmark" size={14} color={palette.chipTextOn} />
      ) : null}
    </TouchableOpacity>
  );

  const renderPanel = () => {
    if (!openAxis) {
      return null;
    }

    const isTypeAxis = openAxis === 'typeNames';

    return (
      <View
        style={[
          styles.panel,
          {
            backgroundColor: palette.panelBackground,
            borderTopColor: palette.panelBorder,
          },
        ]}
      >
        <View style={styles.panelHead}>
          <Typography
            style={[styles.panelHeadText, { color: palette.panelHeadText }]}
          >
            {translate(
              isTypeAxis
                ? 'trainTypeFilterTypeHeading'
                : 'trainTypeFilterLineHeading'
            )}
          </Typography>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => handleResetAxis(openAxis)}
          >
            <Typography
              style={[
                styles.panelResetText,
                { color: isLEDTheme ? '#fff' : colors.accent },
              ]}
            >
              {translate('trainTypeFilterResetAxis')}
            </Typography>
          </TouchableOpacity>
        </View>
        <View style={styles.panelChips}>
          {isTypeAxis
            ? options.typeNames.map((option) =>
                renderValueChip(
                  option,
                  filter.typeNames.includes(option.value),
                  handleToggleTypeName
                )
              )
            : options.lines.map((option) =>
                renderValueChip(
                  option,
                  filter.lineIds.includes(option.value),
                  handleToggleLineId
                )
              )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, openAxis ? null : styles.rootClosed]}>
      <View style={styles.search}>
        <SearchBar
          value={filter.query}
          onChangeText={handleQueryChange}
          onSearch={handleSubmitQuery}
          placeholder={translate('trainTypeFilterPlaceholder')}
          clearable
          autoCapitalize="none"
          testID="trainTypeFilterSearchInput"
          clearButtonTestID="trainTypeFilterClearQuery"
        />
      </View>

      <ScrollView
        horizontal
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsRowContent}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {options.typeNames.length > 1
          ? renderAxisChip(
              'typeNames',
              translate('trainTypeFilterAxisType'),
              filter.typeNames.length
            )
          : null}
        {options.lines.length > 1
          ? renderAxisChip(
              'lines',
              translate('trainTypeFilterAxisLine'),
              filter.lineIds.length
            )
          : null}
        {filterActive ? (
          <TouchableOpacity
            activeOpacity={1}
            accessibilityRole="button"
            onPress={handleClearAll}
            testID="trainTypeFilterClear"
            style={[
              styles.chip,
              {
                borderColor: palette.clearBorder,
                backgroundColor: palette.surface,
              },
            ]}
          >
            <Typography
              numberOfLines={1}
              style={[styles.chipText, { color: palette.clearText }]}
            >
              {translate('trainTypeFilterClear')}
            </Typography>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      {renderPanel()}
    </View>
  );
};
