import React, { useEffect, useState } from 'react';
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
import { Line, Station } from '../../models/StationAPI';
import navigationState from '../../store/atoms/navigation';
import stationState from '../../store/atoms/station';
import { isJapanese } from '../../translation';
import getLineMarks from '../../utils/getLineMarks';
import getLocalizedLineName from '../../utils/getLocalizedLineName';
import isTablet from '../../utils/isTablet';
import omitJRLinesIfThresholdExceeded from '../../utils/jr';
import { filterWithoutCurrentLine } from '../../utils/line';
import { heightScale } from '../../utils/scale';
import Chevron from '../ChevronJRWest';
import TransferLineDot from '../TransferLineDot';
import TransferLineMark from '../TransferLineMark';

interface Props {
  line: Line;
  lines: Line[];
  stations: Station[];
  lineColors: string[];
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
  rotatedStationName: {
    width: 'auto',
    transform: [{ rotate: '-55deg' }],
    marginBottom: 8,
    paddingBottom: 0,
    fontSize: RFValue(21),
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
        {station.nameR}
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

interface StationNamesWrapperProps {
  stations: Station[];
  station: Station;
  passed: boolean;
  index: number;
}

const StationNamesWrapper: React.FC<StationNamesWrapperProps> = ({
  stations,
  station,
  passed,
  index,
}: StationNamesWrapperProps) => {
  const includesLongStatioName = !!stations.filter(
    (s) => s.name.includes('ー') || s.name.length > 6
  ).length;

  const [isEn, setIsEn] = useState(!isJapanese);
  const { headerState } = useRecoilValue(navigationState);

  useEffect(() => {
    setIsEn(headerState.endsWith('_EN') || headerState.endsWith('_ZH'));
  }, [headerState]);

  return (
    <StationName
      stations={stations}
      station={station}
      en={isEn}
      horizontal={includesLongStatioName}
      passed={passed}
      index={index}
    />
  );
};

interface StationNameCellProps {
  arrived: boolean;
  stations: Station[];
  station: Station;
  line: Line;
  lines: Line[];
  index: number;
  containLongLineName: boolean;
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  stations,
  arrived,
  station,
  line,
  lines,
  index,
  containLongLineName,
}: StationNameCellProps) => {
  const { stations: allStations } = useRecoilValue(stationState);

  const { station: currentStation } = useRecoilValue(stationState);
  const transferLines = filterWithoutCurrentLine(stations, line, index).filter(
    (l) => lines.findIndex((il) => l.id === il?.id) === -1
  );
  const omittedTransferLines = omitJRLinesIfThresholdExceeded(transferLines);

  const currentStationIndex = stations.findIndex(
    (s) => s.groupId === currentStation?.groupId
  );
  const globalCurrentStationIndex = allStations.findIndex(
    (s) => s.groupId === station?.groupId
  );

  const passed = index <= currentStationIndex || (!index && !arrived);
  const shouldGrayscale = passed || station.pass;

  const lineMarks = getLineMarks({
    transferLines,
    omittedTransferLines,
    grayscale: shouldGrayscale,
  });

  const PadLineMarks: React.FC = () => {
    if (!isTablet) {
      return <></>;
    }
    const padLineMarksStyle = StyleSheet.create({
      root: {
        marginTop: 16,
      },
      topBar: {
        width: 8,
        height: 16,
        // marginTop: -4,
        backgroundColor: '#212121',
        alignSelf: 'center',
      },
      lineMarkWrapper: {
        marginTop: 4,
        width: windowWidth / 10,
        flexDirection: 'row',
      },
      lineMarkWrapperDouble: {
        marginTop: 4,
        width: windowWidth / 10,
        flexDirection: 'column',
      },
      lineNameWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
      },
      lineName: {
        fontWeight: 'bold',
        fontSize: RFValue(10),
        color: shouldGrayscale ? 'gray' : 'black',
      },
      lineNameLong: {
        fontWeight: 'bold',
        fontSize: RFValue(7),
        color: shouldGrayscale ? 'gray' : 'black',
      },
    });

    return (
      <View style={padLineMarksStyle.root}>
        {!!lineMarks.length && <View style={padLineMarksStyle.topBar} />}
        {lineMarks.map((lm, i) =>
          lm ? (
            <View
              style={
                lm.subSign ||
                lm?.jrUnionSigns?.length >= 2 ||
                lm?.btUnionSignPaths?.length >= 2
                  ? padLineMarksStyle.lineMarkWrapperDouble
                  : padLineMarksStyle.lineMarkWrapper
              }
              key={omittedTransferLines[i]?.id}
            >
              <TransferLineMark
                line={omittedTransferLines[i]}
                mark={lm}
                small
                shouldGrayscale={shouldGrayscale}
              />
              <View style={padLineMarksStyle.lineNameWrapper}>
                <Text
                  style={
                    containLongLineName
                      ? padLineMarksStyle.lineNameLong
                      : padLineMarksStyle.lineName
                  }
                >
                  {getLocalizedLineName(omittedTransferLines[i])}
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={padLineMarksStyle.lineMarkWrapper}
              key={omittedTransferLines[i]?.id}
            >
              <TransferLineDot
                key={omittedTransferLines[i]?.id}
                line={omittedTransferLines[i]}
                small
              />
              <Text
                style={
                  containLongLineName
                    ? padLineMarksStyle.lineNameLong
                    : padLineMarksStyle.lineName
                }
              >
                {getLocalizedLineName(omittedTransferLines[i])}
              </Text>
            </View>
          )
        )}
      </View>
    );
  };

  const nextStationWillPass = allStations[globalCurrentStationIndex + 1]?.pass;

  const customPassedCond =
    arrived && currentStationIndex === index ? false : passed;

  return (
    <View key={station.name} style={styles.stationNameContainer}>
      <StationNamesWrapper
        index={index}
        stations={stations}
        station={station}
        passed={customPassedCond}
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
        <PadLineMarks />
      </View>
    </View>
  );
};

const LineBoardWest: React.FC<Props> = ({
  stations,
  line,
  lineColors,
  lines,
}: Props) => {
  const { arrived } = useRecoilValue(stationState);
  const containLongLineName =
    stations.findIndex(
      (s) =>
        s.lines.findIndex((l) => getLocalizedLineName(l).length > 15) !== -1
    ) !== -1;

  const stationNameCellForMap = (s: Station, i: number): JSX.Element => (
    <StationNameCell
      key={s.groupId}
      station={s}
      stations={stations}
      arrived={arrived}
      line={line}
      lines={lines}
      index={i}
      containLongLineName={containLongLineName}
    />
  );

  const emptyArray = Array.from({
    length: 8 - lineColors.length,
  }).fill(lineColors[lineColors.length - 1]) as string[];
  return (
    <View style={styles.root}>
      {[...lineColors, ...emptyArray].map((lc, i) => (
        <View
          key={`${lc}${i.toString()}`}
          style={{
            ...styles.bar,
            left: barWidth * i,
            backgroundColor: lc ? `#${lc}` : `#${line.lineColorC}`,
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

export default LineBoardWest;
