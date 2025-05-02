import React, { useCallback, useMemo } from 'react';
import {
  Dimensions,
  Platform,
  type StyleProp,
  StyleSheet,
  type TextStyle,
  View,
} from 'react-native';
import { useRecoilValue } from 'recoil';
import type { Station, StationNumber } from '../../gen/proto/stationapi_pb';
import { FONTS } from '../constants';
import { useCurrentLine } from '../hooks/useCurrentLine';
import { useCurrentStation } from '../hooks/useCurrentStation';
import useGetLineMark from '../hooks/useGetLineMark';
import useHasPassStationInRegion from '../hooks/useHasPassStationInRegion';
import useIsPassing from '../hooks/useIsPassing';
import { useNextStation } from '../hooks/useNextStation';
import usePreviousStation from '../hooks/usePreviousStation';
import useStationNumberIndexFunc from '../hooks/useStationNumberIndexFunc';
import useTransferLinesFromStation from '../hooks/useTransferLinesFromStation';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isEnSelector } from '../store/selectors/isEn';
import getStationNameR from '../utils/getStationNameR';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import { RFValue } from '../utils/rfValue';
import { heightScale } from '../utils/scale';
import Chevron from './ChevronJRWest';
import PadLineMarks from './PadLineMarks';
import Typography from './Typography';

interface Props {
  stations: Station[];
  lineColors: (string | null | undefined)[];
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
const barWidth = isTablet ? (screenWidth - 72) / 8 : (screenWidth - 48) / 8;

const barBottom = ((): number => {
  if (isTablet) {
    return 32;
  }
  return 48;
})();

const barTerminalBottom = ((): number => {
  if (isTablet) {
    return 32;
  }
  return 48;
})();

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: screenHeight,
    bottom: isTablet ? screenHeight / 2.5 : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: barBottom,
    width: barWidth,
    height: isTablet ? 64 : 32,
  },
  barTerminal: {
    left: isTablet ? screenWidth - 72 + 6 : screenWidth - 48 + 6,
    position: 'absolute',
    width: 0,
    height: 0,
    bottom: barTerminalBottom,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: isTablet ? 32 : 16,
    borderRightWidth: isTablet ? 32 : 16,
    borderBottomWidth: isTablet ? 64 : 32,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    transform: [{ rotate: '90deg' }],
    margin: 0,
    marginLeft: -6,
    borderWidth: 0,
  },
  stationNameWrapper: {
    flexDirection: 'row',
    justifyContent: isTablet ? 'space-between' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  stationNameContainer: {
    position: 'relative',
    width: screenWidth / 9,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 110 : undefined,
    paddingBottom: 0,
  },
  stationName: {
    width: isTablet ? 48 : 32,
    fontSize: RFValue(18),
    fontWeight: 'bold',
    marginBottom: Platform.select({ android: -6, ios: 0 }),
    marginLeft: 5,
    bottom: isTablet ? 32 : 0,
  },
  stationNameEn: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
  },
  grayColor: {
    color: '#ccc',
  },
  lineDot: {
    width: isTablet ? 48 : 28,
    height: isTablet ? 48 : 28,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -70 : 50,
    overflow: 'visible',
    borderRadius: 24,
  },
  arrivedLineDot: {
    backgroundColor: 'crimson',
    width: isTablet ? 44 : 24,
    height: isTablet ? 44 : 24,
    borderRadius: 22,
    position: 'absolute',
    left: 2,
    top: 2,
  },
  chevron: {
    marginLeft: isTablet ? 48 : 24,
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    marginTop: isTablet ? 6 : 2,
  },
  topBar: {
    width: 8,
    height: 8,
    backgroundColor: '#212121',
    alignSelf: 'center',
    marginTop: -16,
  },
  passMark: {
    width: isTablet ? 24 : 14,
    height: isTablet ? 8 : 6,
    position: 'absolute',
    left: isTablet ? 48 + 38 : 28 + 28, // dotWidth + margin
    top: isTablet ? 48 * 0.45 : 28 * 0.4, // (almost) half dotHeight
  },
  numberingContainer: {
    position: 'absolute',
    bottom: isTablet ? 0 : barBottom + 44,
    marginLeft: isTablet ? -48 * 0.125 : -28 * 0.25,
    width: isTablet ? 50 * 1.25 : 28 * 1.75,
    height: isTablet ? 48 / 2 : 24 / 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberingText: {
    fontWeight: 'bold',
    fontSize: isTablet ? 48 / 2.5 : 24 / 1.75,
    fontFamily: FONTS.FrutigerNeueLTProBold,
    marginTop: -2,
    textAlign: 'center',
  },
});

