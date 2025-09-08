import { darken } from 'polished';
import React, { useCallback } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import type { Line, Station } from '~/gen/proto/stationapi_pb';
import {
  MANY_LINES_THRESHOLD,
  MARK_SHAPE,
  NUMBERING_ICON_SIZE,
  parenthesisRegexp,
  YAMANOTE_CHEVRON_MOVE_DURATION,
  YAMANOTE_CHEVRON_SCALE_DURATION,
  YAMANOTE_LINE_BOARD_FILL_DURATION,
} from '../constants';
import type { LineMark } from '../models/LineMark';
import getIsPass from '../utils/isPass';
import { ChevronYamanote } from './ChevronYamanote';
import NumberingIcon from './NumberingIcon';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';
import Typography from './Typography';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

type NumberingInfo = {
  stationNumber: string;
  lineMarkShape: LineMark;
  lineColor: string;
};

type Props = {
  line: Line;
  stations: Station[];
  arrived: boolean;
  transferLines: Line[];
  station: Station | null;
  numberingInfo: (NumberingInfo | null)[];
  lineMarks: (LineMark | null)[];
  isEn: boolean;
};

type State = {
  fillHeight: Animated.Value;
  bgScale: Animated.Value;
  chevronBottom: Animated.Value;
  chevronOpacity: Animated.Value;
};

