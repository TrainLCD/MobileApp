import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { useCurrentLine, useTransferLinesFromStation } from '~/hooks';
import { useScale } from '~/hooks/useScale';
import { isEnAtom } from '~/store/selectors/isEn';
import { RFValue } from '~/utils/rfValue';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { ChevronE231 } from './ChevronE231';
import { StationName } from './LineBoard/shared/components';
import {
  useBarStyles,
  useChevronPosition,
  useIncludesLongStationName,
} from './LineBoard/shared/hooks/useBarStyles';
import {
  commonLineBoardStyles,
  STATION_NAME_CONTAINER_BOTTOM,
} from './LineBoard/shared/styles/commonStyles';
import PadLineMarks from './PadLineMarks';
import PassChevronEast from './PassChevronEast';

interface Props {
  lineColors: (string | null | undefined)[];
  stations: Station[];
  hasTerminus: boolean;
}

const localStyles = StyleSheet.create({
  root: {
    backgroundColor: '#E6E6E6',
  },
  bar: {
    position: 'absolute',
    bottom: isTablet ? -52 : 32,
    height: isTablet ? 48 : 32,
  },
  barTerminal: {
    position: 'absolute',
    bottom: isTablet ? -52 : 32,
    height: isTablet ? 48 : 32,
    borderTopRightRadius: isTablet ? 8 : 4,
    borderBottomRightRadius: isTablet ? 8 : 4,
  },
  barArrow: {
    position: 'absolute',
    bottom: isTablet ? -52 : 32,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: isTablet ? 24 : 16,
    borderBottomWidth: isTablet ? 24 : 16,
    borderLeftWidth: isTablet ? 24 : 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  stationNameMapContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  stationName: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#3a3a3a',
    marginLeft: 5,
    marginBottom: Platform.select({ android: -6, ios: 0 }),
  },
  chevron: {
    position: 'absolute',
    zIndex: 9999,
    width: isTablet ? 48 : 32,
    height: isTablet ? 48 : 32,
    marginTop: isTablet ? -6 : -4,
  },
  stationArea: {
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -46 : 32 + 4,
    overflow: 'visible',
  },
  dotInner: {
    width: isTablet ? 44 : 36,
    height: isTablet ? 36 : 24,
    backgroundColor: '#fff',
  },
  dotInnerPassed: {
    backgroundColor: '#ccc',
    borderColor: '#aaa',
  },
  marksContainer: {
    top: 38,
    position: 'absolute',
  },
});

const styles = { ...commonLineBoardStyles, ...localStyles };

const useStationCellState = (
  station: Station,
  index: number,
  stations: Station[]
) => {
  const { station: currentStation, arrived } = useAtomValue(stationState);
  const transferLines = useTransferLinesFromStation(station, {
    omitJR: true,
    omitRepeatingLine: true,
  });

  const currentStationIndex = useMemo(
    () => stations.findIndex((s) => s.groupId === currentStation?.groupId),
    [currentStation?.groupId, stations]
  );

  const passed = useMemo(
    () => index <= currentStationIndex || (!index && !arrived),
    [arrived, currentStationIndex, index]
  );

  const shouldGrayscale = useMemo(
    () =>
      getIsPass(station) ||
      (arrived && currentStationIndex === index ? false : passed),
    [arrived, currentStationIndex, index, passed, station]
  );

  return {
    currentStationIndex,
    passed,
    shouldGrayscale,
    transferLines,
    arrived,
  };
};

