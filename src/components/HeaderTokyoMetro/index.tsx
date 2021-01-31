import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  Platform,
  PlatformIOSStatic,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  timing,
  useValue,
  concat,
  sub,
} from 'react-native-reanimated';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { CommonHeaderProps } from '../Header/common';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import {
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
  isOsakaLoopLine,
} from '../../utils/loopLine';
import useValueRef from '../../hooks/useValueRef';
import { isJapanese, translate } from '../../translation';
import TrainTypeBox from '../TrainTypeBox';
import getTrainType from '../../utils/getTrainType';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../../constants';

const HEADER_CONTENT_TRANSITION_DELAY = HEADER_CONTENT_TRANSITION_INTERVAL / 6;

const { isPad } = Platform as PlatformIOSStatic;

const styles = StyleSheet.create({
  gradientRoot: {
    paddingTop: 14,
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
  bound: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: isPad ? 32 : 21,
    marginLeft: 8,
  },
  stateWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  state: {
    position: 'absolute',
    fontSize: isPad ? 32 : 24,
    fontWeight: 'bold',
    textAlign: 'right',
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
  },
  divider: {
    width: '100%',
    alignSelf: 'stretch',
    height: isPad ? 10 : 4,
  },
  headerTexts: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
const HeaderTokyoMetro: React.FC<CommonHeaderProps> = ({
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
  const [stationNameFontSize, setStationNameFontSize] = useState<number>();
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const prevStationNameFontSize = useValueRef(stationNameFontSize).current;
  const prevStationName = useValueRef(stationText).current;
  const prevStateText = useValueRef(stateText).current;

  const onLayout = (): void => {
    setWindowWidth(Dimensions.get('window').width);
  };

  const getFontSize = useCallback((stationName: string): number => {
    if (isPad) {
      if (stationName.length >= 10) {
        return 48;
      }
      return 72;
    }

    if (stationName.length >= 10) {
      return 32;
    }
    return 48;
  }, []);

  const bottomNameFadeAnim = useValue<0 | 1>(0);
  const topNameFadeAnim = useValue<0 | 1>(1);
  const rootRotateAnim = useValue<0 | 90>(0);
  const stateOpacityAnim = useValue<0 | 1>(0);
  const bottomNameRotateAnim = useValue(0);
  const bottomNameTranslateY = useValue(
    getFontSize(isJapanese ? station.name : station.nameR)
  );

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? isOsakaLoopLine(line.id) : undefined;

  const { top: safeAreaTop } = useSafeAreaInsets();

  const adjustFontSize = useCallback(
    (stationName: string): void => {
      setStationNameFontSize(getFontSize(stationName));
    },
    [getFontSize]
  );

  useEffect(() => {
    if (prevStationNameFontSize) {
      bottomNameTranslateY.setValue(prevStationNameFontSize);
    }
  }, [bottomNameTranslateY, prevStationNameFontSize]);

  const prevStateIsDifferent = prevStateText !== stateText;

  const fadeIn = useCallback((): void => {
    timing(bottomNameTranslateY, {
      toValue: prevStationNameFontSize * 1.25,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: Easing.ease,
    }).start();
    timing(rootRotateAnim, {
      toValue: 0,
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
    timing(bottomNameFadeAnim, {
      toValue: 0,
      duration: HEADER_CONTENT_TRANSITION_DELAY * 0.75,
      easing: Easing.ease,
    }).start();
    timing(topNameFadeAnim, {
      toValue: 1,
      duration: HEADER_CONTENT_TRANSITION_DELAY * 0.75,
      easing: Easing.ease,
    }).start();
    timing(bottomNameRotateAnim, {
      toValue: -55,
      duration: HEADER_CONTENT_TRANSITION_DELAY * 0.75,
      easing: Easing.ease,
    }).start();
  }, [
    bottomNameFadeAnim,
    bottomNameRotateAnim,
    bottomNameTranslateY,
    prevStateIsDifferent,
    prevStationNameFontSize,
    rootRotateAnim,
    stateOpacityAnim,
    topNameFadeAnim,
  ]);

  const fadeOut = useCallback((): void => {
    bottomNameFadeAnim.setValue(1);
    topNameFadeAnim.setValue(0);
    rootRotateAnim.setValue(90);
    stateOpacityAnim.setValue(1);
  }, [bottomNameFadeAnim, rootRotateAnim, stateOpacityAnim, topNameFadeAnim]);

  useEffect(() => {
    if (!line || !boundStation) {
      setBoundText('TrainLCD');
    } else if (yamanoteLine || osakaLoopLine) {
      const currentIndex = getCurrentStationIndex(stations, station);
      setBoundText(
        `${isJapanese ? '' : `for `} ${
          lineDirection === 'INBOUND'
            ? `${
                inboundStationForLoopLine(stations, currentIndex, line)
                  ?.boundFor
              }`
            : outboundStationForLoopLine(stations, currentIndex, line)?.boundFor
        }${isJapanese ? '方面' : ''}`
      );
    } else if (isJapanese) {
      setBoundText(`${boundStation.name}方面`);
    } else {
      setBoundText(`for ${boundStation.nameR}`);
    }

    switch (state) {
      case 'ARRIVING':
        if (nextStation) {
          fadeOut();
          setStateText(translate('arrivingAt'));
          setStationText(nextStation.name);
          adjustFontSize(nextStation.name);
          fadeIn();
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          fadeOut();
          setStateText(translate('arrivingAt'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustFontSize(katakanaToHiragana(nextStation.nameK));
          fadeIn();
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          fadeOut();
          setStateText(translate('arrivingAt'));
          setStationText(nextStation.nameR);
          adjustFontSize(nextStation.nameR);
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
        adjustFontSize(station.nameR);
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
          setStateText(translate('next'));
          setStationText(nextStation.nameR);
          adjustFontSize(nextStation.nameR);
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

  const stationNameSpin = concat(rootRotateAnim, 'deg');

  const spinTopStationName = concat(bottomNameRotateAnim, 'deg');

  const stationNameAnimatedStyles = {
    transform: [{ rotateX: stationNameSpin }],
  };

  const bottomNameAnimatedStyles = {
    opacity: bottomNameFadeAnim,
    transform: [
      { rotateX: spinTopStationName },
      { translateY: bottomNameTranslateY },
    ],
  };

  const topNameAnimatedStyles = {
    opacity: topNameFadeAnim,
  };

  const stateTopAnimatedStyles = {
    opacity: sub(1, stateOpacityAnim),
  };

  const stateBottomAnimatedStyles = {
    opacity: stateOpacityAnim,
  };

  return (
    <View onLayout={onLayout}>
      <LinearGradient
        colors={['#eee', '#eee', '#dedede', '#eee', '#eee']}
        locations={[0, 0.45, 0.5, 0.6, 0.6]}
        style={styles.gradientRoot}
      >
        <View
          style={{
            ...styles.headerTexts,
            marginTop: Platform.OS === 'ios' ? safeAreaTop : 0,
          }}
        >
          <TrainTypeBox
            isMetro
            trainType={getTrainType(line, station, lineDirection)}
          />
          <Text style={styles.bound}>{boundText}</Text>
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
          <Animated.View style={stationNameAnimatedStyles}>
            {stationNameFontSize && (
              <View
                style={[
                  styles.stationNameWrapper,
                  { width: stateText === '' ? windowWidth : windowWidth * 0.8 },
                ]}
              >
                <Animated.Text
                  style={[
                    topNameAnimatedStyles,
                    styles.stationName,
                    {
                      minHeight: stationNameFontSize,
                      lineHeight: stationNameFontSize + 8,
                      fontSize: stationNameFontSize,
                    },
                  ]}
                >
                  {stationText}
                </Animated.Text>
                {boundStation && (
                  <Animated.Text
                    style={[
                      bottomNameAnimatedStyles,
                      styles.stationName,
                      {
                        color: '#555',
                        height: prevStationNameFontSize,
                        lineHeight: prevStationNameFontSize,
                        fontSize: prevStationNameFontSize,
                      },
                    ]}
                  >
                    {prevStationName}
                  </Animated.Text>
                )}
              </View>
            )}
          </Animated.View>
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

export default React.memo(HeaderTokyoMetro);