const styles = StyleSheet.create({
  stationNames: {
    position: 'absolute',
  },
  stationNameContainer: {
    position: 'absolute',
    width: windowWidth / 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationName: {
    fontSize: 32,
    fontWeight: 'bold',
    width: windowWidth / 4,
  },
  circle: {
    position: 'absolute',
    width: 68,
    height: 68,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: 'white',
  },
  arrivedCircle: {
    width: 18,
    height: 18,
    marginLeft: 32,
    marginTop: 24,
  },
  animatedSurface: {
    position: 'absolute',
    bottom: -128,
  },
  clipViewStyle: {
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    width: windowWidth,
  },
  chevron: {
    position: 'absolute',
    width: 60,
    height: 45,
    right: windowWidth / 3.1,
    transform: [{ rotate: '-20deg' }],
    zIndex: 1,
  },
  chevronArrived: {
    width: 72,
    height: 54,
    top: (4 * windowHeight) / 7,
    right: windowWidth / 2.985,
    transform: [{ rotate: '-110deg' }, { scale: 1.5 }],
    zIndex: 0,
  },
  transfers: {
    width: windowWidth / 2,
    position: 'absolute',
    top: windowHeight / 4,
    left: 24,
  },
  transfersMany: {
    position: 'absolute',
    top: windowHeight / 6,
    left: 24,
  },
  transfersCurrentStationName: {
    fontWeight: 'bold',
    fontSize: 32,
    marginBottom: 4,
  },
  transfersCurrentStationNameEn: {
    fontWeight: 'bold',
    fontSize: 32,
    marginBottom: 21,
  },
  transferAtText: {
    fontSize: 32,
    color: '#555',
    marginBottom: 21,
  },
  transferAtTextEn: {
    fontSize: 32,
    color: '#555',
  },
  transferLines: {
    width: windowWidth / 3,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  transferLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginRight: 8,
  },
  lineName: {
    fontSize: 24,
    color: '#212121',
    fontWeight: 'bold',
  },
  numberingIconPlaceholder: {
    width: 48,
    height: 96,
  },
  numberingIconContainer: {
    width: 96,
    height: 96,
    transform: [{ scale: 0.5 }],
    marginRight: -16,
  },
  numberingSquareIconContainer: {
    width: 108,
    height: 108,
    transform: [{ scale: 0.5 }],
    marginRight: -16,
  },
  halfOpacity: {
    opacity: 0.5,
  },
});

type TransfersProps = {
  transferLines: Line[];
  lineMarks: (LineMark | null)[];
  station: Station | null;
  isEn: boolean;
};

const Transfers: React.FC<TransfersProps> = ({
  transferLines,
  station,
  lineMarks,
  isEn,
}: TransfersProps) => {
  const renderTransferLines = useCallback(
    (): React.ReactNode[] =>
      transferLines.map((l, i) => {
        const lineMark = lineMarks[i];

        return (
          <View style={styles.transferLine} key={l.id}>
            {lineMark ? (
              <TransferLineMark
                line={l}
                mark={lineMark}
                size={NUMBERING_ICON_SIZE.SMALL}
              />
            ) : (
              <TransferLineDot line={l} small />
            )}
            <Typography style={styles.lineName}>
              {isEn
                ? l.nameRoman?.replace(parenthesisRegexp, '')
                : l.nameShort.replace(parenthesisRegexp, '')}
            </Typography>
          </View>
        );
      }),
    [isEn, lineMarks, transferLines]
  );

  if (!transferLines?.length) {
    return null;
  }

  return (
    <>
      {isEn ? (
        <View
          style={
            transferLines?.length > MANY_LINES_THRESHOLD
              ? styles.transfersMany
              : styles.transfers
          }
        >
          <Typography style={styles.transferAtTextEn}>Transfer at</Typography>
          <Typography style={styles.transfersCurrentStationNameEn}>
            {`${station?.nameRoman} Station`}
          </Typography>
          <View style={styles.transferLines}>{renderTransferLines()}</View>
        </View>
      ) : (
        <View
          style={
            transferLines?.length > MANY_LINES_THRESHOLD
              ? styles.transfersMany
              : styles.transfers
          }
        >
          <Typography style={styles.transfersCurrentStationName}>
            {`${station?.name ?? ''}駅`}
          </Typography>
          <Typography style={styles.transferAtText}>乗換えのご案内</Typography>
          <View style={styles.transferLines}>{renderTransferLines()}</View>
        </View>
      )}
    </>
  );
};

class PadArch extends React.PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);
    const bgScale = new Animated.Value(0.95);
    const chevronBottom = new Animated.Value(72);
    const chevronOpacity = new Animated.Value(1);
    const fillHeight = new Animated.Value(0);
    this.state = {
      bgScale,
      chevronBottom,
      chevronOpacity,
      fillHeight,
    };
  }

  componentDidMount(): void {
    this.animated();
    this.startSlidingAnimation();
  }

  componentDidUpdate(prevProps: Props): void {
    const { arrived } = this.props;

    this.animated();
    // 発車ごとにアニメーションをかける
    if (arrived !== prevProps.arrived) {
      this.startSlidingAnimation();
    }
  }

  animated = (): void => {
    const { arrived } = this.props;
    const { bgScale, chevronBottom, chevronOpacity } = this.state;

    if (arrived) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bgScale, {
            toValue: 0.8,
            duration: YAMANOTE_CHEVRON_SCALE_DURATION,
            useNativeDriver: false,
          }),
          Animated.timing(bgScale, {
            toValue: 0.95,
            duration: YAMANOTE_CHEVRON_SCALE_DURATION,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      Animated.loop(
        Animated.sequence([
          Animated.timing(chevronBottom, {
            toValue: 110,
            duration: YAMANOTE_CHEVRON_MOVE_DURATION,
            useNativeDriver: false,
          }),
          Animated.timing(chevronOpacity, {
            toValue: 0,
            duration: YAMANOTE_CHEVRON_MOVE_DURATION / 2,
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  };

  startSlidingAnimation = (): void => {
    const { fillHeight } = this.state;
    fillHeight.setValue(0);
    Animated.timing(fillHeight, {
      toValue: Dimensions.get('window').height,
      duration: YAMANOTE_LINE_BOARD_FILL_DURATION,
      useNativeDriver: false,
    }).start();
  };

  getDotLeft = (i: number): number => {
    switch (i) {
      case 0:
        return windowWidth / 3;
      case 1:
        return windowWidth / 2.35;
      case 2:
        return windowWidth / 1.975;
      case 3:
        return windowWidth / 1.785;
      case 4:
        return windowWidth / 1.655 - 3.5; // 普通のiPadとiPad Pro用の微調整
      default:
        return 0;
    }
  };

  getStationNameLeft = (i: number): number => {
    switch (i) {
      case 0:
        return windowWidth / 2.2;
      case 1:
        return windowWidth / 1.925;
      case 2:
        return windowWidth / 1.7;
      case 3:
        return windowWidth / 1.55;
      case 4:
        return windowWidth / 1.47;
      default:
        return 0;
    }
  };

  getStationNameTop = (i: number): number => {
    switch (i) {
      case 0:
        return -8;
      case 1:
        return windowHeight / 11.5;
      case 2:
        return windowHeight / 4.5;
      case 3:
        return windowHeight / 2.75;
      case 4:
        return windowHeight / 1.9;
      default:
        return 0;
    }
  };

  getCustomDotStyle = (
    i: number,
    stations: Station[],
    arrived: boolean,
    pass: boolean
  ): {
    left: number;
    top: number;
    backgroundColor: string;
  } => {
    const dotColor =
      i === stations.length - 2 && !arrived && !pass ? '#F6BE00' : 'white';

    return {
      left: this.getDotLeft(i),
      top: !i ? windowHeight / 30 : (i * windowHeight) / 7,
      backgroundColor: dotColor,
    };
  };

  getCustomStationNameStyle = (i: number): { left: number; top: number } => ({
    left: this.getStationNameLeft(i),
    top: this.getStationNameTop(i),
  });

  render(): React.ReactElement {
    const {
      arrived,
      line,
      stations,
      transferLines,
      station,
      numberingInfo,
      lineMarks,
      isEn,
    } = this.props;
    const AnimatedChevron = Animated.createAnimatedComponent(ChevronYamanote);
    const { bgScale, chevronBottom, chevronOpacity, fillHeight } = this.state;

    const pathD1 = `M -4 -60 A ${windowWidth / 1.5} ${windowHeight} 0 0 1 ${
      windowWidth / 1.5 - 4
    } ${windowHeight}`;
    const pathD2 = `M 0 -64 A ${windowWidth / 1.5} ${windowHeight} 0 0 1 ${
      windowWidth / 1.5
    } ${windowHeight}`;
    const pathD3 = `M 0 -64 A ${windowWidth / 1.5} ${windowHeight} 0 0 1 ${
      windowWidth / 1.5
    } ${windowHeight}`;
    const hexLineColor = line.color ?? '#000';

    return (
      <>
        <Transfers
          transferLines={transferLines}
          station={station}
          lineMarks={lineMarks}
          isEn={isEn}
        />

        <Svg width={windowWidth} height={windowHeight} fill="transparent">
          <Path d={pathD1} stroke="#333" strokeWidth={128} />
          <Path d={pathD2} stroke="#505a6e" strokeWidth={128} />
        </Svg>

        <Animated.View style={{ ...styles.clipViewStyle, height: fillHeight }}>
          <Svg
            style={styles.animatedSurface}
            width={windowWidth}
            height={windowHeight}
            fill="transparent"
          >
            <Path
              d={pathD1}
              stroke={darken(0.3, hexLineColor)}
              strokeWidth={128}
            />
          </Svg>
        </Animated.View>
        <Animated.View style={{ ...styles.clipViewStyle, height: fillHeight }}>
          <Svg
            style={styles.animatedSurface}
            width={windowWidth}
            height={windowHeight}
            fill="transparent"
          >
            <Path d={pathD3} stroke={hexLineColor} strokeWidth={128} />
          </Svg>
        </Animated.View>
        <Animated.View
          style={[
            styles.chevron,
            arrived
              ? styles.chevronArrived
              : { bottom: chevronBottom, opacity: chevronOpacity },
          ]}
        >
          <AnimatedChevron backgroundScale={bgScale} arrived={arrived} />
        </Animated.View>

        <View style={styles.stationNames}>
          {stations.map((s, i) =>
            s ? (
              <React.Fragment key={s.id}>
                <View
                  style={[
                    styles.circle,
                    (arrived && i === stations.length - 2) || getIsPass(s)
                      ? styles.arrivedCircle
                      : undefined,
                    this.getCustomDotStyle(i, stations, arrived, getIsPass(s)),
                  ]}
                />
                <View
                  style={[
                    styles.stationNameContainer,
                    this.getCustomStationNameStyle(i),
                  ]}
                >
                  {numberingInfo[i] ? (
                    <View
                      style={[
                        (numberingInfo[i] as NumberingInfo).lineMarkShape
                          .signShape === MARK_SHAPE.SQUARE
                          ? styles.numberingSquareIconContainer
                          : styles.numberingIconContainer,
                        getIsPass(s) ? styles.halfOpacity : null,
                      ]}
                    >
                      <NumberingIcon
                        shape={
                          numberingInfo[i]?.lineMarkShape?.signShape ??
                          MARK_SHAPE.NOOP
                        }
                        lineColor={numberingInfo[i]?.lineColor ?? '#000'}
                        stationNumber={numberingInfo[i]?.stationNumber ?? ''}
                        allowScaling={false}
                      />
                    </View>
                  ) : (
                    <View style={styles.numberingIconPlaceholder} />
                  )}

                  <Typography
                    style={[
                      styles.stationName,
                      getIsPass(s) ? styles.halfOpacity : null,
                    ]}
                  >
                    {isEn ? s.nameRoman : s.name}
                  </Typography>
                </View>
              </React.Fragment>
            ) : null
          )}
        </View>
      </>
    );
  }
}

export default PadArch;
