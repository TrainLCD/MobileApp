import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, memo } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  PlatformIOSStatic,
  StyleProp,
  TextStyle,
} from 'react-native';

import { Line, Station } from '../../models/StationAPI';
import Chevron from '../ChervronDT';
import BarTerminal from '../BarTerminalDT';
import { getLineMark } from '../../lineMark';
import { filterWithoutCurrentLine } from '../../utils/line';
import TransferLineMark from '../TransferLineMark';
import TransferLineDot from '../TransferLineDot';
import omitJRLinesIfThresholdExceeded from '../../utils/jr';
import { isJapanese } from '../../translation';

interface Props {
  arrived: boolean;
  line: Line;
  stations: Station[];
}

const { isPad } = Platform as PlatformIOSStatic;

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

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

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
    left: 12,
    width: isPad ? windowWidth - 72 : windowWidth - 48 - 12,
    height: isPad ? 48 : 32,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
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
  stations: Station[];
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
  index: number;
}

interface StationNameCellProps {
  arrived: boolean;
  station: Station;
  index: number;
  stations: Station[];
  line: Line;
}

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

  return (
    <StationName
      stations={stations}
      station={station}
      en={!isJapanese}
      horizontal={includesLongStatioName}
      passed={passed}
      index={index}
    />
  );
};
const StationNameCell: React.FC<StationNameCellProps> = ({
  arrived,
  station,
  index,
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

  const PadLineMarks: React.FC = useCallback(() => {
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
  }, [getLocalizedLineName, lineMarks, omittedTransferLines]);

  return (
    <View key={station.name} style={styles.stationNameContainer}>
      <StationNamesWrapper
        index={index}
        stations={stations}
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
          {!index ? <Chevron color="RED" /> : null}
        </View>
        <PadLineMarks />
      </LinearGradient>
    </View>
  );
};

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
          styles.stationNameEn,
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
  horizontal: false,
  passed: false,
};

const LineBoardDT: React.FC<Props> = ({ arrived, stations, line }: Props) => {
  const stationNameCellForMap = useCallback(
    (s: Station, i: number): JSX.Element => (
      <StationNameCell
        key={s.groupId}
        station={s}
        stations={stations}
        index={i}
        arrived={arrived}
        line={line}
      />
    ),
    [arrived, line, stations]
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={styles.bar}
      />
      <LinearGradient
        colors={
          line
            ? [`#${line.lineColorC}ff`, `#${line.lineColorC}bb`]
            : ['#000000ff', '#000000bb']
        }
        style={styles.bar}
      />
      <BarTerminal
        style={styles.barTerminal}
        lineColor={line ? `#${line.lineColorC}` : '#000'}
      />
      <View style={styles.stationNameWrapper}>
        {stations.map(stationNameCellForMap)}
      </View>
    </View>
  );
};

export default memo(LineBoardDT);
