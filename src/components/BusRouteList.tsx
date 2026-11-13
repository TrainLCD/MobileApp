import { memo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { Line } from '~/@types/graphql';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isJapanese, translate } from '~/translation';
import { generateLineTestId } from '~/utils/generateTestID';
import {
  type BusRouteGroup,
  getBusRouteLabel,
} from '~/utils/groupBusLinesByRoute';
import { CardChevron } from './CardChevron';
import { CommonCard } from './CommonCard';
import Typography from './Typography';

type Props = {
  groups: BusRouteGroup[];
  onLineSelected: (line: Line) => void;
  disabled?: boolean;
};

const RouteCard = memo(
  ({
    group,
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
    const platformLabel = (line: Line) => {
      const code = line.station?.platformCode?.trim();
      return code && /^\d+$/.test(code)
        ? translate('busPlatformHeading', { number: code })
        : '';
    };
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
        (codeCounts.get(code) ?? 0) > 1 &&
        detail &&
        ![code, group.name, line.nameShort?.trim()].includes(detail);
      return [showDetail ? detail : '', platformLabel(line)]
        .filter(Boolean)
        .join(' / ');
    };
    const subtitle = [
      [...new Set(codes)].filter((code) => code !== title).join('・'),
      multiple
        ? translate('busRouteCount', { count: group.lines.length })
        : platformLabel(firstLine),
    ]
      .filter(Boolean)
      .join(' / ');

    return (
      <CommonCard
        line={firstLine}
        title={title}
        subtitle={subtitle}
        neutral
        testID={multiple ? undefined : generateLineTestId(firstLine)}
        disabled={!multiple && disabled}
        onPress={() => onLineSelected(firstLine)}
        expanded={expanded}
        onExpandedChange={setExpanded}
        leadingContent={<View />}
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
                  <Typography style={styles.routeName}>
                    {routeDescription(line)}
                  </Typography>
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
  routeName: { flex: 1, fontSize: 14 },
});
