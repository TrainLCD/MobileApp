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
import { Line, Station } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import isDifferentStationName from '../utils/differentStationName';
import getLocalizedLineName from '../utils/getLocalizedLineName';
import getStationNameR from '../utils/getStationNameR';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import omitJRLinesIfThresholdExceeded from '../utils/jr';
import { filterWithoutCurrentLine } from '../utils/line';
import { heightScale, widthScale } from '../utils/scale';
import BarTerminal from './BarTerminalEast';
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

type Props = {
  lineColors: (string | null | undefined)[];
  lines: Line[];
  stations: Station[];
  hasTerminus: boolean;
  withExtraLanguage: boolean;
};

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
    width: RFValue(21),
    textAlign: 'center',
    fontSize: RFValue(18),
    lineHeight: RFValue(stationNameLineHeight),
    fontWeight: 'bold',
    marginLeft: isTablet ? 5 : 2.5,
  },
  stationNameExtra: {
    width: RFValue(11),
    textAlign: 'center',
    fontSize: RFValue(11),
    lineHeight: RFValue(11),
    fontWeight: 'bold',
  },
  stationNameEn: {
    fontSize: RFValue(18),
    lineHeight: RFValue(stationNameLineHeight),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: -30,
  },
  stationNameHoriontalJa: {
    fontSize: RFValue(18),
    lineHeight: RFValue(stationNameLineHeight),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: widthScale(-12.75),
    position: 'absolute',
    bottom: isTablet ? 0 : 16,
  },
  stationNameHorizontalExtra: {
    fontSize: RFValue(11),
    lineHeight: RFValue(11),
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: -5,
    bottom: isTablet ? 0 : 16,
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
    marginLeft: isTablet ? 0 : widthScale(5),
  },
  stationNameWithExtraLang: {
    position: 'relative',
  },
  splittedStationNameWithExtraLang: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  stationNumber: {
    width: screenWidth / 9,
    fontSize: RFValue(12),
    fontWeight: 'bold',
  },
});
interface StationNameProps {
  station: Station;
  en?: boolean;
  horizontal?: boolean;
  passed?: boolean;
  withExtraLanguage: boolean;
}

interface StationNameCellProps {
  station: Station;
  index: number;
  stations: Station[];
  line: Line;
  lines: Line[];
  lineColors: (string | null | undefined)[];
  hasTerminus: boolean;
  chevronColor: 'RED' | 'BLUE' | 'WHITE';
  withExtraLanguage: boolean;
}

const StationName: React.FC<StationNameProps> = ({
  station,
  en,
  horizontal,
  passed,
  withExtraLanguage,
}: StationNameProps) => {
  const stationNameR = getStationNameR(station);
  if (en) {
    if (withExtraLanguage && station.nameZh.length) {
      return (
        <View style={styles.stationNameWithExtraLang}>
          <Text
            style={[
              styles.stationNameHoriontalJa,
              getStationNameEnExtraStyle(),
              passed ? styles.grayColor : null,
            ]}
          >
            {stationNameR}
          </Text>
          <Text
            style={[
              styles.stationNameHorizontalExtra,
              getStationNameEnExtraStyle(),
              passed ? styles.grayColor : null,
            ]}
          >
            {station.nameZh}
          </Text>
        </View>
      );
    }

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
    if (withExtraLanguage && station.nameKo.length) {
      return (
        <View style={styles.stationNameWithExtraLang}>
          <Text
            style={[
              styles.stationNameHoriontalJa,
              getStationNameEnExtraStyle(),
              passed ? styles.grayColor : null,
            ]}
          >
            {station.name}
          </Text>
          <Text
            style={[
              styles.stationNameHorizontalExtra,
              getStationNameEnExtraStyle(),
              passed ? styles.grayColor : null,
            ]}
          >
            {station.nameKo}
          </Text>
        </View>
      );
    }

    return (
      <Text
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(),
          passed ? styles.grayColor : null,
        ]}
      >
        {station.name}
      </Text>
    );
  }

  if (withExtraLanguage && station.nameKo.length) {
    return (
      <View style={styles.splittedStationNameWithExtraLang}>
        <View>
          {station.name.split('').map((c, j) => (
            <Text
              style={[styles.stationName, passed ? styles.grayColor : null]}
              key={`${j + 1}${c}`}
            >
              {c}
            </Text>
          ))}
        </View>
        <View>
          {station.nameKo.split('').map((c, j) => (
            <Text
              style={[
                styles.stationNameExtra,
                passed ? styles.grayColor : null,
              ]}
              key={`${j + 1}${c}`}
            >
              {c}
            </Text>
          ))}
        </View>
      </View>
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
  index,
  stations,
  line,
  lines,
  lineColors,
  hasTerminus,
  chevronColor,
  withExtraLanguage,
}: StationNameCellProps) => {
  const { station: currentStation, arrived } = useRecoilValue(stationState);

  const isEn = useIsEn();

  const currentStationIndex = stations.findIndex(
    (s) => s.groupId === currentStation?.groupId
  );

  const passed = index <= currentStationIndex || (!index && !arrived);
  const shouldGrayscale =
    getIsPass(station) ||
    (arrived && currentStationIndex === index ? false : passed);

  const transferLines = filterWithoutCurrentLine(stations, line, index).filter(
    (l) => lines.findIndex((il) => l.id === il?.id) === -1
  );
  const omittedTransferLines = omitJRLinesIfThresholdExceeded(
    transferLines
  ).map((l) => ({
    ...l,
    name: l.name.replace(parenthesisRegexp, ''),
    nameR: l.nameR.replace(parenthesisRegexp, ''),
  }));
  const lineMarks = useLineMarks({
    station,
    transferLines,
    omittedTransferLines,
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
                <Text style={padLineMarksStyle.lineName}>
                  {`${
                    isEn
                      ? omittedTransferLines[i]?.nameR
                      : omittedTransferLines[i]?.name
                  }${
                    isDifferentStationName(station, omittedTransferLines[i])
                      ? `\n[ ${
                          isEn
                            ? omittedTransferLines[i]?.transferStation?.nameR
                            : omittedTransferLines[i]?.transferStation?.name
                        } ]`
                      : ''
                  }`}
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
              <Text style={padLineMarksStyle.lineName}>
                {getLocalizedLineName(omittedTransferLines[i])}
              </Text>
            </View>
          )
        )}
      </View>
    );
  }, [isEn, lineMarks, omittedTransferLines, shouldGrayscale, station]);
  const { left: barLeft, width: barWidth } = useBarStyles({ index });

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
      <View
        key={station.name}
        style={[
          styles.stationNameContainer,
          withExtraLanguage && {
            paddingBottom: !isTablet ? 64 : undefined,
          },
        ]}
      >
        <StationName
          station={station}
          en={isEn}
          horizontal={includesLongStatioName}
          passed={getIsPass(station) || shouldGrayscale}
          withExtraLanguage={withExtraLanguage}
        />
        {withExtraLanguage && station.stationNumbers[0]?.stationNumber ? (
          <Text
            style={[
              styles.stationNumber,
              getIsPass(station) || shouldGrayscale ? styles.grayColor : null,
            ]}
          >
            {station.stationNumbers[0]?.stationNumber}
          </Text>
        ) : null}
        <LinearGradient
          colors={['#fff', '#000', '#000', '#fff']}
          locations={[0.5, 0.5, 0.5, 0.9]}
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
            colors={['#fff', '#000', '#000', '#fff']}
            locations={[0.5, 0.5, 0.5, 0.9]}
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
        {getIsPass(station) ? (
          <View style={styles.lineDot}>
            <View style={[styles.passChevron]}>
              <PassChevronTY />
            </View>
            <View style={{ marginTop: 8 }}>
              <PadLineMarks />
            </View>
          </View>
        ) : (
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
        )}
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

