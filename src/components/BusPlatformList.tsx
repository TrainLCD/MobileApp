import { memo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import type { Line } from '~/@types/graphql';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isJapanese, translate } from '~/translation';
import { generateLineTestId } from '~/utils/generateTestID';
import type { BusPlatformGroup } from '~/utils/groupBusLinesByPlatform';
import { getLocalizedLineName } from '~/utils/line';
import { CardChevron } from './CardChevron';
import { CommonCard } from './CommonCard';
import Typography from './Typography';

type Props = {
  groups: BusPlatformGroup[];
  onLineSelected: (line: Line) => void;
  disabled?: boolean;
};

const PlatformCard = memo(
  ({
    group,
    onLineSelected,
    disabled,
  }: Omit<Props, 'groups'> & {
    group: BusPlatformGroup;
  }) => {
    const [expanded, setExpanded] = useState(false);
    const colors = useAppColors();
    const title = group.platformCode
      ? translate('busPlatformHeading', { number: group.platformCode })
      : translate('busPlatformOther');
    const stop = group.lines[0]?.station;
    const stopName = isJapanese ? stop?.name : stop?.nameRoman || stop?.name;

    const firstLine = group.lines[0];
    if (!firstLine) return null;

    return (
      <CommonCard
        line={firstLine}
        title={title}
        subtitle={[
          group.platformCode ? stopName : null,
          translate('busRouteCount', { count: group.lines.length }),
        ]
          .filter(Boolean)
          .join(' · ')}
        expanded={expanded}
        onExpandedChange={setExpanded}
        leadingContent={
          group.platformCode ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.badgeBackground },
              ]}
            >
              <Typography
                style={[styles.badgeText, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {group.platformCode}
              </Typography>
            </View>
          ) : (
            <View />
          )
        }
        expandableContent={
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
                  { borderColor: colors.border, opacity: disabled ? 0.5 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.colorBar,
                    { backgroundColor: line.color || colors.accent },
                  ]}
                />
                <Typography style={styles.routeName}>
                  {getLocalizedLineName(line, isJapanese)}
                </Typography>
                <CardChevron stroke={colors.text} />
              </TouchableOpacity>
            ))}
          </View>
        }
      />
    );
  }
);

export const BusPlatformList = memo(({ groups, ...props }: Props) => (
  <View style={styles.list}>
    {groups.map((group) => (
      <PlatformCard key={group.key} group={group} {...props} />
    ))}
  </View>
));

const styles = StyleSheet.create({
  list: { gap: 12 },
  badge: {
    marginRight: 12,
    width: 40,
    height: 40,
    padding: 4,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 20, fontWeight: 'bold' },
  routes: { paddingHorizontal: 12, paddingBottom: 8 },
  route: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  colorBar: { width: 5, alignSelf: 'stretch', borderRadius: 3 },
  routeName: { flex: 1, fontSize: 17, fontWeight: 'bold' },
});
