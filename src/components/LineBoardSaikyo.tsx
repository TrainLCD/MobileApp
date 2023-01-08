import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from 'react-native';
import { hasNotch } from 'react-native-device-info';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilValue } from 'recoil';
import { NUMBERING_ICON_SIZE } from '../constants/numbering';
import { parenthesisRegexp } from '../constants/regexp';
import useCurrentLine from '../hooks/useCurrentLine';
import useIsEn from '../hooks/useIsEn';
import useLineMarks from '../hooks/useLineMarks';
import useTransferLinesFromStation from '../hooks/useTransferLinesFromStation';
import { Line, Station } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import getLocalizedLineName from '../utils/getLocalizedLineName';
import getStationNameR from '../utils/getStationNameR';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import omitJRLinesIfThresholdExceeded from '../utils/jr';
import { heightScale, widthScale } from '../utils/scale';
import BarTerminal from './BarTerminalSaikyo';
import Chevron from './ChervronTY';
import PassChevronTY from './PassChevronTY';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const useBarStyles = ({
  index,
}: {
  index?: number;
}): { left: number; width: number } => {
  const left = useMemo(() => {
    if (Platform.OS === 'android' && !isTablet) {
      if (index === 0) {
        return widthScale(-32);
      }
      return widthScale(-18);
    }

    if (index === 0) {
      return widthScale(-32);
    }

    return widthScale(-20);
  }, [index]);

  const width = useMemo(() => {
    if (isTablet) {
      if (index === 0) {
        return widthScale(200);
      }
      if (index === 1) {
        return widthScale(61.75);
      }
    }
    if (index === 1) {
      if (!hasNotch() && Platform.OS === 'ios') {
        return widthScale(62);
      }
      if (Platform.OS === 'android' && !isTablet) {
        return widthScale(58);
      }
      return widthScale(62);
    }
    if (!hasNotch() && Platform.OS === 'ios') {
      return widthScale(62);
    }
    if (Platform.OS === 'android' && !isTablet) {
      return widthScale(58);
    }
    return widthScale(62);
  }, [index]);
  return { left, width };
};
interface Props {
  lineColors: (string | null | undefined)[];
  stations: Station[];
  hasTerminus: boolean;
}

const stationNameLineHeight = ((): number => {
  if (Platform.OS === 'android') {
    return 21;
  }
  return 18;
})();

const getStationNameEnExtraStyle = (): StyleProp<TextStyle> => {
  if (!isTablet) {
    return {
      width: heightScale(320),
      marginBottom: 58,
    };
  }
  return {
    width: 250,
    marginBottom: 96,
  };
};

const getBarTerminalRight = (): number => {
  if (isTablet) {
    return -42;
  }
  if (Platform.OS === 'android' && !isTablet) {
    return -26;
  }
  return -31;
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    height: screenHeight,
    bottom: isTablet ? screenHeight / 2.5 : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: isTablet ? -52 : 32,
    height: isTablet ? 48 : 32,
  },
  barTerminal: {
    width: isTablet ? 42 : 33.7,
    height: isTablet ? 53 : 32,
    position: 'absolute',
    right: getBarTerminalRight(),
    bottom: isTablet ? -54 : 32,
  },
  stationNameWrapper: {
    flexDirection: 'row',
    justifyContent: isTablet ? 'flex-start' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  stationNameContainer: {
    width: screenWidth / 9,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 84 : undefined,
    paddingBottom: !isTablet ? 84 : undefined,
  },
  stationName: {
    textAlign: 'center',
    fontSize: RFValue(18),
    lineHeight: RFValue(stationNameLineHeight),
    fontWeight: 'bold',
    color: '#3a3a3a',
    marginLeft: isTablet ? 10 : 5,
  },
  stationNameEn: {
    fontSize: RFValue(18),
    lineHeight: RFValue(stationNameLineHeight),
    transform: [{ rotate: '-55deg' }],
    fontWeight: '500',
    marginLeft: -30,
    color: '#3a3a3a',
  },
  stationNameHorizontal: {
    fontSize: RFValue(18),
    lineHeight: RFValue(stationNameLineHeight),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: -30,
    color: '#3a3a3a',
  },
  grayColor: {
    color: '#ccc',
  },
  lineDot: {
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -46 : 32 + 4,
    overflow: 'visible',
  },
  chevron: {
    position: 'absolute',
    zIndex: 9999,
    bottom: 32,
    marginLeft: widthScale(14),
    width: isTablet ? 48 : 32,
    height: isTablet ? 48 : 32,
    marginTop: isTablet ? -6 : -4,
  },
  passChevron: {
    width: isTablet ? 48 : 16,
    height: isTablet ? 32 : 24,
    marginLeft: isTablet ? 0 : widthScale(3),
  },
});
interface StationNameProps {
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
}

