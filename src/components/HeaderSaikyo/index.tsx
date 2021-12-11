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
import { HEADER_CONTENT_TRANSITION_DELAY } from '../../constants';
import useValueRef from '../../hooks/useValueRef';
import {
  HeaderLangState,
  HeaderTransitionState,
} from '../../models/HeaderTransitionState';
import { APITrainType } from '../../models/StationAPI';
import navigationState from '../../store/atoms/navigation';
import { isJapanese, translate } from '../../translation';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import getTrainType from '../../utils/getTrainType';
import isTablet from '../../utils/isTablet';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import {
  getIsLoopLine,
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../../utils/loopLine';
import { CommonHeaderProps } from '../Header/common';
import TrainTypeBox from '../TrainTypeBoxSaikyo';

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
    textAlign: 'center',
  },
  stationNameWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  stationName: {
    flex: 1,
    position: 'absolute',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#3a3a3a',
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
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
  boundStation,
  line,
  state,
  lineDirection,
  stations,
  connectedNextLines,
}: CommonHeaderProps) => {
  const [prevState, setPrevState] = useState<HeaderTransitionState>(
    isJapanese ? 'CURRENT' : 'CURRENT_EN'
  );
  const [stateText, setStateText] = useState('');
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const getFontSize = useCallback((stationName: string): number => {
    if (stationName.length >= 15) {
      return 24;
    }
    return 35;
  }, []);
  const [stationNameFontSize, setStationNameFontSize] = useState(
    getFontSize(isJapanese ? station.name : station.nameR)
  );
  const prevStationNameFontSize = useValueRef(stationNameFontSize).current;
  const prevStationName = useValueRef(stationText).current;
  const prevStateText = useValueRef(stateText).current;
  const prevBoundText = useValueRef(boundText).current;
  const { headerState, trainType } = useRecoilValue(navigationState);

  const connectionText = useMemo(
    () =>
      connectedNextLines
        ?.map((l) => l.name)
        .slice(0, 2)
        .join('・'),
    [connectedNextLines]
  );

  const typedTrainType = trainType as APITrainType;

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

  const adjustFontSize = useCallback(
    (stationName: string, en?: boolean): void => {
      if (!en) {
        setStationNameFontSize(getFontSize(stationName));
      }
    },
    [getFontSize]
  );

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
      setBoundText(`for ${boundStation.nameR}`);
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
          setStateText(translate('soon'));
          setStationText(nextStation.name);
          adjustFontSize(nextStation.name);
          fadeIn();
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          fadeOut();
          setStateText(translate('soon'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustFontSize(katakanaToHiragana(nextStation.nameK));
          fadeIn();
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          fadeOut();
          setStateText(translate('soonEn'));
          setStationText(nextStation.nameR);
          adjustFontSize(nextStation.nameR, true);
          fadeIn();
        }
        break;
      case 'ARRIVING_ZH':
        if (nextStation?.nameZh) {
          fadeOut();
          setStateText(translate('soonZh'));
          setStationText(nextStation.nameZh);
          adjustFontSize(nextStation.nameZh);
          fadeIn();
        }
        break;
      case 'ARRIVING_KO':
        if (nextStation?.nameKo) {
          fadeOut();
          setStateText(translate('soonKo'));
          setStationText(nextStation.nameKo);
          adjustFontSize(nextStation.nameKo);
          fadeIn();
        }
        break;
      case 'CURRENT':
        if (prevState !== 'CURRENT') {
          fadeOut();
        }
        setStateText(translate('nowStoppingAt'));
        setStationText(station.name);
        adjustFontSize(station.name);
        fadeIn();
        break;
      case 'CURRENT_KANA':
        if (prevState !== 'CURRENT_KANA') {
          fadeOut();
        }
        setStateText(translate('nowStoppingAt'));
        setStationText(katakanaToHiragana(station.nameK));
        adjustFontSize(katakanaToHiragana(station.nameK));
        fadeIn();
        break;
      case 'CURRENT_EN':
        if (prevState !== 'CURRENT_EN') {
          fadeOut();
        }
        setStateText('');
        setStationText(station.nameR);
        adjustFontSize(station.nameR, true);
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
        adjustFontSize(station.nameZh);
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
        adjustFontSize(station.nameKo);
        fadeIn();
        break;
      case 'NEXT':
        if (nextStation) {
          fadeOut();
          setStateText(translate('next'));
          setStationText(nextStation.name);
          adjustFontSize(nextStation.name);
          fadeIn();
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          fadeOut();
          setStateText(translate('nextKana'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustFontSize(katakanaToHiragana(nextStation.nameK));
          fadeIn();
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          fadeOut();
          setStateText(translate('nextEn'));
          setStationText(nextStation.nameR);
          adjustFontSize(nextStation.nameR, true);
          fadeIn();
        }
        break;
      case 'NEXT_ZH':
        if (nextStation?.nameZh) {
          fadeOut();
          setStateText(translate('nextZh'));
          setStationText(nextStation.nameZh);
          adjustFontSize(nextStation.nameZh);
          fadeIn();
        }
        break;
      case 'NEXT_KO':
        if (nextStation?.nameKo) {
          fadeOut();
          setStateText(translate('nextKo'));
          setStationText(nextStation.nameKo);
          adjustFontSize(nextStation.nameKo);
          fadeIn();
        }
        break;
      default:
        break;
    }

    setPrevState(state);
  }, [
    adjustFontSize,
    boundStation,
    fadeIn,
    fadeOut,
    headerLangState,
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
        width: windowWidth * 0.8,
        height: RFValue(stationNameFontSize),
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
        width: windowWidth * 0.8,
        height: RFValue(prevStationNameFontSize),
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
      <HeaderBar
        height={15}
        lineColor={line ? `#${line?.lineColorC}` : '#00ac9a'}
      />
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
            lineColor={line ? `#${line?.lineColorC}` : '#00ac9a'}
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
            {stationNameFontSize && (
              <View
                style={[
                  styles.stationNameWrapper,
                  { width: windowWidth * 0.8 },
                ]}
              >
                <Animated.Text
                  style={[
                    styles.stationName,
                    getTopNameAnimatedStyles(),
                    {
                      opacity: nameFadeAnim,
                      minHeight: RFValue(stationNameFontSize),
                      fontSize: RFValue(stationNameFontSize),
                    },
                  ]}
                >
                  {stationText}
                </Animated.Text>
                {boundStation && (
                  <Animated.Text
                    style={[
                      styles.stationName,
                      getBottomNameAnimatedStyles(),
                      {
                        opacity: nameFadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0],
                        }),
                        fontSize: RFValue(prevStationNameFontSize),
                      },
                    ]}
                  >
                    {prevStationName}
                  </Animated.Text>
                )}
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
      <HeaderBar
        height={5}
        lineColor={line ? `#${line?.lineColorC}` : '#00ac9a'}
      />
    </View>
  );
};

export default HeaderSaikyo;
