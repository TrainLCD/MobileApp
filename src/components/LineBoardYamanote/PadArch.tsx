import React, { useCallback } from 'react';
import { StyleSheet, Dimensions, View, Text, Animated } from 'react-native';
import { Surface, Shape, Path } from '@react-native-community/art';
import { Line, Station } from '../../models/StationAPI';
import ChevronYamanote from '../ChevronYamanote';
import {
  YAMANOTE_CHEVRON_SCALE_DURATION,
  YAMANOTE_CHEVRON_MOVE_DURATION,
  MANY_LINES_THRESHOLD,
} from '../../constants';
import { getLineMark } from '../../lineMark';
import TransferLineMark from '../TransferLineMark';
import TransferLineDot from '../TransferLineDot';
import { isJapanese, translate } from '../../translation';
import omitJRLinesIfThresholdExceeded from '../../utils/jr';
import { filterWithoutCurrentLine } from '../../utils/line';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

type Props = {
  line: Line;
  stations: Station[];
  fillHeight: number;
  arrived: boolean;
};

type State = {
  bgScale: Animated.Value;
  chevronBottom: Animated.Value;
  chevronOpacity: Animated.Value;
};

const styles = StyleSheet.create({
  stationNames: {
    position: 'absolute',
  },
  stationName: {
    position: 'absolute',
    fontSize: 32,
    fontWeight: 'bold',
    width: windowWidth / 2,
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
});

type TransfersProps = {
  lines: Line[] | undefined;
  station: Station;
};

const Transfers: React.FC<TransfersProps> = ({
  lines,
  station,
}: TransfersProps) => {
  const renderTransferLines = useCallback(
    (): JSX.Element[] =>
      lines.map((line) => {
        const lineMark = getLineMark(line);
        return (
          <View style={styles.transferLine} key={line.id}>
            {lineMark ? (
              <TransferLineMark line={line} mark={lineMark} />
            ) : (
              <TransferLineDot line={line} />
            )}
            <Text style={styles.lineName}>
              {isJapanese ? line.name : line.nameR}
            </Text>
          </View>
        );
      }),
    [lines]
  );

  if (!lines || !lines?.length) {
    return null;
  }

  return (
    <>
      {isJapanese ? (
        <View
          style={
            lines?.length > MANY_LINES_THRESHOLD
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
            lines?.length > MANY_LINES_THRESHOLD
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
    this.state = {
      bgScale,
      chevronBottom,
      chevronOpacity,
    };
  }

  componentDidMount(): void {
    this.animated();
  }

  componentDidUpdate(prevProps: Props): void {
    const { arrived } = this.props;
    if (arrived !== prevProps.arrived) {
      this.animated();
    }
  }

  componentWillUnmount(): void {
    this.animated = (): void => undefined;
  }

  animated = (): void => {
    const { bgScale, chevronBottom, chevronOpacity } = this.state;

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
    top: !i ? windowHeight / 30 : (i * windowHeight) / 7,
  });

  render(): React.ReactElement {
    const { arrived, line, stations, fillHeight } = this.props;
    const AnimatedChevron = Animated.createAnimatedComponent(ChevronYamanote);
    const { bgScale, chevronBottom, chevronOpacity } = this.state;
    const filledStations = new Array(arrived ? 6 : 7)
      .fill(null)
      .map((_, i) => {
        if (!arrived && i === 1) {
          return undefined;
        }
        return stations[stations.length - i];
      })
      .reverse();

    const transferStation = arrived
      ? stations[stations.length - 1]
      : stations[stations.length - 2];
    const omittedTransferLines =
      transferStation &&
      omitJRLinesIfThresholdExceeded(
        filterWithoutCurrentLine(
          stations,
          line,
          arrived ? stations.length - 1 : stations.length - 2
        )
      );

    return (
      <>
        <Transfers lines={omittedTransferLines} station={transferStation} />
        <Surface width={windowWidth} height={windowHeight}>
          <Shape
            d={new Path()
              .moveTo(-4, -60)
              .arc(windowWidth / 1.5, windowHeight, 0, 0)}
            stroke="#333"
            strokeWidth={128}
          />
          <Shape
            d={new Path()
              .moveTo(0, -64)
              .arc(windowWidth / 1.5, windowHeight, 0, 0)}
            stroke="#505a6e"
            strokeWidth={128}
          />
        </Surface>
        <View style={{ ...styles.clipViewStyle, height: fillHeight }}>
          <Surface
            style={styles.animatedSurface}
            width={windowWidth}
            height={windowHeight}
          >
            <Shape
              d={new Path()
                .moveTo(0, -64)
                .arc(windowWidth / 1.5, windowHeight, 0, 0)}
              stroke={`#${line.lineColorC}`}
              strokeWidth={128}
            />
          </Surface>
        </View>
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
          {filledStations.map(
            (s, i) =>
              s && (
                <React.Fragment key={s.id}>
                  <View
                    style={[
                      styles.circle,
                      arrived && i === filledStations.length - 2
                        ? styles.arrivedCircle
                        : undefined,
                      s.pass
                        ? { backgroundColor: '#aaa' }
                        : { backgroundColor: 'white' },
                      this.getCustomDotStyle(i),
                    ]}
                  />
                  <Text
                    style={[
                      styles.stationName,
                      this.getCustomStationNameStyle(i),
                    ]}
                  >
                    {isJapanese ? s.name : s.nameR}
                  </Text>
                </React.Fragment>
              )
          )}
        </View>
      </>
    );
  }
}

export default PadArch;
