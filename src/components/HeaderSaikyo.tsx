import { LinearGradient } from 'expo-linear-gradient';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { withAnchorPoint } from 'react-native-anchor-point';
import Animated, {
  EasingNode,
  sub,
  timing,
  useValue,
} from 'react-native-reanimated';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoilValue } from 'recoil';
import {
  HEADER_CONTENT_TRANSITION_DELAY,
  STATION_NAME_FONT_SIZE,
} from '../constants';
import { MarkShape } from '../constants/numbering';
import useConnectedLines from '../hooks/useConnectedLines';
import useNumbering from '../hooks/useNumbering';
import useValueRef from '../hooks/useValueRef';
import { getLineMark } from '../lineMark';
import { HeaderLangState } from '../models/HeaderTransitionState';
import { APITrainType } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import getCurrentStationIndex from '../utils/currentStationIndex';
import getStationNameScale from '../utils/getStationNameScale';
import getTrainType from '../utils/getTrainType';
import isTablet from '../utils/isTablet';
import katakanaToHiragana from '../utils/kanaToHiragana';
import {
  getIsLoopLine,
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../utils/loopLine';
import { getNumberingColor } from '../utils/numbering';
import Clock from './Clock';
import CommonHeaderProps from './CommonHeaderProps';
import NumberingIcon from './NumberingIcon';
import TrainTypeBox from './TrainTypeBoxSaikyo';
import VisitorsPanel from './VisitorsPanel';

const styles = StyleSheet.create({
  gradientRoot: {
    paddingRight: 21,
    paddingLeft: 21,
    overflow: 'hidden',
  },
  bottom: {
    height: isTablet ? 128 : 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingBottom: 8,
  },
  boundWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  connectedLines: {
    fontSize: RFValue(14),
  },
  bound: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: RFValue(18),
    marginLeft: 8,
    position: 'absolute',
  },
  stateWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  state: {
    position: 'absolute',
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#3a3a3a',
    textAlign: 'right',
  },
  stationNameWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stationNameContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  stationName: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#3a3a3a',
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockOverride: {
    position: 'absolute',
    bottom: 0,
  },
  numberingContainer: {
    position: 'absolute',
    left: '18%',
  },
});

const { width: windowWidth } = Dimensions.get('window');

type HeaderBarProps = {
  lineColor: string;
  height: number;
};

const headerBarStyles = StyleSheet.create({
  root: {
    width: '100%',
    backgroundColor: 'black',
  },
  gradient: {
    flex: 1,
  },
  divider: {
    backgroundColor: 'white',
    height: 2,
  },
});

const HeaderBar: React.FC<HeaderBarProps> = ({
  lineColor,
  height,
}: HeaderBarProps) => (
  <View style={[headerBarStyles.root, { height }]}>
    <LinearGradient
      style={headerBarStyles.gradient}
      colors={[
        '#fcfcfc',
        `${lineColor}bb`,
        `${lineColor}bb`,
        `${lineColor}bb`,
        '#fcfcfc',
      ]}
      locations={[0, 0.2, 0.5, 0.8, 1]}
      start={[0, 0]}
      end={[1, 1]}
    />
  </View>
);

