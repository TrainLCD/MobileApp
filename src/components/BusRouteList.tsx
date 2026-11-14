import { memo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isJapanese } from '~/translation';
import { generateLineTestId } from '~/utils/generateTestID';
import {
  type BusRouteGroup,
  getBusRouteLabel,
} from '~/utils/groupBusLinesByRoute';
import { CardChevron } from './CardChevron';
import { CommonCard, LineBounds } from './CommonCard';
import Typography from './Typography';

type Props = {
  groups: BusRouteGroup[];
  stationsByLineId?: ReadonlyMap<number, Station[]>;
  onLineSelected: (line: Line) => void;
  disabled?: boolean;
};

const RouteCard = memo(
  ({
    group,
    stationsByLineId,
    onLineSelected,
    disabled,
  }: Omit<Props, 'groups'> & {
    group: BusRouteGroup;
  }) => {
    const [expanded, setExpanded] = useState(false);
    const colors = useAppColors();
    const firstLine = group.lines[0];
    if (!firstLine) return null;
    const multiple = group.lines.length > 1;
    const title = isJapanese ? group.name : firstLine.nameRoman || group.name;
    const codes = group.lines.map((line) => getBusRouteLabel(line).code);
    const codeCounts = new Map<string, number>();
    for (const code of codes) {
      codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    }
    const routeDescription = (line: Line) => {
      const { code } = getBusRouteLabel(line);
      // GTFS の路線長名（翻訳があれば英語）は nameRoman に格納されています。
      // 同じ系統番号が並ぶ場合だけ、取得済みの詳細名を補足します。
      const detail = line.nameRoman?.trim();
      const showDetail =
        isJapanese &&
        (codeCounts.get(code) ?? 0) > 1 &&
        detail &&
        ![code, group.name, line.nameShort?.trim()].includes(detail);
      return showDetail ? detail : '';
    };

    return (
      <CommonCard
        line={firstLine}
        title={title}
        stations={stationsByLineId?.get(firstLine.id ?? -1)}
        neutral={multiple}
        testID={multiple ? undefined : generateLineTestId(firstLine)}
        disabled={!multiple && disabled}
        onPress={() => onLineSelected(firstLine)}
        expanded={expanded}
        onExpandedChange={setExpanded}
        expandableContent={
          multiple ? (
            <View
              style={[styles.routes, { backgroundColor: colors.cardExpanded }]}
            >
              {group.lines.map((line) => (
                <TouchableOpacity
                  key={line.id}
                  testID={generateLineTestId(line)}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!disabled }}
                  disabled={disabled || !expanded}
                  onPress={() => onLineSelected(line)}
                  style={[
                    styles.route,
                    {
                      backgroundColor: colors.badgeBackground,
                      opacity: disabled ? 0.5 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: line.color || colors.accent },
                    ]}
                  >
                    <Typography style={styles.badgeText}>
                      {getBusRouteLabel(line).code}
                    </Typography>
                  </View>
                  <View style={styles.routeLabels}>
                    <Typography style={styles.routeName}>
                      {isJapanese
                        ? getBusRouteLabel(line).name
                        : line.nameRoman?.trim() || getBusRouteLabel(line).name}
                    </Typography>
                    {!!routeDescription(line) && (
                      <Typography
                        style={[
                          styles.routeDescription,
                          { color: colors.mutedText },
                        ]}
                      >
                        {routeDescription(line)}
                      </Typography>
                    )}
                    <LineBounds
                      stations={stationsByLineId?.get(line.id ?? -1)}
                      color={colors.mutedText}
                    />
                  </View>
                  <CardChevron stroke={colors.text} />
                </TouchableOpacity>
              ))}
            </View>
          ) : undefined
        }
      />
    );
  }
);

export const BusRouteList = memo(({ groups, ...props }: Props) => (
  <View style={styles.list}>
    {groups.map((group) => (
      <RouteCard key={group.key} group={group} {...props} />
    ))}
  </View>
));

const styles = StyleSheet.create({
  list: { gap: 18 },
  badge: { padding: 6, borderRadius: 7, flexShrink: 1 },
  badgeText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  routes: { gap: 6 },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 49,
    padding: 10,
    borderRadius: 8,
  },
  routeLabels: { flex: 1, gap: 2 },
  routeName: { fontSize: 14 },
  routeDescription: { fontSize: 12 },
});
