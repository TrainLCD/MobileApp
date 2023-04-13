import React, { useMemo } from 'react';
import {
  Dimensions,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import useCurrentLine from '../hooks/useCurrentLine';
import useCurrentStation from '../hooks/useCurrentStation';
import useIsEn from '../hooks/useIsEn';
import useLineMarks from '../hooks/useLineMarks';
import useNextStation from '../hooks/useNextStation';
import useTransferLinesFromStation from '../hooks/useTransferLinesFromStation';
import { Station } from '../models/StationAPI';
import { APP_THEME } from '../models/Theme';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import getStationNameR from '../utils/getStationNameR';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import omitJRLinesIfThresholdExceeded from '../utils/jr';
import { heightScale } from '../utils/scale';
import Chevron from './ChevronJRWest';
import PadLineMarks from './PadLineMarks';

interface Props {
  stations: Station[];
  lineColors: (string | null | undefined)[];
}

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const barWidth = isTablet ? (windowWidth - 72) / 8 : (windowWidth - 48) / 8;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: windowHeight,
    bottom: isTablet ? windowHeight / 2.5 : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: isTablet ? 32 : 48,
    width: barWidth,
    height: isTablet ? 64 : 32,
  },
  barTerminal: {
    left: isTablet ? windowWidth - 72 + 6 : windowWidth - 48 + 6,
    position: 'absolute',
    width: 0,
    height: 0,
    bottom: isTablet ? 32 : 48,
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
    width: windowWidth / 9,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 110 : undefined,
    paddingBottom: !isTablet ? 96 : undefined,
  },
  stationName: {
    width: isTablet ? 48 : 32,
    textAlign: 'center',
    fontSize: RFValue(18),
    fontWeight: 'bold',
  },
  stationNameEn: {
    fontSize: RFValue(18),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: -30,
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
    marginTop: isTablet ? 16 : 2,
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
    backgroundColor: 'white',
    position: 'absolute',
    left: isTablet ? 48 + 38 : 28 + 28, // dotWidth + margin
    top: isTablet ? 48 * 0.45 : 28 * 0.4, // (almost) half dotHeight
  },
});

const stationNameEnLineHeight = ((): number => {
  if (Platform.OS === 'android' && !isTablet) {
    return 21;
  }
  return 18;
})();

const getStationNameEnExtraStyle = (isLast: boolean): StyleProp<TextStyle> => {
  if (!isTablet) {
    return {
      width: heightScale(300),
      marginBottom: 58,
    };
  }
  if (isLast) {
    return {
      width: 200,
      marginBottom: 70,
    };
  }
  return {
    width: 250,
    marginBottom: 84,
  };
};
interface StationNameProps {
  stations: Station[];
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
  index: number;
}

const StationName: React.FC<StationNameProps> = ({
  stations,
  station,
  en,
  horizontal,
  passed,
  index,
}: StationNameProps) => {
  const stationNameR = getStationNameR(station);

  if (en) {
    return (
      <Text
        style={[
          {
            ...styles.stationNameEn,
            lineHeight: RFValue(stationNameEnLineHeight),
          },
          getStationNameEnExtraStyle(index === stations.length - 1),
          passed ? styles.grayColor : null,
        ]}
      >
        {stationNameR}
      </Text>
    );
  }
  if (horizontal) {
    return (
      <Text
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(index === stations.length - 1),
          passed ? styles.grayColor : null,
        ]}
      >
        {station.name}
      </Text>
    );
  }
  return (
    <>
      {station.name.split('').map((c, j) => (
        <Text
          style={[
            {
              ...styles.stationName,
              lineHeight: RFValue(stationNameEnLineHeight),
            },
            passed ? styles.grayColor : null,
          ]}
          key={`${j + 1}${c}`}
        >
          {c}
        </Text>
      ))}
    </>
  );
};

