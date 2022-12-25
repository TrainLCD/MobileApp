import React, { useCallback } from 'react';
import {
  Animated,
  AppStateStatus,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  MANY_LINES_THRESHOLD,
  YAMANOTE_CHEVRON_MOVE_DURATION,
  YAMANOTE_CHEVRON_SCALE_DURATION,
  YAMANOTE_LINE_BOARD_FILL_DURATION,
} from '../constants';
import { parenthesisRegexp } from '../constants/regexp';
import { LineMark } from '../lineMark';
import { Line, Station } from '../models/StationAPI';
import { isJapanese, translate } from '../translation';
import getLineMarks from '../utils/getLineMarks';
import getIsPass from '../utils/isPass';
import omitJRLinesIfThresholdExceeded from '../utils/jr';
import ChevronYamanote from './ChevronYamanote';
import NumberingIcon from './NumberingIcon';
import TransferLineDot from './TransferLineDot';
import TransferLineMark from './TransferLineMark';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

type NumberingInfo = {
  stationNubmer: string;
  lineMarkShape: LineMark;
  lineColor: string;
};

type Props = {
  line: Line;
  stations: Station[];
  arrived: boolean;
  appState: AppStateStatus;
  transferLines: Line[];
  nextStation: Station | null;
  numberingInfo: (NumberingInfo | null)[];
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
    flexWrap: 'wrap',
    flexDirection: 'row',
  },
  stationName: {
    fontSize: 32,
    fontWeight: 'bold',
    position: 'absolute',
    left: 48,
    width: windowWidth / 4,
  },
  circle: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  arrivedCircle: {
    width: 21,
    height: 21,
    marginLeft: 28,
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
  grayColor: {
    color: '#ccc',
  },
  numberingIconContainer: {
    position: 'absolute',
    transform: [{ scale: 0.5 }],
    top: -48,
    left: -32,
  },
});

type TransfersProps = {
  transferLines: Line[];
  station: Station | null;
};

const Transfers: React.FC<TransfersProps> = ({
  transferLines,
  station,
}: TransfersProps) => {
  const omittedTransferLines = omitJRLinesIfThresholdExceeded(transferLines);
  const lineMarks = getLineMarks({
    transferLines,
    omittedTransferLines,
  });

  const renderTransferLines = useCallback(
    (): JSX.Element[] =>
      lineMarks.map((lineMark, i) => {
        const line = omittedTransferLines[i];
        return (
          <View style={styles.transferLine} key={line.id}>
            {lineMark ? (
              <TransferLineMark line={line} mark={lineMark} size="tiny" />
            ) : (
              <TransferLineDot line={line} small />
            )}
            <Text style={styles.lineName}>
              {isJapanese
                ? line.name.replace(parenthesisRegexp, '')
                : line.nameR.replace(parenthesisRegexp, '')}
            </Text>
          </View>
        );
      }),
    [lineMarks, omittedTransferLines]
  );

  if (!transferLines?.length) {
    return null;
  }

  return (
    <>
      {isJapanese ? (
        <View
          style={
            transferLines?.length > MANY_LINES_THRESHOLD
              ? styles.transfersMany
              : styles.transfers
          }
        >
          <Text style={styles.transfersCurrentStationName}>
            {station?.name}
            {translate('station')}
          </Text>
          <Text style={styles.transferAtText}>
            {translate('transferAtYamanote')}
          </Text>
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
          <Text style={styles.transferAtTextEn}>
            {translate('transferAtYamanote')}
          </Text>
          <Text style={styles.transfersCurrentStationNameEn}>
            {`${station?.nameR} ${translate('station')}`}
          </Text>
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
    const { arrived, appState } = this.props;

    // バックグラウンド移行時無駄な処理をしないようにする
    if (appState === 'background') {
      return;
    }

    // 発車ごとにアニメーションをかける
    if (arrived !== prevProps.arrived) {
      this.animated();
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
      toValue: windowHeight,
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
        return windowWidth / 2.1;
      case 1:
        return windowWidth / 1.8;
      case 2:
        return windowWidth / 1.6;
      case 3:
        return windowWidth / 1.5;
      case 4:
        return windowWidth / 1.4;
      default:
        return 0;
    }
  };

  getCustomDotStyle = (i: number): { left: number; top: number } => ({
    left: this.getDotLeft(i),
    top: !i ? windowHeight / 30 : (i * windowHeight) / 7,
  });

  getCustomStationNameStyle = (i: number): { left: number; top: number } => ({
    left: this.getStationNameLeft(i),
    top: !i ? windowHeight / 30 : (i * windowHeight) / 7.25,
  });

  render(): React.ReactElement {
    const {
      arrived,
      line,
      stations,
      transferLines,
      nextStation,
      numberingInfo,
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
    const hexLineColor = `#${line.lineColorC}`;

    const transferStation =
      arrived && !getIsPass(stations[stations.length - 1])
        ? stations[stations.length - 1]
        : nextStation;

    return (
      <>
        <Transfers transferLines={transferLines} station={transferStation} />
        <Svg width={windowWidth} height={windowHeight}>
          <Path d={pathD1} stroke="#333" strokeWidth={128} />
          <Path d={pathD2} stroke="#505a6e" strokeWidth={128} />
        </Svg>

        <Animated.View style={{ ...styles.clipViewStyle, height: fillHeight }}>
          <Svg
            style={styles.animatedSurface}
            width={windowWidth}
            height={windowHeight}
          >
            <Path d={pathD3} stroke={hexLineColor} strokeWidth={128} />
          </Svg>
        </Animated.View>
        <Animated.View
          style={[
            arrived ? {} : { bottom: chevronBottom, opacity: chevronOpacity },
            styles.chevron,
            arrived ? styles.chevronArrived : undefined,
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
                    arrived && i === stations.length - 2
                      ? styles.arrivedCircle
                      : undefined,
                    getIsPass(s)
                      ? { backgroundColor: '#ccc' }
                      : { backgroundColor: 'white' },
                    this.getCustomDotStyle(i),
                  ]}
                />
                <View
                  style={[
                    styles.stationNameContainer,
                    this.getCustomStationNameStyle(i),
                  ]}
                >
                  {numberingInfo[i] && (
                    <View style={styles.numberingIconContainer}>
                      <NumberingIcon
                        shape={
                          (numberingInfo[i] as NumberingInfo).lineMarkShape
                            .signShape
                        }
                        lineColor={
                          (numberingInfo[i] as NumberingInfo).lineColor
                        }
                        stationNumber={
                          (numberingInfo[i] as NumberingInfo).stationNubmer
                        }
                      />
                    </View>
                  )}

                  <Text
                    style={[
                      styles.stationName,
                      getIsPass(s) ? styles.grayColor : null,
                    ]}
                  >
                    {isJapanese ? s.name : s.nameR}
                  </Text>
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
