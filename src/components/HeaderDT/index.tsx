import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  Platform,
  PlatformIOSStatic,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
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
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 1,
    shadowRadius: 1,
  },
  bottom: {
    height: isPad ? 128 : 84,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 12,
  },
  bound: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: isPad ? 32 : 21,
    marginLeft: 8,
  },
  state: {
    fontSize: isPad ? 35 : 24,
    fontWeight: 'bold',
    color: '#fff',
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
    color: '#fff',
  },
  divider: {
    width: '100%',
    alignSelf: 'stretch',
    height: isPad ? 4 : 2,
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
});

const { width: windowWidth } = Dimensions.get('window');

const HeaderDT: React.FC<CommonHeaderProps> = ({
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
  const [stateText, setStateText] = useState(translate('nowStoppingAt'));
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const [stationNameFontSize, setStationNameFontSize] = useState<number>();
  const prevStateRef = useValueRef(prevState);
  const prevStationNameFontSizeRef = useValueRef(stationNameFontSize);
  const prevStationNameRef = useValueRef(stationText);

  const bottomNameFadeAnim = useSharedValue(0);
  const rootRotateAnim = useSharedValue(0);
  const bottomNameRotateAnim = useSharedValue(0);
  const bottomNameTranslateY = useSharedValue(0);

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? isOsakaLoopLine(line.id) : undefined;

  const { top: safeAreaTop } = useSafeAreaInsets();

  const adjustFontSize = useCallback((stationName: string): void => {
    if (isPad) {
      if (stationName.length >= 10) {
        setStationNameFontSize(48);
      } else if (stationName.length >= 7) {
        setStationNameFontSize(64);
      } else {
        setStationNameFontSize(72);
      }
      return;
    }

    if (stationName.length >= 10) {
      setStationNameFontSize(28);
    } else if (stationName.length >= 7) {
      setStationNameFontSize(32);
    } else {
      setStationNameFontSize(48);
    }
  }, []);

  useEffect(() => {
    bottomNameTranslateY.value = prevStationNameFontSizeRef.current;
  }, [bottomNameTranslateY.value, prevStationNameFontSizeRef]);

  const fadeIn = useCallback((): void => {
    'worklet';

    bottomNameTranslateY.value = withTiming(
      prevStationNameFontSizeRef.current * 1.25,
      {
        duration: HEADER_CONTENT_TRANSITION_DELAY,
        easing: Easing.ease,
      }
    );
    rootRotateAnim.value = withTiming(0, {
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: Easing.ease,
    });
    bottomNameFadeAnim.value = withTiming(0, {
      duration: HEADER_CONTENT_TRANSITION_DELAY * 0.75,
      easing: Easing.ease,
    });
    bottomNameRotateAnim.value = withTiming(-55, {
      duration: HEADER_CONTENT_TRANSITION_DELAY * 0.75,
      easing: Easing.ease,
    });
  }, [
    bottomNameFadeAnim.value,
    bottomNameRotateAnim.value,
    bottomNameTranslateY.value,
    prevStationNameFontSizeRef,
    rootRotateAnim.value,
  ]);

  const fadeOut = useCallback((): void => {
    'worklet';

    bottomNameFadeAnim.value = 0.75;
    rootRotateAnim.value = 90;
  }, [bottomNameFadeAnim.value, rootRotateAnim.value]);

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
          setStateText(translate('soon'));
          setStationText(nextStation.nameR);
          adjustFontSize(nextStation.nameR);
          fadeIn();
        }
        break;
      case 'CURRENT':
        if (prevStateRef.current !== 'CURRENT') {
          fadeOut();
        }
        setStateText(translate('nowStoppingAt'));
        setStationText(station.name);
        adjustFontSize(station.name);
        fadeIn();
        break;
      case 'CURRENT_KANA':
        if (prevStateRef.current !== 'CURRENT_KANA') {
          fadeOut();
        }
        setStateText(translate('nowStoppingAt'));
        setStationText(katakanaToHiragana(station.nameK));
        adjustFontSize(katakanaToHiragana(station.nameK));
        fadeIn();
        break;
      case 'CURRENT_EN':
        if (prevStateRef.current !== 'CURRENT_EN') {
          fadeOut();
        }
        setStateText(translate('nowStoppingAt'));
        setStationText(station.nameR);
        adjustFontSize(station.nameR);
        fadeIn();
        break;
      case 'NEXT':
        if (nextStation) {
          fadeOut();
          setStateText(translate('nextDT'));
          setStationText(nextStation.name);
          adjustFontSize(nextStation.name);
          fadeIn();
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          fadeOut();
          setStateText(translate('nextDT'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustFontSize(katakanaToHiragana(nextStation.nameK));
          fadeIn();
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          fadeOut();
          setStateText(translate('nextDT'));
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
    prevStateRef,
    state,
    station,
    stations,
    yamanoteLine,
  ]);

  const spin = useDerivedValue(() => {
    return `${rootRotateAnim.value}deg`;
  }, []);
  const spinTopStationName = useDerivedValue(() => {
    return `${bottomNameRotateAnim.value}deg`;
  }, []);

  const rootAnimatedStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotateX: spin.value }],
    };
  });
  const bottomNameAnimatedStyles = useAnimatedStyle(() => {
    return {
      opacity: bottomNameFadeAnim.value,
      transform: [
        { rotateX: spinTopStationName.value },
        { translateY: bottomNameTranslateY.value },
      ],
    };
  });

  return (
    <View>
      <LinearGradient
        colors={['#333', '#212121', '#000']}
        locations={[0, 0.5, 0.5]}
        style={styles.gradientRoot}
      >
        <View
          style={{
            ...styles.headerTexts,
            marginTop: Platform.OS === 'ios' ? safeAreaTop : 0,
          }}
        >
          <TrainTypeBox trainType={getTrainType(line)} />
          <Text style={styles.bound}>{boundText}</Text>
        </View>
        <Animated.View style={[rootAnimatedStyles, styles.bottom]}>
          {stationNameFontSize && (
            <>
              <Text style={{ ...styles.state, width: windowWidth * 0.2 }}>
                {stateText}
              </Text>

              <View style={styles.stationNameWrapper}>
                <Text
                  style={[
                    styles.stationName,
                    {
                      fontSize: stationNameFontSize,
                      marginRight: windowWidth * 0.1,
                    },
                  ]}
                >
                  {stationText}
                </Text>
                {boundStation && (
                  <Animated.Text
                    style={[
                      bottomNameAnimatedStyles,
                      styles.stationName,
                      {
                        fontSize: stationNameFontSize,
                        marginRight: windowWidth * 0.1,
                      },
                    ]}
                  >
                    {prevStationNameRef.current}
                  </Animated.Text>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </LinearGradient>
      <View style={styles.divider} />
    </View>
  );
};

export default React.memo(HeaderDT);