interface StationNameCellProps {
  station: Station;
  index: number;
  stations: Station[];
  line: Line | null;
  lineColors: (string | null | undefined)[];
  hasTerminus: boolean;
  containLongLineName: boolean;
  chevronColor: 'RED' | 'BLUE' | 'WHITE';
}

const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  horizontal,
  passed,
}: StationNameProps) => {
  const stationNameR = getStationNameR(station);

  if (en) {
    return (
      <Text
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(),
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
          styles.stationNameHorizontal,
          getStationNameEnExtraStyle(),
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

const StationNameCell: React.FC<StationNameCellProps> = ({
  station,
  // index === 0: 残り駅が8駅以上あるので画面の端にchevronがある
  index,
  stations,
  line,
  lineColors,
  hasTerminus,
  containLongLineName,
  chevronColor,
}: StationNameCellProps) => {
  const { station: currentStation, arrived } = useRecoilValue(stationState);

  const transferLines = useTransferLinesFromStation(station);
  const omittedTransferLines = omitJRLinesIfThresholdExceeded(
    transferLines
  ).map((l) => ({
    ...l,
    name: l.name.replace(parenthesisRegexp, ''),
    nameR: l.nameR.replace(parenthesisRegexp, ''),
  }));
  const currentStationIndex = stations.findIndex(
    (s) => s.groupId === currentStation?.groupId
  );
  const isEn = useIsEn();

  const passed = index <= currentStationIndex || (!index && !arrived);
  const shouldGrayscale =
    getIsPass(station) ||
    (arrived && currentStationIndex === index ? false : passed);

  const lineMarks = useLineMarks({
    station,
    transferLines,
    grayscale: shouldGrayscale,
  });

  const PadLineMarks: React.FC = useCallback(() => {
    if (!isTablet) {
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
      lineNameWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
      },
      lineName: {
        fontWeight: 'bold',
        fontSize: RFValue(10),
        color: shouldGrayscale ? '#ccc' : 'black',
      },
      lineNameLong: {
        fontWeight: 'bold',
        fontSize: RFValue(7),
        color: shouldGrayscale ? '#ccc' : 'black',
      },
    });

    return (
      <View style={padLineMarksStyle.root}>
        {lineMarks.map((lm, i) =>
          lm ? (
            <View
              style={padLineMarksStyle.lineMarkWrapper}
              key={omittedTransferLines[i]?.id}
            >
              <TransferLineMark
                line={omittedTransferLines[i]}
                mark={lm}
                size={NUMBERING_ICON_SIZE.TINY}
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
                shouldGrayscale={shouldGrayscale}
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
  }, [containLongLineName, lineMarks, omittedTransferLines, shouldGrayscale]);

  const { left: barLeft, width: barWidth } = useBarStyles({
    index,
  });

  const LineDot: React.FC = () => {
    if (getIsPass(station)) {
      return (
        <View style={styles.lineDot}>
          <View style={styles.passChevron}>
            {currentStationIndex < index ? <PassChevronTY /> : null}
          </View>
          <View style={{ marginTop: 8 }}>
            <PadLineMarks />
          </View>
        </View>
      );
    }

    if (
      (passed && currentStationIndex >= index + 1 && arrived) || arrived
        ? currentStationIndex >= index + 1
        : currentStationIndex >= index
    ) {
      return (
        <View style={styles.lineDot}>
          <View style={styles.passChevron} />
          <View style={{ marginTop: 8 }}>
            <PadLineMarks />
          </View>
        </View>
      );
    }

    return (
      <LinearGradient
        colors={
          passed && !arrived ? ['#ccc', '#dadada'] : ['#fdfbfb', '#ebedee']
        }
        style={styles.lineDot}
      >
        <View
          style={{
            position: 'absolute',
            top: isTablet ? 38 : 0,
          }}
        >
          <PadLineMarks />
        </View>
      </LinearGradient>
    );
  };

  const additionalChevronStyle = ((): { left: number } | null => {
    if (!index) {
      if (arrived) {
        return {
          left: widthScale(-14),
        };
      }
      return null;
    }
    if (arrived) {
      return {
        left: widthScale(41.75 * index) - widthScale(14),
      };
    }
    if (!passed) {
      if (!arrived) {
        return {
          left: widthScale(42 * index),
        };
      }
      return {
        left: widthScale(45 * index),
      };
    }
    return {
      left: widthScale(42 * index),
    };
  })();

  const includesLongStatioName = useMemo(
    () =>
      !!stations.filter((s) => s.name.includes('ー') || s.name.length > 6)
        .length,
    [stations]
  );

  return (
    <>
      <View key={station.name} style={styles.stationNameContainer}>
        <StationName
          station={station}
          en={isEn}
          horizontal={includesLongStatioName}
          passed={getIsPass(station) || shouldGrayscale}
        />
        <LinearGradient
          colors={['#fff', '#000', '#000']}
          locations={[0.1, 0.5, 0.9]}
          style={{
            ...styles.bar,
            left: barLeft,
            width: barWidth,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          }}
        />
        <LinearGradient
          colors={
            line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']
          }
          style={{
            ...styles.bar,
            left: barLeft,
            width: barWidth,
          }}
        />
        {(arrived && currentStationIndex < index + 1) || !passed ? (
          <LinearGradient
            colors={['#fff', '#000', '#000']}
            locations={[0.1, 0.5, 0.9]}
            style={{
              ...styles.bar,
              left: barLeft,
              width: barWidth,
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }}
          />
        ) : null}
        {arrived &&
        currentStationIndex !== 0 &&
        currentStationIndex === index &&
        currentStationIndex !== stations.length - 1 ? (
          <LinearGradient
            colors={
              line ? ['#aaaaaaff', '#aaaaaabb'] : ['#000000ff', '#000000bb']
            }
            style={{
              ...styles.bar,
              left: barLeft,
              width: barWidth / 2.5,
            }}
          />
        ) : null}
        {(arrived && currentStationIndex < index + 1) || !passed ? (
          <LinearGradient
            colors={
              line
                ? [
                    `#${lineColors[index] || line.lineColorC}ff`,
                    `#${lineColors[index] || line.lineColorC}bb`,
                  ]
                : ['#000000ff', '#000000bb']
            }
            style={{
              ...styles.bar,
              left:
                currentStationIndex !== 0 &&
                currentStationIndex === index &&
                currentStationIndex !== stations.length - 1
                  ? barLeft + barWidth / 2.5
                  : barLeft,
              width:
                currentStationIndex !== 0 &&
                currentStationIndex === index &&
                currentStationIndex !== stations.length - 1
                  ? barWidth / 2.5
                  : barWidth,
            }}
          />
        ) : null}
        <LineDot />
        {stations.length - 1 === index ? (
          <BarTerminal
            style={styles.barTerminal}
            lineColor={
              line
                ? `#${lineColors[lineColors.length - 1] || line.lineColorC}`
                : '#000'
            }
            hasTerminus={hasTerminus}
          />
        ) : null}
      </View>
      <View style={[styles.chevron, additionalChevronStyle]}>
        {(currentStationIndex < 1 && index === 0) ||
        currentStationIndex === index ? (
          <Chevron color={chevronColor} />
        ) : null}
      </View>
    </>
  );
};

const LineBoardSaikyo: React.FC<Props> = ({
  stations,
  hasTerminus,
  lineColors,
}: Props) => {
  const [chevronColor, setChevronColor] = useState<'RED' | 'WHITE'>('RED');
  const { selectedLine } = useRecoilValue(lineState);
  const currentLine = useCurrentLine();

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const containLongLineName =
    stations.findIndex(
      (s) =>
        s.lines.findIndex(
          (l) => (getLocalizedLineName(l)?.length || 0) > 15
        ) !== -1
    ) !== -1;

  useEffect(() => {
    const step = () => {
      const timestamp = new Date().getTime();
      if (Math.floor(timestamp) % 2 === 0) {
        setChevronColor('RED');
        return;
      }
      setChevronColor('WHITE');
    };
    const interval = setInterval(step, 1000);
    return () => clearInterval(interval);
  }, []);

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): JSX.Element | null => {
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
            containLongLineName={containLongLineName}
            chevronColor={chevronColor}
          />
        </React.Fragment>
      );
    },
    [chevronColor, containLongLineName, hasTerminus, line, lineColors, stations]
  );

  return (
    <View style={styles.root}>
      <View style={styles.stationNameWrapper}>
        {(
          [
            ...stations,
            ...Array.from({ length: 8 - stations.length }),
          ] as Station[]
        ).map(stationNameCellForMap)}
      </View>
    </View>
  );
};

export default React.memo(LineBoardSaikyo);