type EmptyStationNameCellProps = {
  lastLineColor: string;
  isLast: boolean;
  hasTerminus: boolean;
};

const EmptyStationNameCell: React.FC<EmptyStationNameCellProps> = ({
  lastLineColor: lastLineColorOriginal,
  isLast,
  hasTerminus,
}: EmptyStationNameCellProps) => {
  const lastLineColor = lastLineColorOriginal.startsWith('#')
    ? lastLineColorOriginal
    : `#${lastLineColorOriginal}`;
  const { left: barLeft, width: barWidth } = useBarStyles({});

  return (
    <View style={styles.stationNameContainer}>
      <LinearGradient
        colors={['#fff', '#000', '#000', '#fff']}
        locations={[0.5, 0.5, 0.5, 0.9]}
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
          lastLineColor
            ? [`${lastLineColor}ff`, `${lastLineColor}bb`]
            : ['#000000ff', '#000000bb']
        }
        style={{
          ...styles.bar,
          left: barLeft,
          width: barWidth,
        }}
      />
      {isLast ? (
        <BarTerminal
          style={styles.barTerminal}
          lineColor={lastLineColor}
          hasTerminus={hasTerminus}
        />
      ) : null}
    </View>
  );
};
const LineBoardEast: React.FC<Props> = ({
  stations,
  lines,
  hasTerminus,
  lineColors,
  withExtraLanguage,
}: Props) => {
  const [chevronColor, setChevronColor] = useState<'RED' | 'BLUE'>('BLUE');
  const { selectedLine } = useRecoilValue(lineState);
  const currentLine = useCurrentLine();

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  useEffect(() => {
    const step = () => {
      const timestamp = new Date().getTime();
      if (Math.floor(timestamp) % 2 === 0) {
        setChevronColor('RED');
        return;
      }
      setChevronColor('BLUE');
    };
    const interval = setInterval(step, 1000);
    return () => clearInterval(interval);
  }, []);

  const stationNameCellForMap = useCallback(
    (s: Station, i: number): JSX.Element | null => {
      if (!s) {
        return (
          <EmptyStationNameCell
            lastLineColor={
              lineColors[lineColors.length - 1] ||
              `#${line?.lineColorC || 'fff'}`
            }
            key={i}
            isLast={
              [...stations, ...Array.from({ length: 8 - stations.length })]
                .length -
                1 ===
              i
            }
            hasTerminus={hasTerminus}
          />
        );
      }

      if (!line) {
        return null;
      }

      return (
        <React.Fragment key={s.groupId}>
          <StationNameCell
            station={s}
            stations={stations}
            index={i}
            line={line}
            lines={lines}
            lineColors={lineColors}
            hasTerminus={hasTerminus}
            chevronColor={chevronColor}
            withExtraLanguage={withExtraLanguage}
          />
        </React.Fragment>
      );
    },
    [
      chevronColor,
      hasTerminus,
      line,
      lineColors,
      lines,
      stations,
      withExtraLanguage,
    ]
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

export default React.memo(LineBoardEast);