const HeaderSaikyo: React.FC<CommonHeaderProps> = ({
  station,
  nextStation,
  line,
  isLast,
}: CommonHeaderProps) => {
  const [stateText, setStateText] = useState('');
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const [stationNameScale, setStationNameScale] = useState(
    getStationNameScale(isJapanese ? station.name : station.nameR, !isJapanese)
  );
  const prevStationNameScale = useValueRef(stationNameScale).current;
  const prevStationName = useValueRef(stationText).current;
  const prevStateText = useValueRef(stateText).current;
  const prevBoundText = useValueRef(boundText).current;
  const { selectedBound, stations, selectedDirection, arrived } =
    useRecoilValue(stationState);
  const { headerState, trainType } = useRecoilValue(navigationState);
  const prevHeaderStateRef = useRef(headerState);

  const typedTrainType = trainType as APITrainType;

  const connectedLines = useConnectedLines();

  const connectionText = useMemo(
    () =>
      connectedLines
        ?.map((l) => l.name)
        .slice(0, 2)
        .join('・'),
    [connectedLines]
  );

  const currentTrainType = useMemo(
    () =>
      (trainType as APITrainType)?.allTrainTypes.find(
        (tt) => tt.line.id === line?.id
      ) || trainType,
    [line?.id, trainType]
  );

  const nameFadeAnim = useValue<number>(1);
  const topNameScaleYAnim = useValue<number>(0);
  const stateOpacityAnim = useValue<number>(0);
  const boundOpacityAnim = useValue<number>(0);
  const bottomNameScaleYAnim = useValue<number>(1);

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line && !trainType ? line.id === 11623 : undefined;

  const { top: safeAreaTop, right: safeAreaRight } = useSafeAreaInsets();

  const adjustScale = useCallback((stationName: string, en?: boolean): void => {
    setStationNameScale(getStationNameScale(stationName, en));
  }, []);

  const prevBoundIsDifferent = prevBoundText !== boundText;

  const fadeIn = useCallback((): void => {
    if (!selectedBound) {
      if (prevHeaderStateRef.current === headerState) {
        topNameScaleYAnim.setValue(0);
        nameFadeAnim.setValue(1);
        bottomNameScaleYAnim.setValue(1);
        stateOpacityAnim.setValue(0);
      }
      return;
    }

    if (prevHeaderStateRef.current !== headerState) {
      timing(topNameScaleYAnim, {
        toValue: 0,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: EasingNode.linear,
      }).start();
      timing(nameFadeAnim, {
        toValue: 1,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: EasingNode.linear,
      }).start();
      timing(bottomNameScaleYAnim, {
        toValue: 1,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: EasingNode.linear,
      }).start();
      if (headerState !== 'CURRENT_KANA') {
        timing(stateOpacityAnim, {
          toValue: 0,
          duration: HEADER_CONTENT_TRANSITION_DELAY,
          easing: EasingNode.linear,
        }).start();
      }
    }
    if (prevBoundIsDifferent) {
      timing(boundOpacityAnim, {
        toValue: 0,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: EasingNode.linear,
      }).start();
    }
  }, [
    selectedBound,
    headerState,
    prevBoundIsDifferent,
    topNameScaleYAnim,
    nameFadeAnim,
    bottomNameScaleYAnim,
    stateOpacityAnim,
    boundOpacityAnim,
  ]);

  const fadeOut = useCallback((): void => {
    if (!selectedBound) {
      return;
    }

    nameFadeAnim.setValue(0);
    topNameScaleYAnim.setValue(1);
    stateOpacityAnim.setValue(1);
    boundOpacityAnim.setValue(1);
    bottomNameScaleYAnim.setValue(0);
  }, [
    selectedBound,
    nameFadeAnim,
    topNameScaleYAnim,
    stateOpacityAnim,
    boundOpacityAnim,
    bottomNameScaleYAnim,
  ]);

  const headerLangState = useMemo(
    () => headerState.split('_')[1] as HeaderLangState,
    [headerState]
  );

  const isJapaneseState = useMemo(() => {
    if (!headerLangState) {
      return true;
    }

    switch (headerLangState) {
      case 'KANA':
        return true;
      default:
        return false;
    }
  }, [headerLangState]);

  useEffect(() => {
    const boundPrefix = (() => {
      switch (headerLangState) {
        case 'EN':
          return 'for ';
        case 'ZH':
          return '开往 ';
        default:
          return '';
      }
    })();
    const boundSuffix = (() => {
      switch (headerLangState) {
        case 'EN':
          return '';
        case 'ZH':
          return '';
        case 'KO':
          return ' 행';
        default:
          return getIsLoopLine(line, typedTrainType) ? ' 方面' : ' ゆき';
      }
    })();

    if (!line || !selectedBound) {
      setBoundText('TrainLCD');
    } else if (yamanoteLine || osakaLoopLine) {
      const currentIndex = getCurrentStationIndex(stations, station);
      setBoundText(
        `${boundPrefix} ${
          selectedDirection === 'INBOUND'
            ? `${
                inboundStationForLoopLine(
                  stations,
                  currentIndex,
                  line,
                  headerLangState
                )?.boundFor
              }`
            : outboundStationForLoopLine(
                stations,
                currentIndex,
                line,
                headerLangState
              )?.boundFor
        }${boundSuffix}`
      );
    } else {
      const boundStationName = (() => {
        switch (headerLangState) {
          case 'EN':
            return selectedBound.nameR;
          case 'ZH':
            return selectedBound.nameZh;
          case 'KO':
            return selectedBound.nameKo;
          default:
            return selectedBound.name;
        }
      })();

      setBoundText(`${boundPrefix}${boundStationName}${boundSuffix}`);
    }

    switch (headerState) {
      case 'ARRIVING':
        if (nextStation) {
          fadeOut();
          setStateText(translate(isLast ? 'soonLast' : 'soon'));
          setStationText(nextStation.name);
          adjustScale(nextStation.name);
          fadeIn();
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          fadeOut();
          setStateText(translate(isLast ? 'soonKanaLast' : 'soon'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustScale(nextStation.nameK);
          fadeIn();
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          fadeOut();
          setStateText(translate(isLast ? 'soonEnLast' : 'soonEn'));
          setStationText(nextStation.nameR);
          adjustScale(nextStation.nameR, true);
          fadeIn();
        }
        break;
      case 'ARRIVING_ZH':
        if (nextStation?.nameZh) {
          fadeOut();
          setStateText(translate(isLast ? 'soonZhLast' : 'soonZh'));
          setStationText(nextStation.nameZh);
          adjustScale(nextStation.nameZh);
          fadeIn();
        }
        break;
      case 'ARRIVING_KO':
        if (nextStation?.nameKo) {
          fadeOut();
          setStateText(translate(isLast ? 'soonKoLast' : 'soonKo'));
          setStationText(nextStation.nameKo);
          adjustScale(nextStation.nameKo);
          fadeIn();
        }
        break;
      case 'CURRENT':
        fadeOut();
        setStateText(translate('nowStoppingAt'));
        setStationText(station.name);
        adjustScale(station.name);
        fadeIn();
        break;
      case 'CURRENT_KANA':
        fadeOut();
        setStateText(translate('nowStoppingAt'));
        setStationText(katakanaToHiragana(station.nameK));
        adjustScale(station.nameK);
        fadeIn();
        break;
      case 'CURRENT_EN':
        fadeOut();
        setStateText('');
        setStationText(station.nameR);
        adjustScale(station.nameR, true);
        fadeIn();
        break;
      case 'CURRENT_ZH':
        if (!station.nameZh) {
          break;
        }
        fadeOut();
        setStateText('');
        setStationText(station.nameZh);
        adjustScale(station.nameZh);
        fadeIn();
        break;
      case 'CURRENT_KO':
        if (!station.nameKo) {
          break;
        }
        fadeOut();
        setStateText('');
        setStationText(station.nameKo);
        adjustScale(station.nameKo);
        fadeIn();
        break;
      case 'NEXT':
        if (nextStation) {
          fadeOut();
          setStateText(translate(isLast ? 'nextLast' : 'next'));
          setStationText(nextStation.name);
          adjustScale(nextStation.name);
          fadeIn();
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          fadeOut();
          setStateText(translate(isLast ? 'nextKanaLast' : 'nextKana'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustScale(nextStation.nameK);
          fadeIn();
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          fadeOut();
          setStateText(translate(isLast ? 'nextEnLast' : 'nextEn'));
          setStationText(nextStation.nameR);
          adjustScale(nextStation.nameR, true);
          fadeIn();
        }
        break;
      case 'NEXT_ZH':
        if (nextStation?.nameZh) {
          fadeOut();
          setStateText(translate(isLast ? 'nextZhLast' : 'nextZh'));
          setStationText(nextStation.nameZh);
          adjustScale(nextStation.nameZh);
          fadeIn();
        }
        break;
      case 'NEXT_KO':
        if (nextStation?.nameKo) {
          fadeOut();
          setStateText(translate(isLast ? 'nextKoLast' : 'nextKo'));
          setStationText(nextStation.nameKo);
          adjustScale(nextStation.nameKo);
          fadeIn();
        }
        break;
      default:
        break;
    }

    if (prevHeaderStateRef.current !== headerState) {
      prevHeaderStateRef.current = headerState;
    }
  }, [
    adjustScale,
    fadeIn,
    fadeOut,
    headerLangState,
    headerState,
    isLast,
    line,
    nextStation,
    osakaLoopLine,
    selectedBound,
    selectedDirection,
    station,
    stations,
    typedTrainType,
    yamanoteLine,
  ]);

  const stateTopAnimatedStyles = {
    opacity: sub(1, stateOpacityAnim),
  };

  const stateBottomAnimatedStyles = {
    opacity: stateOpacityAnim,
  };

  const getTopNameAnimatedStyles = () => {
    const transform = {
      transform: [
        {
          scaleY: topNameScaleYAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }) as unknown as number,
        },
      ],
    };

    return withAnchorPoint(
      transform,
      { x: 0, y: 0 },
      {
        width: windowWidth,
        height: STATION_NAME_FONT_SIZE,
      }
    );
  };
  const getBottomNameAnimatedStyles = () => {
    const transform = {
      transform: [
        {
          scaleY: topNameScaleYAnim as unknown as number,
        },
      ],
    };
    return withAnchorPoint(
      transform,
      { x: 0, y: 1 },
      {
        width: stateText === '' ? windowWidth : windowWidth * 0.8,
        height: STATION_NAME_FONT_SIZE,
      }
    );
  };

  const boundTopAnimatedStyles = {
    opacity: sub(1, boundOpacityAnim),
  };

  const boundBottomAnimatedStyles = {
    opacity: boundOpacityAnim,
  };

  const lineMarkShape = useMemo(() => {
    if (headerState.split('_')[0] !== 'CURRENT' && nextStation?.currentLine) {
      return getLineMark(nextStation.currentLine)?.shape;
    }

    return line && getLineMark(line)?.shape;
  }, [headerState, line, nextStation?.currentLine]);

  const [currentStationNumber, threeLetterCode] = useNumbering();
  const lineColor = useMemo(() => line && `#${line.lineColorC}`, [line]);
  const numberingColor = useMemo(
    () => getNumberingColor(arrived, currentStationNumber, nextStation, line),
    [arrived, currentStationNumber, line, nextStation]
  );

  return (
    <View>
      <VisitorsPanel />
      <HeaderBar height={15} lineColor={lineColor || '#00ac9a'} />
      <View style={{ backgroundColor: 'white', height: 2, opacity: 0.5 }} />
      <LinearGradient
        colors={['#aaa', '#fcfcfc']}
        locations={[0, 0.2]}
        style={styles.gradientRoot}
      >
        <View
          style={{
            ...styles.headerTexts,
            marginTop: Platform.OS === 'ios' ? safeAreaTop : 0,
          }}
        >
          <TrainTypeBox
            lineColor={lineColor || '#00ac9a'}
            trainType={
              currentTrainType ?? getTrainType(line, station, selectedDirection)
            }
          />
          <View style={styles.boundWrapper}>
            <Animated.Text style={[boundTopAnimatedStyles, styles.bound]}>
              <Text style={styles.connectedLines}>
                {connectedLines?.length && isJapaneseState
                  ? `${connectionText}直通 `
                  : null}
              </Text>
              <Text>{boundText}</Text>
            </Animated.Text>
            {selectedBound && (
              <Animated.Text style={[boundBottomAnimatedStyles, styles.bound]}>
                <Text style={styles.connectedLines}>
                  {connectedLines?.length && isJapaneseState
                    ? `${connectionText}直通 `
                    : null}
                </Text>
                <Text>{prevBoundText}</Text>
              </Animated.Text>
            )}
          </View>
        </View>
        <View style={styles.bottom}>
          <View style={styles.stateWrapper}>
            <Animated.Text style={[stateTopAnimatedStyles, styles.state]}>
              {stateText}
            </Animated.Text>
            {selectedBound && (
              <Animated.Text style={[stateBottomAnimatedStyles, styles.state]}>
                {prevStateText}
              </Animated.Text>
            )}
          </View>

          {lineMarkShape !== null &&
          lineMarkShape !== undefined &&
          lineColor &&
          currentStationNumber ? (
            <View
              style={[
                styles.numberingContainer,
                { bottom: lineMarkShape === MarkShape.round ? -4 : 4 },
              ]}
            >
              <NumberingIcon
                shape={lineMarkShape}
                lineColor={numberingColor}
                stationNumber={currentStationNumber.stationNumber}
                threeLetterCode={threeLetterCode}
              />
            </View>
          ) : null}

          <View>
            <View
              style={[styles.stationNameWrapper, { width: windowWidth * 0.8 }]}
            >
              <View
                style={{
                  ...styles.stationNameContainer,
                  transform: [{ scaleX: stationNameScale }],
                }}
              >
                {stationText.split('').map((c, i) => (
                  <Animated.Text
                    key={i.toString()}
                    style={[
                      getTopNameAnimatedStyles(),
                      styles.stationName,
                      {
                        opacity: nameFadeAnim,
                        minHeight: STATION_NAME_FONT_SIZE,
                        fontSize: STATION_NAME_FONT_SIZE,
                      },
                    ]}
                  >
                    {c}
                  </Animated.Text>
                ))}
              </View>

              <View
                style={{
                  ...styles.stationNameContainer,
                  transform: [{ scaleX: prevStationNameScale }],
                }}
              >
                {selectedBound &&
                  prevStationName.split('').map((c, i) => (
                    <Animated.Text
                      key={i.toString()}
                      style={[
                        styles.stationName,
                        getBottomNameAnimatedStyles(),
                        {
                          opacity: nameFadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 0],
                          }),
                          fontSize: STATION_NAME_FONT_SIZE,
                        },
                      ]}
                    >
                      {c}
                    </Animated.Text>
                  ))}
              </View>
            </View>
          </View>
        </View>
        <Clock
          bold
          style={{ ...styles.clockOverride, right: 8 + safeAreaRight }}
        />
      </LinearGradient>
      <HeaderBar height={5} lineColor={lineColor || '#00ac9a'} />
    </View>
  );
};

export default HeaderSaikyo;
