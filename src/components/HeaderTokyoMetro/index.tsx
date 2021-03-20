import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
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
import TrainTypeBox from '../TrainTypeBox';
import getTrainType from '../../utils/getTrainType';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../../constants';
import navigationState from '../../store/atoms/navigation';

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
  const [stationNameFontSize, setStationNameFontSize] = useState(44);
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const prevStationNameFontSize = useValueRef(stationNameFontSize).current;
  const prevStationName = useValueRef(stationText).current;
  const prevStateText = useValueRef(stateText).current;
  const prevBoundText = useValueRef(boundText).current;
  const { headerState, trainType } = useRecoilValue(navigationState);

  const onLayout = (): void => {
    setWindowWidth(Dimensions.get('window').width);
  };

  const getFontSize = useCallback((stationName: string): number => {
    if (stationName.length >= 15) {
      return 24;
    }
    return 35;
  }, []);

  const bottomNameFadeAnim = useValue<0 | 1>(0);
  const topNameFadeAnim = useValue<0 | 1>(1);
  const rootRotateAnim = useValue<0 | 90>(0);
  const stateOpacityAnim = useValue<0 | 1>(0);
  const boundOpacityAnim = useValue<0 | 1>(0);
  const bottomNameRotateAnim = useValue(0);
  const bottomNameTranslateY = useValue<number>(0);

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? !trainType && line.id === 11623 : undefined;

  const { top: safeAreaTop } = useSafeAreaInsets();

  const adjustFontSize = useCallback(
    (stationName: string, en?: boolean): void => {
      if (!en) {
        setStationNameFontSize(getFontSize(stationName));
      }
    },
    [getFontSize]
  );

  useEffect(() => {
    if (prevStationNameFontSize) {
      bottomNameTranslateY.setValue(prevStationNameFontSize);
    }
  }, [bottomNameTranslateY, prevStationNameFontSize]);

  const prevStateIsDifferent = prevStateText !== stateText;
  const prevBoundIsDifferent = prevBoundText !== boundText;

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
    if (prevBoundIsDifferent) {
      timing(boundOpacityAnim, {
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
    boundOpacityAnim,
    prevBoundIsDifferent,
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
    boundOpacityAnim.setValue(1);
  }, [
    bottomNameFadeAnim,
    boundOpacityAnim,
    rootRotateAnim,
    stateOpacityAnim,
    topNameFadeAnim,
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
        }${!headerState.endsWith('_EN') ? '方面' : ''}`
      );
    } else if (!headerState.endsWith('_EN')) {
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
          setStateText(translate('arrivingAtEn'));
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

  const boundTopAnimatedStyles = {
    opacity: sub(1, boundOpacityAnim),
  };

  const boundBottomAnimatedStyles = {
    opacity: boundOpacityAnim,
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
                      bottomNameAnimatedStyles,
                      styles.stationName,
                      {
                        color: '#555',
                        height: RFValue(prevStationNameFontSize),
                        lineHeight: RFValue(prevStationNameFontSize),
                        fontSize: RFValue(prevStationNameFontSize),
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
