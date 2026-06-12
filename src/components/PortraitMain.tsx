import { useAtomValue } from 'jotai';
import type React from 'react';
import { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Station } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import {
  useCurrentLine,
  useCurrentTrainType,
  useHeaderCommonData,
  useStationNumberIndexFunc,
  useTransferLinesFromStation,
} from '~/hooks';
import { leftStationsAtom } from '~/store/atoms/navigation';
import { isJapanese, translate } from '~/translation';
import getIsPass from '~/utils/isPass';
import { RFValue } from '~/utils/rfValue';
import NumberingIcon from './NumberingIcon';
import Typography from './Typography';

// テーマ非依存の独自カラーパレット。選択中のテーマに関わらず同じ見た目にする。
const COLORS = {
  background: '#13131A',
  card: '#1E1E28',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  divider: '#2C2C38',
  fallbackAccent: '#888888',
} as const;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  lineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  lineColorBar: {
    width: 8,
    alignSelf: 'stretch',
  },
  lineCardBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  lineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineName: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: RFValue(16),
    fontWeight: 'bold',
  },
  trainTypeBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  trainTypeText: {
    fontSize: RFValue(12),
    fontWeight: 'bold',
  },
  boundText: {
    marginTop: 4,
    color: COLORS.textSecondary,
    fontSize: RFValue(13),
    fontWeight: 'bold',
  },
  stationSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  stateText: {
    color: COLORS.textSecondary,
    fontSize: RFValue(18),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  numberingContainer: {
    marginRight: 16,
  },
  stationName: {
    flexShrink: 1,
    color: COLORS.textPrimary,
    fontSize: RFValue(32),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stopListContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
  },
  stopListContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 56,
  },
  trackColumn: {
    width: 24,
    alignItems: 'center',
  },
  trackLine: {
    flex: 1,
    width: 6,
  },
  stopDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: COLORS.card,
    marginVertical: -2,
    zIndex: 1,
  },
  passDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginHorizontal: 3,
  },
  stopBody: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  stopName: {
    color: COLORS.textPrimary,
    fontSize: RFValue(16),
    fontWeight: 'bold',
  },
  stopNameCurrent: {
    fontSize: RFValue(18),
  },
  stopNamePass: {
    color: COLORS.textSecondary,
    fontWeight: 'normal',
  },
  stopNumbering: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: RFValue(11),
  },
  transferDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  transferDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  passLabel: {
    alignSelf: 'center',
    color: COLORS.textSecondary,
    fontSize: RFValue(12),
  },
});

