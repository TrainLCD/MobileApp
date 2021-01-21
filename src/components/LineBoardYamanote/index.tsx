import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useEffect } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  PlatformIOSStatic,
  StyleProp,
  TextStyle,
  Animated,
} from 'react-native';
import { Line, Station } from '../../models/StationAPI';
import Chevron from '../Chevron';
import { getLineMark } from '../../lineMark';
import { filterWithoutCurrentLine } from '../../utils/line';
import TransferLineMark from '../TransferLineMark';
import TransferLineDot from '../TransferLineDot';
import omitJRLinesIfThresholdExceeded from '../../utils/jr';
import PadArch from './PadArch';
import { YAMANOTE_LINE_BOARD_FILL_DURATION } from '../../constants';
import { isJapanese } from '../../translation';
import BarTerminal from '../BarTerminalEast';

interface Props {
  arrived: boolean;
  line: Line;
  stations: Station[];
  hasTerminus: boolean;
}

const { isPad } = Platform as PlatformIOSStatic;
const AnimatedPadArch = Animated.createAnimatedComponent(PadArch);

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const getStationNameEnLineHeight = (): number => {
  if (Platform.OS === 'android') {
    return 24;
  }
  if (isPad) {
    return 28;
  }
  return 21;
};

const getStationNameEnExtraStyle = (isLast: boolean): StyleProp<TextStyle> => {
  if (!isPad) {
    return {
      width: 200,
      marginBottom: 70,
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
    marginBottom: 96,
  };
};

const stationNameEnLineHeight = getStationNameEnLineHeight();

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: windowHeight,
    bottom: isPad ? windowHeight / 2.5 : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: 32,
    height: isPad ? 48 : 32,
  },
  barTerminal: {
    right: isPad ? 19 : 18,
    bottom: isPad ? 29.5 : 32,
    width: isPad ? 42 : 33.7,
    height: isPad ? 53 : 32,
    position: 'absolute',
  },
  stationNameWrapper: {
    flexDirection: 'row',
    justifyContent: isPad ? 'space-between' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  stationNameContainer: {
    width: windowWidth / 9,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isPad ? 84 : undefined,
    paddingBottom: !isPad ? 84 : undefined,
  },
  stationName: {
    width: isPad ? 48 : 32,
    textAlign: 'center',
    fontSize: isPad ? 32 : 21,
    lineHeight: stationNameEnLineHeight,
    fontWeight: 'bold',
  },
  stationNameEn: {
    fontSize: isPad ? 28 : 21,
    lineHeight: stationNameEnLineHeight,
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
    fontSize: 21,
  },
  lineDot: {
    width: isPad ? 48 : 32,
    height: isPad ? 36 : 24,
    position: 'absolute',
    zIndex: 9999,
    bottom: isPad ? -46 : 32 + 4,
    overflow: 'visible',
  },
  chevron: {
    marginLeft: isPad ? 57 : 38,
    width: isPad ? 48 : 32,
    height: isPad ? 48 : 32,
    marginTop: isPad ? -6 : -4,
  },
  chevronArrived: {
    marginLeft: 0,
  },
});

interface StationNameProps {
  station: Station;
  stations: Station[];
  en?: boolean;
  horizonal?: boolean;
  passed?: boolean;
  index: number;
}

const StationName: React.FC<StationNameProps> = ({
  station,
  stations,
  en,
  horizonal,
  passed,
  index,
}: StationNameProps) => {
  if (en) {
    return (
      <Text
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(index === stations.length - 1),
          passed ? styles.grayColor : null,
        ]}
      >
        {station.nameR}
      </Text>
    );
  }
  if (horizonal) {
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
          style={[styles.stationName, passed ? styles.grayColor : null]}
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
  horizonal: false,
  passed: false,
};

interface StationNamesWrapperProps {
  station: Station;
  stations: Station[];
  passed: boolean;
  index: number;
}

const StationNamesWrapper: React.FC<StationNamesWrapperProps> = ({
  station,
  stations,
  passed,
  index,
}: StationNamesWrapperProps) => {
  const includesLongStatioName = !!stations.filter(
    (s) => s.name.includes('ー') || s.name.length > 6
  ).length;

  return (
    <StationName
      station={station}
      stations={stations}
      en={!isJapanese}
      horizonal={includesLongStatioName}
      passed={passed}
      index={index}
    />
  );
};