interface StationNameCellProps {
  station: Station;
  index: number;
  stations: Station[];
  line: Line | null;
  lineColors: (string | null | undefined)[];
  hasTerminus: boolean;
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  station,
  index,
  stations,
  line,
  lineColors,
  hasTerminus,
}: StationNameCellProps) => {
  const isEn = useAtomValue(isEnAtom);
  const dim = useWindowDimensions();
  const { widthScale } = useScale();
  const { left: barLeft, width: barWidth } = useBarStyles({ index });

  const {
    currentStationIndex,
    passed,
    shouldGrayscale,
    transferLines,
    arrived,
  } = useStationCellState(station, index, stations);

  const additionalChevronStyle = useChevronPosition(index, arrived, passed);
  const includesLongStationName = useIncludesLongStationName(stations);

  const showChevron =
    (currentStationIndex < 1 && index === 0) || currentStationIndex === index;

  const lineColor = line?.color ? lineColors[index] || line.color : '#000';

  return (
    <>
      <View
        style={[
          commonLineBoardStyles.stationNameContainer,
          { width: dim.width / 9 },
        ]}
      >
        <View
          style={[
            styles.nameCommon,
            isEn || includesLongStationName
              ? styles.longOrEnName
              : styles.jaName,
          ]}
        >
          <StationName
            station={station}
            en={isEn}
            horizontal={includesLongStationName}
            passed={getIsPass(station) || shouldGrayscale}
          />
        </View>
        {/* バー（常に路線色） */}
        <View
          style={[
            localStyles.bar,
            {
              left: barLeft,
              width: barWidth,
              backgroundColor: lineColor,
            },
          ]}
        />
        {/* 駅ドット */}
        {getIsPass(station) ? (
          <View style={localStyles.stationArea}>
            <View
              style={[
                styles.chevronAreaPass,
                { marginLeft: isTablet ? 0 : widthScale(5) },
              ]}
            >
              <PassChevronEast gradient={false} />
            </View>
            <View style={localStyles.marksContainer}>
              <PadLineMarks
                shouldGrayscale={shouldGrayscale}
                transferLines={transferLines}
                station={station}
              />
            </View>
          </View>
        ) : (
          <View style={localStyles.stationArea}>
            {!(showChevron && arrived) && (
              <View
                style={[
                  localStyles.dotInner,
                  passed && !arrived && localStyles.dotInnerPassed,
                ]}
              />
            )}
            <View style={localStyles.marksContainer}>
              <PadLineMarks
                shouldGrayscale={shouldGrayscale}
                transferLines={transferLines}
                station={station}
              />
            </View>
          </View>
        )}
        {/* 終端バー or 三角形 */}
        {stations.length - 1 === index &&
          (hasTerminus ? (
            <View
              style={[
                localStyles.barTerminal,
                {
                  left: barLeft + barWidth,
                  width: isTablet ? 20 : 12,
                  backgroundColor: lineColor,
                },
              ]}
            />
          ) : (
            <View
              style={[
                localStyles.barArrow,
                {
                  left: barLeft + barWidth,
                  borderLeftColor: lineColor,
                },
              ]}
            />
          ))}
      </View>
      <View
        style={[
          localStyles.chevron,
          additionalChevronStyle,
          {
            marginLeft: widthScale(14),
            bottom: isTablet
              ? dim.height / 3.5 + (STATION_NAME_CONTAINER_BOTTOM ?? 0) - 52
              : 32,
          },
        ]}
      >
        {showChevron && <ChevronE231 />}
      </View>
    </>
  );
};

const LineBoardE231: React.FC<Props> = ({
  stations,
  lineColors,
  hasTerminus,
}: Props) => {
  const { selectedLine } = useAtomValue(lineState);
  const currentLine = useCurrentLine();
  const dim = useWindowDimensions();

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): React.ReactNode | null => {
      if (!s) {
        return null;
      }

      return (
        <React.Fragment key={s.id}>
          <StationNameCell
            station={s}
            stations={stations}
            index={i}
            line={line}
            lineColors={lineColors}
            hasTerminus={hasTerminus}
          />
        </React.Fragment>
      );
    },
    [hasTerminus, line, lineColors, stations]
  );

  const stationsWithEmpty = useMemo(
    () =>
      [
        ...stations,
        ...Array.from({ length: 8 - stations.length }),
      ] as Station[],
    [stations]
  );

  return (
    <View
      style={[
        commonLineBoardStyles.root,
        localStyles.root,
        {
          paddingBottom: isTablet ? dim.height / 3.5 : undefined,
        },
      ]}
    >
      {stationsWithEmpty.map(stationNameCellForMap)}
    </View>
  );
};

export default React.memo(LineBoardE231);
