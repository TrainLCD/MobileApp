import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  View,
  Platform,
  PlatformIOSStatic,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  sub,
  useValue,
  concat,
  timing,
} from 'react-native-reanimated';
import { useRecoilValue } from 'recoil';
import { RFValue } from 'react-native-responsive-fontsize';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { CommonHeaderProps } from '../Header/common';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import {
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../../utils/loopLine';
import useValueRef from '../../hooks/useValueRef';
import { isJapanese, translate } from '../../translation';
import TrainTypeBox from '../TrainTypeBoxSaikyo';
import getTrainType from '../../utils/getTrainType';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../../constants';
import navigationState from '../../store/atoms/navigation';

const HEADER_CONTENT_TRANSITION_DELAY = HEADER_CONTENT_TRANSITION_INTERVAL / 6;

const { isPad } = Platform as PlatformIOSStatic;

const styles = StyleSheet.create({
  gradientRoot: {
    paddingRight: 21,
    paddingLeft: 21,
    overflow: 'hidden',
  },
  bottom: {
    height: isPad ? 128 : 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingBottom: 12,
  },
  boundWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
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

  const nameFadeAnim = useValue<number>(1);
  const rootRotateAnim = useValue<number>(0);
  const stateOpacityAnim = useValue<number>(0);
  const boundOpacityAnim = useValue<number>(0);
  const bottomNameRotateAnim = useValue<number>(1);
  const bottomNameTranslateY = useValue(0);

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
    timing(bottomNameTranslateY, {
      toValue: 1,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: Easing.ease,
    }).start();
    timing(rootRotateAnim, {
      toValue: 0,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: Easing.ease,
    }).start();
    timing(nameFadeAnim, {
      toValue: 1,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: Easing.ease,
    }).start();
    timing(bottomNameRotateAnim, {
      toValue: 1,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: Easing.ease,
    }).start();
    if (prevStateIsDifferent) {
      timing(stateOpacityAnim, {
        toValue: 0,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: Easing.ease,
      }).start();
    }
    if (prevBoundIsDifferent) {
      timing(boundOpacityAnim, {
        toValue: 0,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: Easing.ease,
      }).start();
    }
  }, [
    bottomNameRotateAnim,
    bottomNameTranslateY,
    boundOpacityAnim,
    prevBoundIsDifferent,
    prevStateIsDifferent,
    rootRotateAnim,
    stateOpacityAnim,
    nameFadeAnim,
  ]);

  const fadeOut = useCallback((): void => {
    nameFadeAnim.setValue(0);
    rootRotateAnim.setValue(1);
    stateOpacityAnim.setValue(1);
    boundOpacityAnim.setValue(1);
    bottomNameRotateAnim.setValue(0);
    bottomNameTranslateY.setValue(0);
  }, [
    bottomNameRotateAnim,
    bottomNameTranslateY,
    boundOpacityAnim,
    rootRotateAnim,
    stateOpacityAnim,
    nameFadeAnim,
  ]);

  useEffect(() => {
    if (!line || !boundStation) {
      setBoundText('TrainLCD');
    } else if (yamanoteLine || osakaLoopLine) {
      const currentIndex = getCurrentStationIndex(stations, station);
      setBoundText(
        `${!headerState.endsWith('_EN') ? '' : 'for '} ${
          lineDirection === 'INBOUND'
            ? `${
                inboundStationForLoopLine(
                  stations,
                  currentIndex,
                  line,
                  !headerState.endsWith('_EN')
                )?.boundFor
              }`
            : outboundStationForLoopLine(
                stations,
                currentIndex,
                line,
                !headerState.endsWith('_EN')
              )?.boundFor
        }${!headerState.endsWith('_EN') ? ' 方面' : ''}`
      );
    } else if (!headerState.endsWith('_EN')) {
      setBoundText(`${boundStation.name} 方面`);
    } else {
      setBoundText(`for ${boundStation.nameR}`);
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
        fadeOut();
        setStateText(translate('soon'));
        setStationText(katakanaToHiragana(nextStation.nameK));
        adjustFontSize(katakanaToHiragana(nextStation.nameK));
        fadeIn();
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
      case 'CURRENT':
        if (prevState !== 'CURRENT') {
          fadeOut();
        }
        setStateText('');
        setStationText(station.name);
        adjustFontSize(station.name);
        fadeIn();
        break;
      case 'CURRENT_KANA':
        if (prevState !== 'CURRENT_KANA') {
          fadeOut();
        }
        setStateText('');
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
      default:
        break;
    }

    setPrevState(state);
  }, [
    adjustFontSize,
    boundStation,
    fadeIn,
    fadeOut,
    headerState,
    line,
    lineDirection,
    nextStation,
    osakaLoopLine,
    prevState,
    state,
    station,
    stations,
    yamanoteLine,
  ]);

  const stationNameSpin = concat(
    interpolate(rootRotateAnim, {
      inputRange: [0, 1],
      outputRange: [0, 65],
    }),
    'deg'
  );
  const spinTopStationName = concat(
    interpolate(bottomNameRotateAnim, {
      inputRange: [0, 1],
      outputRange: [-60, -70],
    }),
    'deg'
  );

  const stateTopAnimatedStyles = {
    opacity: sub(1, stateOpacityAnim),
  };

  const stateBottomAnimatedStyles = {
    opacity: stateOpacityAnim,
  };

  const topNameAnimatedStyles = {
    transform: [{ rotateX: stationNameSpin }],
  };

  const bottomNameAnimatedStyles = {
    opacity: nameFadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 0],
    }),
    transform: [
      { rotateX: spinTopStationName },
      {
        translateY: bottomNameTranslateY.interpolate({
          inputRange: [0, 1],
          outputRange: [0, RFValue(24)],
        }),
      },
    ],
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
            trainType={trainType ?? getTrainType(line, station, lineDirection)}
          />
          <View style={styles.boundWrapper}>
            <Animated.Text style={[boundTopAnimatedStyles, styles.bound]}>
              {boundText}
            </Animated.Text>
            {boundStation && (
              <Animated.Text style={[boundBottomAnimatedStyles, styles.bound]}>
                {prevBoundText}
              </Animated.Text>
            )}
          </View>
        </View>
        <View style={styles.bottom}>
          {stateText !== '' && (
            <View style={styles.stateWrapper}>
              <Animated.Text style={[stateTopAnimatedStyles, styles.state]}>
                {stateText}
              </Animated.Text>
              {boundStation && (
                <Animated.Text
                  style={[stateBottomAnimatedStyles, styles.state]}
                >
                  {prevStateText}
                </Animated.Text>
              )}
            </View>
          )}
          <View>
            {stationNameFontSize && (
              <View
                style={[
                  styles.stationNameWrapper,
                  { width: stateText === '' ? windowWidth : windowWidth * 0.8 },
                ]}
              >
                <Animated.Text
                  style={[
                    styles.stationName,
                    topNameAnimatedStyles,
                    {
                      minHeight: RFValue(stationNameFontSize),
                      lineHeight: RFValue(stationNameFontSize + 8),
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
                      bottomNameAnimatedStyles,
                      {
                        height: RFValue(prevStationNameFontSize),
                        lineHeight: RFValue(prevStationNameFontSize + 8),
                        fontSize: RFValue(prevStationNameFontSize),
                        top: RFValue(stationNameFontSize),
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