interface StationNameCellProps {
  station: Station;
  index: number;
  arrived: boolean;
  stations: Station[];
  line: Line;
}

const StationNameCell: React.FC<StationNameCellProps> = ({
  station,
  index,
  arrived,
  stations,
  line,
}: StationNameCellProps) => {
  const passed = !index && !arrived;
  const transferLines = filterWithoutCurrentLine(stations, line, index);
  const omittedTransferLines = omitJRLinesIfThresholdExceeded(transferLines);
  const lineMarks = omittedTransferLines.map((l) => getLineMark(l));
  const getLocalizedLineName = useCallback((l: Line) => {
    if (isJapanese) {
      return l.name;
    }
    return l.nameR;
  }, []);

  const PadLineMarks: React.FC = () => {
    if (!isPad) {
      return <></>;
    }
    const padLineMarksStyle = StyleSheet.create({
      root: {
        marginTop: 4,
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
        fontSize: 16,
      },
      lineNameLong: {
        fontWeight: 'bold',
        fontSize: 14,
      },
    });

    const containLongLineName = !!omittedTransferLines.find(
      (l) => getLocalizedLineName(l).length > 15
    );

    return (
      <View style={padLineMarksStyle.root}>
        {lineMarks.map((lm, i) =>
          lm ? (
            <View
              style={
                lm.subSign
                  ? padLineMarksStyle.lineMarkWrapperDouble
                  : padLineMarksStyle.lineMarkWrapper
              }
              key={omittedTransferLines[i].id}
            >
              <TransferLineMark
                line={omittedTransferLines[i]}
                mark={lm}
                small
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
              key={omittedTransferLines[i].id}
            >
              <TransferLineDot
                key={omittedTransferLines[i].id}
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

  return (
    <View key={station.name} style={styles.stationNameContainer}>
      <StationNamesWrapper
        stations={stations}
        index={index}
        station={station}
        passed={passed}
      />
      <LinearGradient
        colors={passed ? ['#ccc', '#dadada'] : ['#fdfbfb', '#ebedee']}
        style={styles.lineDot}
      >
        <View
          style={[styles.chevron, arrived ? styles.chevronArrived : undefined]}
        >
          {!index ? <Chevron /> : null}
        </View>
        <PadLineMarks />
      </LinearGradient>
    </View>
  );
};

const LineBoardYamanote: React.FC<Props> = ({
  arrived,
  stations,
  line,
  hasTerminus,
}: Props) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  // 駅が変わるごとにアニメーションをかける
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: windowHeight,
      duration: YAMANOTE_LINE_BOARD_FILL_DURATION,
      useNativeDriver: false,
    }).start();

    return (): void => {
      slideAnim.setValue(0);
    };
  }, [slideAnim, arrived]);

  const stationNameCellForMapSP = (s: Station, i: number): JSX.Element => (
    <StationNameCell
      arrived={arrived}
      stations={stations}
      line={line}
      key={s.groupId}
      station={s}
      index={i}
    />
  );

  if (isPad) {
    return (
      <AnimatedPadArch
        fillHeight={slideAnim}
        stations={stations.slice().reverse()}
        line={line}
        arrived={arrived}
      />
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: 0,
          width: isPad ? windowWidth - 60 : windowWidth - 48,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      />
      <LinearGradient
        colors={
          line
            ? [`#${line.lineColorC}ff`, `#${line.lineColorC}bb`]
            : ['#000000ff', '#000000bb']
        }
        style={{
          ...styles.bar,
          left: 0,
          width: isPad ? windowWidth - 60 : windowWidth - 48,
        }}
      />
      <BarTerminal
        style={styles.barTerminal}
        lineColor={line ? `#${line.lineColorC}` : '#000'}
        hasTerminus={hasTerminus}
      />
      <View style={styles.stationNameWrapper}>
        {stations.map(stationNameCellForMapSP)}
      </View>
    </View>
  );
};

export default LineBoardYamanote;