interface StationNameProps {
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
  hasNumbering?: boolean;
}

const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  horizontal,
  passed,
  hasNumbering,
}: StationNameProps) => {
  const stationNameR = useMemo(() => getStationNameR(station), [station]);

  const stationNameEnExtraStyle = useMemo((): StyleProp<TextStyle> => {
    if (!isTablet) {
      return {
        width: heightScale(300),
        marginBottom: 80,
      };
    }
    return {
      width: 250,
      marginBottom: hasNumbering ? 150 : 120,
    };
  }, [hasNumbering]);

  if (en) {
    return (
      <Typography
        style={[
          styles.stationNameEn,
          stationNameEnExtraStyle,
          passed ? styles.grayColor : null,
        ]}
      >
        {stationNameR}
      </Typography>
    );
  }
  if (horizontal) {
    return (
      <Typography
        style={[
          styles.stationNameEn,
          stationNameEnExtraStyle,
          passed ? styles.grayColor : null,
        ]}
      >
        {station.name}
      </Typography>
    );
  }
  return (
    <View>
      {station.name.split('').map((c, j) => (
        <Typography
          style={[styles.stationName, passed ? styles.grayColor : null]}
          key={`${j + 1}${c}`}
        >
          {c}
        </Typography>
      ))}
    </View>
  );
};

