import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import useValueRef from '../hooks/useValueRef';
import {
  HeaderLangState,
  HeaderTransitionState,
} from '../models/HeaderTransitionState';
import { APITrainType } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
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
import CommonHeaderProps from './CommonHeaderProps';
import TrainTypeBox from './TrainTypeBox';
import VisitorsPanel from './VisitorsPanel';

const styles = StyleSheet.create({
  gradientRoot: {
    paddingTop: 14,
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
  },
  divider: {
    width: '100%',
    alignSelf: 'stretch',
    height: isTablet ? 10 : 4,
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const { width: windowWidth } = Dimensions.get('window');

const HeaderTokyoMetro: React.FC<CommonHeaderProps> = ({
  station,
  nextStation,
  boundStation,
  line,
  state,
  lineDirection,
  stations,
  connectedNextLines,
  isLast,
}: CommonHeaderProps) => {
  const [prevState, setPrevState] = useState<HeaderTransitionState>(
    isJapanese ? 'CURRENT' : 'CURRENT_EN'
  );
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
  const { headerState, trainType } = useRecoilValue(navigationState);

  const typedTrainType = trainType as APITrainType;

  const connectionText = useMemo(
    () =>
      connectedNextLines
        ?.map((l) => l.name)
        .slice(0, 2)
        .join('・'),
    [connectedNextLines]
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

  const { top: safeAreaTop } = useSafeAreaInsets();

  const adjustScale = useCallback((stationName: string, en?: boolean): void => {
    setStationNameScale(getStationNameScale(stationName, en));
  }, []);

  const prevStateIsDifferent = prevStateText !== stateText;
  const prevBoundIsDifferent = prevBoundText !== boundText;

  const fadeIn = useCallback((): void => {
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
    if (prevStateIsDifferent) {
      timing(stateOpacityAnim, {
        toValue: 0,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: EasingNode.linear,
      }).start();
    }
    if (prevBoundIsDifferent) {
      timing(boundOpacityAnim, {
        toValue: 0,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: EasingNode.linear,
      }).start();
    }
  }, [
    bottomNameScaleYAnim,
    boundOpacityAnim,
    prevBoundIsDifferent,
    prevStateIsDifferent,
    topNameScaleYAnim,
    stateOpacityAnim,
    nameFadeAnim,
  ]);

  const fadeOut = useCallback((): void => {
    nameFadeAnim.setValue(0);
    topNameScaleYAnim.setValue(1);
    stateOpacityAnim.setValue(1);
    boundOpacityAnim.setValue(1);
    bottomNameScaleYAnim.setValue(0);
  }, [
    bottomNameScaleYAnim,
    boundOpacityAnim,
    topNameScaleYAnim,
    stateOpacityAnim,
    nameFadeAnim,
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
          return getIsLoopLine(line, typedTrainType) ? '方面' : 'ゆき';
      }
    })();

    if (!line || !boundStation) {
      setBoundText('TrainLCD');
    } else if (yamanoteLine || osakaLoopLine) {
      const currentIndex = getCurrentStationIndex(stations, station);
      setBoundText(
        `${boundPrefix} ${
          lineDirection === 'INBOUND'
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
            return boundStation.nameR;
          case 'ZH':
            return boundStation.nameZh;
          case 'KO':
            return boundStation.nameKo;
          default:
            return boundStation.name;
        }
      })();

      setBoundText(`${boundPrefix}${boundStationName}${boundSuffix}`);
    }

    switch (state) {
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
          adjustScale(katakanaToHiragana(nextStation.nameK));
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
        if (prevState !== 'CURRENT') {
          fadeOut();
        }
        setStateText(translate('nowStoppingAt'));
        setStationText(station.name);
        adjustScale(station.name);
        fadeIn();
        break;
      case 'CURRENT_KANA':
        if (prevState !== 'CURRENT_KANA') {
          fadeOut();
        }
        setStateText(translate('nowStoppingAt'));
        setStationText(katakanaToHiragana(station.nameK));
        adjustScale(katakanaToHiragana(station.nameK));
        fadeIn();
        break;
      case 'CURRENT_EN':
        if (prevState !== 'CURRENT_EN') {
          fadeOut();
        }
        setStateText('');
        setStationText(station.nameR);
        adjustScale(station.nameR, true);
        fadeIn();
        break;
      case 'CURRENT_ZH':
        if (!station.nameZh) {
          break;
        }

        if (prevState !== 'CURRENT_ZH') {
          fadeOut();
        }
        setStateText('');
        setStationText(station.nameZh);
        adjustScale(station.nameZh);
        fadeIn();
        break;
      case 'CURRENT_KO':
        if (!station.nameKo) {
          break;
        }

        if (prevState !== 'CURRENT_KO') {
          fadeOut();
        }
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
          adjustScale(katakanaToHiragana(nextStation.nameK));
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

    setPrevState(state);
  }, [
    adjustScale,
    boundStation,
    fadeIn,
    fadeOut,
    headerLangState,
    headerState,
    isLast,
    line,
    lineDirection,
    nextStation,
    osakaLoopLine,
    prevState,
    state,
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
        width: stateText === '' ? windowWidth : windowWidth * 0.8,
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

  return (
    <View>
      <LinearGradient
        colors={['#eee', '#eee', '#dedede', '#eee', '#eee']}
        locations={[0, 0.45, 0.5, 0.6, 0.6]}
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
            trainType={
              currentTrainType ?? getTrainType(line, station, lineDirection)
            }
          />
          <View style={styles.boundWrapper}>
            <Animated.Text style={[boundTopAnimatedStyles, styles.bound]}>
              <Text style={styles.connectedLines}>
                {connectedNextLines?.length && isJapaneseState
                  ? `${connectionText}直通 `
                  : null}
              </Text>
              <Text>{boundText}</Text>
            </Animated.Text>
            {boundStation && (
              <Animated.Text style={[boundBottomAnimatedStyles, styles.bound]}>
                <Text style={styles.connectedLines}>
                  {connectedNextLines?.length && isJapaneseState
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
            {boundStation && (
              <Animated.Text style={[stateBottomAnimatedStyles, styles.state]}>
                {prevStateText}
              </Animated.Text>
            )}
          </View>

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
                {boundStation &&
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
      <LinearGradient
        colors={
          line
            ? [`#${line.lineColorC}aa`, `#${line.lineColorC}ff`]
            : ['#b5b5ac', '#b5b5ac']
        }
        style={styles.divider}
      />
    </View>
  );
};

export default HeaderTokyoMetro;
