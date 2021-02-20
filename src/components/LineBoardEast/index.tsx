import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, memo, useEffect, useState, useMemo } from 'react';
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

import { useRecoilValue } from 'recoil';
import { Line, Station } from '../../models/StationAPI';
import Chevron from '../ChervronDT';
import BarTerminal from '../BarTerminalEast';
import { getLineMark } from '../../lineMark';
import { filterWithoutCurrentLine } from '../../utils/line';
import TransferLineMark from '../TransferLineMark';
import TransferLineDot from '../TransferLineDot';
import omitJRLinesIfThresholdExceeded from '../../utils/jr';
import { isJapanese } from '../../translation';
import navigationState from '../../store/atoms/navigation';
import PassChevronDT from '../PassChevronDT';

interface Props {
  arrived: boolean;
  line: Line;
  stations: Station[];
  isMetro?: boolean;
  hasTerminus: boolean;
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const stationNameEnLineHeight = getStationNameEnLineHeight();

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: screenHeight,
    bottom: isPad ? screenHeight / 2.5 : undefined,
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
    width: screenWidth / 9,
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
    setIsEn(headerState.endsWith('_EN'));
  }, [headerState]);

  return (
    <StationName
      stations={stations}
      station={station}
      en={isEn}
      horizontal={includesLongStatioName}
      passed={station.pass || passed}
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

  const [chevronColor, setChevronColor] = useState<'RED' | 'BLUE'>('BLUE');

  useEffect(() => {
    const interval = setInterval(() => {
      setChevronColor((prev) => (prev === 'RED' ? 'BLUE' : 'RED'));
    }, 1000);

    return (): void => {
      clearInterval(interval);
    };
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
        width: screenWidth / 10,
        flexDirection: 'row',
      },
      lineMarkWrapperDouble: {
        marginTop: 4,
        width: screenWidth / 10,
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
      {station.pass ? (
        <View style={styles.lineDot}>
          <PassChevronDT />
        </View>
      ) : (
        <LinearGradient
          colors={passed ? ['#ccc', '#dadada'] : ['#fdfbfb', '#ebedee']}
          style={styles.lineDot}
        >
          <View
            style={[
              styles.chevron,
              arrived ? styles.chevronArrived : undefined,
            ]}
          >
            {!index ? <Chevron color={chevronColor} /> : null}
          </View>
          <PadLineMarks />
        </LinearGradient>
      )}
    </View>
  );
};

const LineBoardEast: React.FC<Props> = ({
  arrived,
  stations,
  line,
  isMetro,
  hasTerminus,
}: Props) => {
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

  const barRightPad = isMetro ? 0 : 12;

  const barLeftLeaved = useMemo(() => {
    if (isMetro) {
      return 0;
    }

    return 12;
  }, [isMetro]);

  const barLeftMain = useMemo(() => {
    if (isPad) {
      if (isMetro) {
        if (arrived) {
          return 0;
        }
        return 120;
      }
      if (arrived) {
        return 12;
      }
      return 120;
    }

    if (isMetro) {
      if (arrived) {
        return 0;
      }
      return 84;
    }
    if (arrived) {
      return 12;
    }
    return 84;
  }, [arrived, isMetro]);

  const barWidthLeaved = useMemo(() => {
    if (isPad) {
      return screenWidth - 60 - barRightPad;
    }
    if (Platform.OS === 'android' && isMetro) {
      if (!arrived) {
        return screenWidth - 48 - 72;
      }
      return screenWidth - 48;
    }

    return screenWidth - 48 - barRightPad;
  }, [arrived, barRightPad, isMetro]);

  const barWidthMain = useMemo(() => {
    if (isPad) {
      if (!isMetro) {
        if (!arrived) {
          return screenWidth - 60 - barRightPad - 108;
        }
        return screenWidth - 60 - barRightPad;
      }

      if (!arrived) {
        return screenWidth - 60 - barRightPad - 120;
      }
      return screenWidth - 60 - barRightPad;
    }
    if (Platform.OS === 'android') {
      if (isMetro) {
        if (!arrived) {
          return screenWidth - 48 - 84;
        }
        return screenWidth - 48;
      }
    }

    if (!isMetro) {
      if (!arrived) {
        return screenWidth - 48 - barRightPad - 72;
      }

      return screenWidth - 48 - barRightPad;
    }

    if (!arrived) {
      return screenWidth - 48 - barRightPad - 84;
    }

    return screenWidth - 48 - barRightPad;
  }, [arrived, barRightPad, isMetro]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: barLeftLeaved,
          width: barWidthLeaved,
          borderTopLeftRadius: isMetro ? 0 : 4,
          borderBottomLeftRadius: isMetro ? 0 : 4,
        }}
      />
      <LinearGradient
        colors={line ? [`#aaaaaaff`, `#aaaaaabb`] : ['#000000ff', '#000000bb']}
        style={{
          ...styles.bar,
          left: barLeftLeaved,
          width: barWidthLeaved,
        }}
      />
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
        style={{
          ...styles.bar,
          left: barLeftMain,
          width: barWidthMain,
          borderTopLeftRadius: isMetro ? 0 : 4,
          borderBottomLeftRadius: isMetro ? 0 : 4,
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
          left: barLeftMain,
          width: barWidthMain,
        }}
      />
      <BarTerminal
        style={styles.barTerminal}
        lineColor={line ? `#${line.lineColorC}` : '#000'}
        hasTerminus={hasTerminus}
      />
      <View style={styles.stationNameWrapper}>
        {stations.map(stationNameCellForMap)}
      </View>
    </View>
  );
};

LineBoardEast.defaultProps = {
  isMetro: false,
};

export default memo(LineBoardEast);
