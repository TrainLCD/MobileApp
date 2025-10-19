import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import type { Line, Station } from '~/@types/graphql';
import { NUMBERING_ICON_SIZE } from '~/constants';
import { useThemeStore } from '~/hooks';
import { useGetLineMark } from '~/hooks/useGetLineMark';
import { APP_THEME } from '~/models/Theme';
import { isJapanese } from '~/translation';
import { arePresetCardPropsEqual } from '~/utils/presetCard';
import { RFValue } from '~/utils/rfValue';
import { getStationName, getStationPrimaryCode } from '~/utils/station';
import TransferLineMark from './TransferLineMark';
import Typography from './Typography';

type Props = {
  title: string;
  from?: Station | null;
  to?: Station | null;
};

const styles = StyleSheet.create({
  root: {
    width: '100%',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 14,
    justifyContent: 'center',
    // iOS shadow
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    // Android
    elevation: 2,
  },
  title: {
    fontSize: RFValue(21),
    fontWeight: 'bold',
    marginBottom: 8,
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  colLeft: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  colCenter: {
    width: 48, // gap(8) + arrow(32) + gap(8)
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowShift: {
    transform: [{ translateX: -24 }],
  },
  colRight: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  lineText: {
    fontSize: RFValue(11),
    fontWeight: 'bold',
    flexShrink: 1,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stationName: {
    fontSize: RFValue(21),
    fontWeight: 'bold',
    textAlignVertical: 'auto',
  },
  stationCode: {
    fontSize: RFValue(11),
    fontWeight: 'bold',
    textAlignVertical: 'auto',
  },
  lineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 4,
  },
});

const PresetCardBase: React.FC<Props> = ({ title, from, to }) => {
  const isLEDTheme = useThemeStore((st) => st === APP_THEME.LED);
  const getLineMark = useGetLineMark();

  const containerStyle = useMemo(
    () => [
      styles.root,
      { backgroundColor: isLEDTheme ? '#2A2A2A' : '#FCFCFC' },
    ],
    [isLEDTheme]
  );

  const lineFg = isLEDTheme ? '#CCCCCC' : '#666666';
  const metaFg = isLEDTheme ? '#CCCCCC' : '#666666';

  const leftCode = getStationPrimaryCode(from);
  const rightCode = getStationPrimaryCode(to);
  const leftName = getStationName(from);
  const rightName = getStationName(to);
  const leftLine: Line | null = (from?.line as Line) ?? from?.line ?? null;
  const rightLine: Line | null = (to?.line as Line) ?? to?.line ?? null;
  const leftMark = useMemo(
    () => (leftLine ? getLineMark({ line: leftLine }) : null),
    [getLineMark, leftLine]
  );
  const rightMark = useMemo(
    () => (rightLine ? getLineMark({ line: rightLine }) : null),
    [getLineMark, rightLine]
  );

  const leftLineName = (() => {
    if (!leftLine) return null;
    return isJapanese
      ? (leftLine.nameShort ?? leftLine.nameFull ?? null)
      : (leftLine.nameRoman ?? leftLine.nameShort ?? null);
  })();
  const rightLineName = (() => {
    if (!rightLine) return null;
    return isJapanese
      ? (rightLine.nameShort ?? rightLine.nameFull ?? null)
      : (rightLine.nameRoman ?? rightLine.nameShort ?? null);
  })();

  if (!from || !to) return null;

  // 駅名+駅番号は路線記号と同じ開始位置に揃える（インデントなし）
  const leftTextInset = 0;
  const rightTextInset = 0;

  return (
    <View style={containerStyle}>
      <Typography style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Typography>
      {(leftLineName || rightLineName) && (
        <View style={styles.columnsRow}>
          <View style={styles.colLeft}>
            {leftLineName ? (
              <View style={styles.lineItem}>
                {leftMark ? (
                  <TransferLineMark
                    line={leftLine}
                    mark={leftMark}
                    size={NUMBERING_ICON_SIZE.SMALL}
                    withDarkTheme={isLEDTheme}
                  />
                ) : (
                  <View
                    style={[
                      styles.lineDot,
                      {
                        backgroundColor: leftLine.color ?? '#000000',
                      },
                    ]}
                  />
                )}
                <Typography
                  style={[styles.lineText, { color: lineFg }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {leftLineName}
                </Typography>
              </View>
            ) : null}
          </View>
          <View style={styles.colCenter} />
          <View style={styles.colRight}>
            {rightLineName ? (
              <View style={styles.lineItem}>
                {rightMark ? (
                  <TransferLineMark
                    line={rightLine}
                    mark={rightMark}
                    size={NUMBERING_ICON_SIZE.SMALL}
                    withDarkTheme={isLEDTheme}
                  />
                ) : (
                  <View
                    style={[
                      styles.lineDot,
                      {
                        backgroundColor: rightLine.color ?? '#000000',
                      },
                    ]}
                  />
                )}
                <Typography
                  style={[styles.lineText, { color: lineFg }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {rightLineName}
                </Typography>
              </View>
            ) : null}
          </View>
        </View>
      )}
      <View style={styles.columnsRow}>
        <View style={[styles.colLeft, { paddingLeft: leftTextInset }]}>
          <Typography style={styles.stationName} numberOfLines={1}>
            {leftName}
          </Typography>
          {leftCode ? (
            <Typography style={[styles.stationCode, { color: metaFg }]}>
              {leftCode}
            </Typography>
          ) : null}
        </View>
        <View style={styles.colCenter}>
          <Svg
            width={32}
            height={32}
            viewBox="0 0 24 24"
            style={styles.arrowShift}
          >
            <Path
              d="M3 12h18M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"
              fill="none"
              stroke={metaFg}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <View style={[styles.colRight, { paddingLeft: rightTextInset }]}>
          <Typography style={styles.stationName} numberOfLines={1}>
            {rightName}
          </Typography>
          {rightCode ? (
            <Typography style={[styles.stationCode, { color: metaFg }]}>
              {rightCode}
            </Typography>
          ) : null}
        </View>
      </View>
    </View>
  );
};

export const PresetCard = React.memo(PresetCardBase, arePresetCardPropsEqual);