const StopRow = ({
  station,
  isFirst,
  isLast,
  lineColor,
}: {
  station: Station;
  isFirst: boolean;
  isLast: boolean;
  lineColor: string;
}) => {
  const isPass = getIsPass(station);
  const getStationNumberIndex = useStationNumberIndexFunc();
  const transferLines = useTransferLinesFromStation(station, {
    omitRepeatingLine: true,
  });

  const numberingIndex = getStationNumberIndex(station);
  const stationNumber =
    station.stationNumbers?.[numberingIndex]?.stationNumber ?? null;

  const stationName = isJapanese
    ? (station.name ?? '')
    : (station.nameRoman ?? station.name ?? '');

  return (
    <View style={styles.stopRow}>
      <View style={styles.trackColumn}>
        <View
          style={[
            styles.trackLine,
            { backgroundColor: lineColor, opacity: isFirst ? 0 : 1 },
          ]}
        />
        {isPass ? (
          <View style={[styles.passDot, { borderColor: lineColor }]} />
        ) : (
          <View style={[styles.stopDot, { borderColor: lineColor }]} />
        )}
        <View
          style={[
            styles.trackLine,
            { backgroundColor: lineColor, opacity: isLast ? 0 : 1 },
          ]}
        />
      </View>
      <View style={styles.stopBody}>
        <Typography
          numberOfLines={1}
          style={[
            styles.stopName,
            isFirst && styles.stopNameCurrent,
            isPass && styles.stopNamePass,
          ]}
        >
          {stationName}
        </Typography>
        {stationNumber ? (
          <Typography style={styles.stopNumbering}>{stationNumber}</Typography>
        ) : null}
        {!isPass && transferLines.length > 0 ? (
          <View style={styles.transferDotsRow}>
            {transferLines.slice(0, 8).map((line) => (
              <View
                key={line.id}
                style={[
                  styles.transferDot,
                  { backgroundColor: line.color ?? COLORS.fallbackAccent },
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>
      {isPass ? (
        <Typography style={styles.passLabel}>
          {translate('passStationLabel')}
        </Typography>
      ) : null}
    </View>
  );
};

const PortraitMain: React.FC = () => {
  const commonData = useHeaderCommonData();
  const leftStations = useAtomValue(leftStationsAtom);
  const currentLine = useCurrentLine();
  const trainType = useCurrentTrainType();

  const lineColor = currentLine?.color ?? COLORS.fallbackAccent;

  const lineName = useMemo(
    () =>
      (isJapanese ? currentLine?.nameShort : currentLine?.nameRoman)?.replace(
        parenthesisRegexp,
        ''
      ) ?? '',
    [currentLine?.nameShort, currentLine?.nameRoman]
  );

  const trainTypeName = useMemo(
    () =>
      (isJapanese ? trainType?.name : trainType?.nameRoman)?.replace(
        parenthesisRegexp,
        ''
      ) ?? '',
    [trainType?.name, trainType?.nameRoman]
  );

  const stops = useMemo(
    () => leftStations.filter((s): s is Station => !!s),
    [leftStations]
  );

  if (!commonData) {
    return <View style={styles.root} />;
  }

  const {
    stateText,
    stationText,
    boundText,
    currentStationNumber,
    numberingColor,
  } = commonData;

  return (
    <SafeAreaView style={styles.root}>
      {/* 路線・行き先情報 */}
      <View style={styles.lineCard}>
        <View style={[styles.lineColorBar, { backgroundColor: lineColor }]} />
        <View style={styles.lineCardBody}>
          <View style={styles.lineNameRow}>
            <Typography numberOfLines={1} style={styles.lineName}>
              {lineName}
            </Typography>
            {trainTypeName ? (
              <View
                style={[
                  styles.trainTypeBadge,
                  { borderColor: trainType?.color ?? COLORS.textSecondary },
                ]}
              >
                <Typography
                  style={[
                    styles.trainTypeText,
                    { color: trainType?.color ?? COLORS.textSecondary },
                  ]}
                >
                  {trainTypeName}
                </Typography>
              </View>
            ) : null}
          </View>
          <Typography numberOfLines={1} style={styles.boundText}>
            {boundText}
          </Typography>
        </View>
      </View>

      {/* 駅名表示 */}
      <View style={styles.stationSection}>
        <Typography style={styles.stateText}>{stateText}</Typography>
        <View style={styles.stationNameRow}>
          {currentStationNumber ? (
            <View style={styles.numberingContainer}>
              <NumberingIcon
                shape={currentStationNumber.lineSymbolShape || ''}
                lineColor={numberingColor}
                stationNumber={currentStationNumber.stationNumber || ''}
                threeLetterCode={commonData.threeLetterCode}
                withDarkTheme
              />
            </View>
          ) : null}
          <Typography
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.stationName}
          >
            {stationText}
          </Typography>
        </View>
      </View>

      {/* 停車駅リスト */}
      <View style={styles.stopListContainer}>
        <ScrollView contentContainerStyle={styles.stopListContent}>
          {stops.map((station, index) => (
            <StopRow
              key={station.id}
              station={station}
              isFirst={index === 0}
              isLast={index === stops.length - 1}
              lineColor={lineColor}
            />
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default memo(PortraitMain);