StationName.defaultProps = {
  en: false,
  horizontal: false,
  passed: false,
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
  station,
  index,
}: StationNameCellProps) => {
  const transferLines = useTransferLinesFromStation(station);
  const currentStation = useCurrentStation();
  const nextStation = useNextStation(station, true);

  const omittedTransferLines = useMemo(
    () =>
      omitJRLinesIfThresholdExceeded(transferLines).map((l) => ({
        ...l,
        name: l.name.replace(parenthesisRegexp, ''),
        nameR: l.nameR.replace(parenthesisRegexp, ''),
      })),
    [transferLines]
  );

  const isEn = useIsEn();

  const currentStationIndex = useMemo(
    () => stations.findIndex((s) => s.groupId === currentStation?.groupId),
    [currentStation?.groupId, stations]
  );

  const passed = useMemo(
    () => index <= currentStationIndex || (!index && !arrived),
    [arrived, index, currentStationIndex]
  );
  const shouldGrayscale = useMemo(
    () =>
      arrived
        ? index < currentStationIndex
        : index <= currentStationIndex ||
          (!index && !arrived) ||
          getIsPass(station),
    [arrived, index, station, currentStationIndex]
  );

  const lineMarks = useLineMarks({
    station,
    transferLines,
    grayscale: shouldGrayscale,
  });

  const nextStationWillPass = useMemo(
    () => nextStation && getIsPass(nextStation),
    [nextStation]
  );

  const customPassedCond = useMemo(
    () => (arrived && currentStationIndex === index ? false : passed),
    [arrived, index, passed, currentStationIndex]
  );

  const includesLongStationName = useMemo(
    () =>
      !!stations.filter((s) => s.name.includes('ー') || s.name.length > 6)
        .length,
    [stations]
  );

  return (
    <View key={station.name} style={styles.stationNameContainer}>
      <StationName
        stations={stations}
        station={station}
        en={isEn}
        horizontal={includesLongStationName}
        passed={passed}
        index={index}
      />
      <View
        style={{
          ...styles.lineDot,
          backgroundColor: customPassedCond ? '#aaa' : '#fff',
        }}
      >
        {isTablet && lineMarks.length ? <View style={styles.topBar} /> : null}

        {index === currentStationIndex && arrived ? (
          <View style={styles.arrivedLineDot} />
        ) : null}
        <View
          style={[
            styles.chevron,
            !lineMarks.length ? { marginTop: isTablet ? 8 : 2 } : undefined,
          ]}
        >
          {currentStationIndex === index && !arrived ? <Chevron /> : null}
        </View>
        {nextStationWillPass && index !== stations.length - 1 ? (
          <View style={styles.passMark} />
        ) : null}
        <PadLineMarks
          shouldGrayscale={shouldGrayscale}
          lineMarks={lineMarks}
          transferLines={omittedTransferLines}
          station={station}
          theme={APP_THEME.JR_WEST}
        />
      </View>
    </View>
  );
};

const LineBoardWest: React.FC<Props> = ({ stations, lineColors }: Props) => {
  const { arrived } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const currentLine = useCurrentLine();

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const stationNameCellForMap = (s: Station, i: number): JSX.Element => (
    <StationNameCell
      key={s.groupId}
      station={s}
      stations={stations}
      arrived={arrived}
      index={i}
    />
  );

  const emptyArray = Array.from({
    length: 8 - lineColors.length,
  }).fill(lineColors[lineColors.length - 1]) as string[];

  if (!line) {
    return null;
  }

  return (
    <View style={styles.root}>
      {[...lineColors, ...emptyArray].map((lc, i) => (
        <View
          key={`${lc}${i.toString()}`}
          style={{
            ...styles.bar,
            left: barWidth * i,
            backgroundColor: lc ? `#${lc}` : `#${line?.lineColorC}`,
          }}
        />
      ))}
      {[...lineColors, ...emptyArray].map((lc, i) => (
        <View
          key={`${lc}${i.toString()}`}
          style={{
            ...styles.bar,
            zIndex: -1,
            bottom: isTablet ? 26 : 42,
            left: barWidth * i,
            backgroundColor: 'black',
          }}
        />
      ))}
      <View
        style={{
          ...styles.barTerminal,
          borderBottomColor: line
            ? `#${lineColors[lineColors.length - 1] || line.lineColorC}`
            : '#000',
        }}
      />
      <View
        style={{
          ...styles.barTerminal,
          borderBottomColor: 'black',
          zIndex: -1,
          bottom: isTablet ? 26 : 42,
        }}
      />
      <View style={styles.stationNameWrapper}>
        {stations.map(stationNameCellForMap)}
      </View>
    </View>
  );
};

export default React.memo(LineBoardWest);
