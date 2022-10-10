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
import useConnectedLines from '../hooks/useConnectedLines';
import useNumbering from '../hooks/useNumbering';
import useValueRef from '../hooks/useValueRef';
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
  isMeijoLine,
  isOsakaLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../utils/loopLine';
import { getNumberingColor } from '../utils/numbering';
import CommonHeaderProps from './CommonHeaderProps';
import NumberingIcon from './NumberingIcon';
import TrainTypeBox from './TrainTypeBox';
import VisitorsPanel from './VisitorsPanel';

const styles = StyleSheet.create({
  gradientRoot: {
    paddingTop: 14,
    paddingRight: 21,
    paddingLeft: 21,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 1,
    shadowRadius: 1,
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
    color: '#fff',
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
    color: '#fff',
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
    color: '#fff',
  },
  divider: {
    width: '100%',
    alignSelf: 'stretch',
    height: isTablet ? 4 : 2,
    backgroundColor: 'crimson',
    marginTop: 2,
    shadowColor: '#ccc',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowRadius: 0,
    shadowOpacity: 1,
    elevation: 2,
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberingContainer: {
    position: 'absolute',
    left: '18%',
    bottom: 4,
  },
});

const { width: windowWidth } = Dimensions.get('window');

const HeaderTY: React.FC<CommonHeaderProps> = ({
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
  const osakaLoopLine =
    line && !trainType ? isOsakaLoopLine(line.id) : undefined;

  const { top: safeAreaTop } = useSafeAreaInsets();

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
      if (headerState !== 'CURRENT_KANA' && headerState !== 'ARRIVING_KANA') {
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

  const headerLangState = headerState.split('_')[1] as HeaderLangState;

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

  const boundPrefix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return 'for ';
      case 'ZH':
        return '开往 ';
      default:
        return '';
    }
  }, [headerLangState]);
  const boundSuffix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return '';
      case 'ZH':
        return '';
      case 'KO':
        return ' 행';
      default:
        return getIsLoopLine(line, typedTrainType) ? '方面' : 'ゆき';
    }
  }, [headerLangState, line, typedTrainType]);

  const meijoLineBoundText = useMemo(() => {
    if (selectedDirection === 'INBOUND') {
      switch (headerLangState) {
        case 'EN':
          return 'Meijo Line Clockwise';
        case 'ZH':
          return '名城线 右环';
        case 'KO':
          return '메이조선 우회전';
        default:
          return '名城線 右回り';
      }
    }
    switch (headerLangState) {
      case 'EN':
        return 'Meijo Line Counterclockwise';
      case 'ZH':
        return '名城线 左环';
      case 'KO':
        return '메이조선 좌회전';
      default:
        return '名城線 左回り';
    }
  }, [headerLangState, selectedDirection]);

  const boundStationName = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return selectedBound?.nameR;
      case 'ZH':
        return selectedBound?.nameZh;
      case 'KO':
        return selectedBound?.nameKo;
      default:
        return selectedBound?.name;
    }
  }, [
    headerLangState,
    selectedBound?.name,
    selectedBound?.nameKo,
    selectedBound?.nameR,
    selectedBound?.nameZh,
  ]);

  useEffect(() => {
    if (!line || !selectedBound) {
      setBoundText('TrainLCD');
    } else if (isMeijoLine(line.id)) {
      setBoundText(meijoLineBoundText);
    } else if ((yamanoteLine || osakaLoopLine) && !trainType) {
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
    } else if (boundStationName) {
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
    boundPrefix,
    boundStationName,
    boundSuffix,
    fadeIn,
    fadeOut,
    headerLangState,
    headerState,
    isLast,
    line,
    meijoLineBoundText,
    nextStation,
    osakaLoopLine,
    selectedBound,
    selectedDirection,
    station,
    stations,
    trainType,
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

  const [currentStationNumber, threeLetterCode, lineMarkShape] = useNumbering();
  const lineColor = useMemo(() => line && `#${line.lineColorC}`, [line]);
  const numberingColor = useMemo(
    () => getNumberingColor(arrived, currentStationNumber, nextStation, line),
    [arrived, currentStationNumber, line, nextStation]
  );

  return (
    <View>
      <LinearGradient
        colors={['#333', '#212121', '#000']}
        locations={[0, 0.5, 0.5]}
        style={styles.gradientRoot}
      >
        <VisitorsPanel />
        <View
          style={{
            ...styles.headerTexts,
            marginTop: Platform.OS === 'ios' ? safeAreaTop : 0,
          }}
        >
          <TrainTypeBox
            isTY
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
            <View style={styles.numberingContainer}>
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
      </LinearGradient>
      <View style={styles.divider} />
    </View>
  );
};

export default HeaderTY;
