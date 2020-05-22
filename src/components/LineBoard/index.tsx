import { LinearGradient } from 'expo-linear-gradient';
import i18n from 'i18n-js';
import React, { useState, useCallback } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
  PlatformIOSStatic,
} from 'react-native';

import { Line, Station } from '../../models/StationAPI';
import katakanaToRomaji from '../../utils/katakanaToRomaji';
import Chevron from '../Chevron';
import { getLineMark } from '../../lineMark';
import { filterWithoutCurrentLine } from '../../utils/line';
import TransferLineMark from '../TransferLineMark';
import TransferLineDot from '../TransferLineDot';
import omitJRLinesIfThresholdExceeded from '../../utils/jr';

interface Props {
  arrived: boolean;
  line: Line;
  stations: Station[];
}

const { isPad } = Platform as PlatformIOSStatic;

const LineBoard: React.FC<Props> = ({ arrived, stations, line }: Props) => {
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height
  );

  const isJaLocale = i18n.locale === 'ja';

  const onLayout = (): void => {
    setWindowWidth(Dimensions.get('window').width);
    setWindowHeight(Dimensions.get('window').height);
  };

  const getStationNameEnLineHeight = useCallback((): number => {
    if (Platform.OS === 'android') {
      return 24;
    }
    if (isPad) {
      return 32;
    }
    return 21;
  }, []);

  const stationNameEnLineHeight = getStationNameEnLineHeight();

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      height: windowHeight,
      bottom: isPad ? windowHeight / 3 : undefined,
    },
    bar: {
      position: 'absolute',
      bottom: 32,
      width: windowWidth - 48,
      height: isPad ? 40 : 32,
    },
    barTerminal: {
      left: windowWidth - 48 + 6,
      position: 'absolute',
      width: 0,
      height: 0,
      bottom: 32,
      backgroundColor: 'transparent',
      borderStyle: 'solid',
      borderLeftWidth: isPad ? 20 : 16,
      borderRightWidth: isPad ? 20 : 16,
      borderBottomWidth: isPad ? 40 : 32,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      transform: [{ rotate: '90deg' }],
      margin: 0,
      marginLeft: -6,
      borderWidth: 0,
      borderBottomColor: `#${line.lineColorC}`,
    },
    stationNameWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
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
      fontSize: isPad ? 32 : 21,
      lineHeight: stationNameEnLineHeight,
      fontWeight: 'bold',
    },
    stationNameEn: {
      fontSize: isPad ? 32 : 21,
      lineHeight: stationNameEnLineHeight,
      transform: [{ rotate: '-55deg' }],
      fontWeight: 'bold',
      marginBottom: 70,
      marginLeft: -30,
      width: 200,
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
      width: isPad ? 40 : 32,
      height: isPad ? 30 : 24,
      position: 'absolute',
      zIndex: 9999,
      bottom: isPad ? -47.25 : 32 + 4,
      overflow: 'visible',
    },
    chevron: {
      marginLeft: isPad ? 50 : 38,
      width: isPad ? 40 : 32,
      height: isPad ? 30 : 24,
    },
    chevronArrived: {
      marginLeft: 0,
    },
  });

  const includesLongStatioName = !!stations.filter(
    (s) => s.name.includes('ー') || s.name.length > 6
  ).length;

  interface StationNameProps {
    station: Station;
    en?: boolean;
    horizonal?: boolean;
    passed?: boolean;
  }

  const StationName: React.FC<StationNameProps> = ({
    station,
    en,
    horizonal,
    passed,
  }: StationNameProps) => {
    if (en) {
      return (
        <Text style={[styles.stationNameEn, passed ? styles.grayColor : null]}>
          {katakanaToRomaji(station)}
        </Text>
      );
    }
    if (horizonal) {
      return (
        <Text style={[styles.stationNameEn, passed ? styles.grayColor : null]}>
          {station.name}
        </Text>
      );
    }
    return (
      <>
        {station.name.split('').map((c, j) => (
          <Text
            style={[styles.stationName, passed ? styles.grayColor : null]}
            // eslint-disable-next-line react/no-array-index-key
            key={j}
          >
            {c}
          </Text>
        ))}
      </>
    );
  };

  interface StationNamesWrapperProps {
    station: Station;
    passed: boolean;
  }

  const StationNamesWrapper: React.FC<StationNamesWrapperProps> = ({
    station,
    passed,
  }: StationNamesWrapperProps) => {
    if (!isJaLocale) {
      return <StationName station={station} en passed={passed} />;
    }

    if (includesLongStatioName) {
      return <StationName station={station} horizonal passed={passed} />;
    }
    return <StationName station={station} passed={passed} />;
  };

  interface StationNameCellProps {
    station: Station;
    index: number;
  }

  const StationNameCell: React.FC<StationNameCellProps> = ({
    station,
    index,
  }: StationNameCellProps) => {
    const passed = !index && !arrived;
    const transferLines = filterWithoutCurrentLine(stations, line, index);
    const omittedTransferLines = omitJRLinesIfThresholdExceeded(transferLines);
    const lineMarks = omittedTransferLines.map((l) => getLineMark(l));
    const getLocalizedLineName = useCallback((l: Line) => {
      if (i18n.locale === 'ja') {
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
          width: windowWidth / 8,
        },
        lineName: {
          fontWeight: 'bold',
          fontSize: 16,
        },
      });
      return (
        <View style={padLineMarksStyle.root}>
          {lineMarks.map((lm, i) =>
            lm ? (
              <View style={padLineMarksStyle.lineMarkWrapper} key={lm.sign}>
                <TransferLineMark
                  line={omittedTransferLines[i]}
                  mark={lm}
                  small
                />
                {/* 苦肉の策。他にいい方法ないかな */}
                {omittedTransferLines.length <= 5 ? (
                  <Text style={padLineMarksStyle.lineName}>
                    {getLocalizedLineName(omittedTransferLines[i])}
                  </Text>
                ) : null}
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
                {omittedTransferLines.length <= 5 ? (
                  <Text style={padLineMarksStyle.lineName}>
                    {getLocalizedLineName(omittedTransferLines[i])}
                  </Text>
                ) : null}
              </View>
            )
          )}
        </View>
      );
    };

    return (
      <View
        key={station.name}
        onLayout={onLayout}
        style={styles.stationNameContainer}
      >
        <StationNamesWrapper station={station} passed={passed} />
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
            {!index ? <Chevron /> : null}
          </View>
          <PadLineMarks />
        </LinearGradient>
      </View>
    );
  };

  const stationNameCellForMap = (s: Station, i: number): JSX.Element => (
    <StationNameCell key={s.groupId} station={s} index={i} />
  );
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[`#${line.lineColorC}d2`, `#${line.lineColorC}ff`]}
        style={styles.bar}
      />
      <View style={styles.barTerminal} />
      <View style={styles.stationNameWrapper}>
        {stations.map(stationNameCellForMap)}
      </View>
    </View>
  );
};

export default LineBoard;