interface StationNameCellProps {
  arrived: boolean;
  stations: Station[];
  station: Station;
  index: number;
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  stations,
  arrived,
  station: stationInLoop,
  index,
}: StationNameCellProps) => {
  const { leftStations } = useRecoilValue(navigationState);
  const { stations: allStations } = useRecoilValue(stationState);
  const isEn = useRecoilValue(isEnSelector);

  const station = useCurrentStation();
  const transferLines = useTransferLinesFromStation(stationInLoop, {
    omitJR: true,
    omitRepeatingLine: true,
  });

  const nextStation = useNextStation(true, stationInLoop);
  const prevStation = usePreviousStation(false);

  const currentStationIndex = useMemo(
    () =>
      leftStations.findIndex(
        (s) => s.groupId === (arrived ? station : prevStation)?.groupId
      ),
    [arrived, station, leftStations, prevStation]
  );

  const passed = useMemo(
    () =>
      arrived
        ? index < currentStationIndex
        : index <= currentStationIndex ||
          (!index && !arrived) ||
          getIsPass(stationInLoop),
    [arrived, index, stationInLoop, currentStationIndex]
  );

  const getStationNumberIndex = useStationNumberIndexFunc();
  const stationNumberIndex = useMemo(
    () => getStationNumberIndex(stationInLoop),
    [getStationNumberIndex, stationInLoop]
  );
  const numberingObj = useMemo<StationNumber | undefined>(
    () => stationInLoop.stationNumbers?.[stationNumberIndex],
    [stationInLoop.stationNumbers, stationNumberIndex]
  );

  const stationNumberString = useMemo(
    () => numberingObj?.stationNumber?.split('-').join('') ?? '',
    [numberingObj?.stationNumber]
  );
  const stationNumberBGColor = useMemo(
    () => (passed ? '#aaa' : numberingObj?.lineSymbolColor) ?? '#000',
    [passed, numberingObj?.lineSymbolColor]
  );
  const stationNumberTextColor = useMemo(() => {
    if (passed) {
      return '#fff';
    }
    if (numberingObj?.lineSymbolShape.includes('DARK_TEXT')) {
      return '#231f20';
    }

    return '#fff';
  }, [passed, numberingObj?.lineSymbolShape]);

  const getLineMarks = useGetLineMark();

  const lineMarks = useMemo(
    () => transferLines.map((line) => getLineMarks({ line })),
    [getLineMarks, transferLines]
  );

  const hasPassStationInRegion = useHasPassStationInRegion(
    allStations,
    stationInLoop,
    nextStation ?? null
  );

  const includesLongStationName = useMemo(
    () =>
      !!stations.filter((s) => s.name.includes('ー') || s.name.length > 6)
        .length,
    [stations]
  );

  return (
    <View
      key={stationInLoop.id}
      style={{
        ...styles.stationNameContainer,
        paddingBottom: isTablet ? 0 : numberingObj ? 110 : 88,
      }}
    >
      <View
        style={
          isEn || includesLongStationName
            ? {
                transform: [{ rotate: '-55deg' }],
              }
            : {}
        }
      >
        <StationName
          station={stationInLoop}
          en={isEn}
          horizontal={includesLongStationName}
          passed={passed}
          hasNumbering={!!numberingObj}
        />
      </View>
      {numberingObj ? (
        <View
          style={{
            ...styles.numberingContainer,
            backgroundColor: stationNumberBGColor,
            marginBottom: passed && isTablet ? -4 : -6,
          }}
        >
          <Typography
            style={{ ...styles.numberingText, color: stationNumberTextColor }}
          >
            {stationNumberString}
          </Typography>
        </View>
      ) : null}

      <View
        style={{
          ...styles.lineDot,
          backgroundColor: passed ? '#aaa' : '#fff',
        }}
      >
        {isTablet && lineMarks.length && !passed ? (
          <View style={styles.topBar} />
        ) : null}

        {arrived && currentStationIndex === index ? (
          <View style={styles.arrivedLineDot} />
        ) : null}
        <View
          style={[
            styles.chevron,
            !lineMarks.length ? { marginTop: isTablet ? 8 : 2 } : undefined,
          ]}
        >
          {!arrived &&
          (currentStationIndex === index ||
            (currentStationIndex === -1 && !index)) ? (
            <Chevron />
          ) : null}
        </View>
        {hasPassStationInRegion && index !== stations.length - 1 ? (
          <View
            style={{
              ...styles.passMark,
              backgroundColor:
                passed && index !== currentStationIndex ? '#aaa' : '#fff',
            }}
          />
        ) : null}
        {!passed ? (
          <PadLineMarks
            shouldGrayscale={passed}
            transferLines={transferLines}
            station={stationInLoop}
            theme={APP_THEME.JR_WEST}
          />
        ) : null}
      </View>
    </View>
  );
};

const LineBoardWest: React.FC<Props> = ({ stations, lineColors }: Props) => {
  const { selectedLine } = useRecoilValue(lineState);
  const { arrived, approaching } = useRecoilValue(stationState);

  const isPassing = useIsPassing();
  const currentLine = useCurrentLine();

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): JSX.Element => (
      <StationNameCell
        key={s.id}
        station={s}
        stations={stations}
        arrived={!isPassing && !approaching && arrived}
        index={i}
      />
    ),
    [approaching, arrived, isPassing, stations]
  );

  const emptyArray = useMemo(
    () =>
      Array.from({
        length: 8 - lineColors.length,
      }).fill(lineColors[lineColors.length - 1]) as string[],
    [lineColors]
  );

  const stationsWithEmpty = useMemo(
    () => [...lineColors, ...emptyArray],
    [emptyArray, lineColors]
  );

  if (!line) {
    return null;
  }

  return (
    <View style={styles.root}>
      {stationsWithEmpty.map((lc, i) => (
        <View
          key={`${lc}${i.toString()}`}
          style={{
            ...styles.bar,
            left: barWidth * i,
            backgroundColor: lc ? lc : (line?.color ?? '#000'),
          }}
        />
      ))}

      <View
        style={{
          ...styles.barTerminal,
          borderBottomColor: line.color
            ? lineColors[lineColors.length - 1] || line.color
            : '#000',
        }}
      />
      <View style={styles.stationNameWrapper}>
        {stations.map(stationNameCellForMap)}
      </View>
    </View>
  );
};

export default React.memo(LineBoardWest);
