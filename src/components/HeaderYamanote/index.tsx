import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useCallback } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Platform,
  PlatformIOSStatic,
} from 'react-native';

import { HEADER_CONTENT_TRANSITION_DELAY } from '../../constants';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { CommonHeaderProps } from '../Header/common';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import {
  isYamanoteLine,
  inboundStationForLoopLine,
  outboundStationForLoopLine,
  isOsakaLoopLine,
} from '../../utils/loopLine';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import useValueRef from '../../hooks/useValueRef';
import { isJapanese, translate } from '../../translation';

const { isPad } = Platform as PlatformIOSStatic;

const HeaderYamanote: React.FC<CommonHeaderProps> = ({
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
  const [boundStationNameFontSize, setBoundStationNameFontSize] = useState(32);

  const [bottomFadeAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));
  const prevStateRef = useValueRef(prevState);

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? isOsakaLoopLine(line.id) : undefined;

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
      setStationNameFontSize(32);
    } else if (stationName.length >= 7) {
      setStationNameFontSize(48);
    } else {
      setStationNameFontSize(58);
    }
  }, []);
  const adjustBoundFontSize = useCallback((stationName: string): void => {
    if (isPad) {
      if (stationName.length >= 10) {
        setBoundStationNameFontSize(36);
      } else {
        setBoundStationNameFontSize(48);
      }
      return;
    }

    if (stationName.length >= 10) {
      setBoundStationNameFontSize(21);
    } else {
      setBoundStationNameFontSize(32);
    }
  }, []);

  const fadeIn = useCallback((): void => {
    Animated.timing(bottomFadeAnim, {
      toValue: 1,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      useNativeDriver: true,
    }).start();
    Animated.timing(rotateAnim, {
      toValue: 0,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      useNativeDriver: true,
    }).start();
  }, [bottomFadeAnim, rotateAnim]);

  const fadeOut = useCallback((): void => {
    Animated.timing(bottomFadeAnim, {
      toValue: 0,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      useNativeDriver: true,
    }).start();
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      useNativeDriver: true,
    }).start();
  }, [bottomFadeAnim, rotateAnim]);

  useEffect(() => {
    if (boundStation) {
      adjustBoundFontSize(isJapanese ? boundStation.name : boundStation.nameR);
    }

    if (!line || !boundStation) {
      setBoundText('TrainLCD');
    } else if (yamanoteLine || osakaLoopLine) {
      const currentIndex = getCurrentStationIndex(stations, station);
      setBoundText(
        lineDirection === 'INBOUND'
          ? inboundStationForLoopLine(stations, currentIndex, line).boundFor
          : outboundStationForLoopLine(stations, currentIndex, line).boundFor
      );
    } else {
      setBoundText(isJapanese ? boundStation.name : boundStation.nameR);
    }

    switch (state) {
      case 'ARRIVING':
        if (nextStation) {
          fadeOut();
          setTimeout(() => {
            setStateText(translate('arrivingAt'));
            setStationText(nextStation.name);
            adjustFontSize(nextStation.name);
            fadeIn();
          }, HEADER_CONTENT_TRANSITION_DELAY);
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          fadeOut();
          setTimeout(() => {
            setStateText(translate('arrivingAt'));
            setStationText(katakanaToHiragana(nextStation.nameK));
            adjustFontSize(katakanaToHiragana(nextStation.nameK));
            fadeIn();
          }, HEADER_CONTENT_TRANSITION_DELAY);
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          fadeOut();
          setTimeout(() => {
            setStateText(translate('arrivingAt'));
            setStationText(nextStation.nameR);
            adjustFontSize(nextStation.nameR);
            fadeIn();
          }, HEADER_CONTENT_TRANSITION_DELAY);
        }
        break;
      case 'CURRENT':
        if (prevStateRef.current !== 'CURRENT') {
          fadeOut();
        }
        setTimeout(() => {
          setStateText(translate('nowStoppingAt'));
          setStationText(station.name);
          adjustFontSize(station.name);
          fadeIn();
        }, HEADER_CONTENT_TRANSITION_DELAY);
        break;
      case 'CURRENT_KANA':
        if (prevStateRef.current !== 'CURRENT_KANA') {
          fadeOut();
        }
        setTimeout(() => {
          setStateText(translate('nowStoppingAt'));
          setStationText(katakanaToHiragana(station.nameK));
          adjustFontSize(katakanaToHiragana(station.nameK));
          fadeIn();
        }, HEADER_CONTENT_TRANSITION_DELAY);
        break;
      case 'CURRENT_EN':
        if (prevStateRef.current !== 'CURRENT_EN') {
          fadeOut();
        }
        setTimeout(() => {
          setStateText(translate('nowStoppingAt'));
          setStationText(station.nameR);
          adjustFontSize(station.nameR);
          fadeIn();
        }, HEADER_CONTENT_TRANSITION_DELAY);
        break;
      case 'NEXT':
        if (nextStation) {
          fadeOut();
          setTimeout(() => {
            setStateText(translate('next'));
            setStationText(nextStation.name);
            adjustFontSize(nextStation.name);
            fadeIn();
          }, HEADER_CONTENT_TRANSITION_DELAY);
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          fadeOut();
          setTimeout(() => {
            setStateText(translate('nextKana'));
            setStationText(katakanaToHiragana(nextStation.nameK));
            adjustFontSize(katakanaToHiragana(nextStation.nameK));
            fadeIn();
          }, HEADER_CONTENT_TRANSITION_DELAY);
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          fadeOut();
          setTimeout(() => {
            setStateText(translate('next'));
            setStationText(nextStation.nameR);
            adjustFontSize(nextStation.nameR);
            fadeIn();
          }, HEADER_CONTENT_TRANSITION_DELAY);
        }
        break;
      default:
        break;
    }
    setPrevState(state);
  }, [
    state,
    line,
    nextStation,
    boundStation,
    station,
    yamanoteLine,
    osakaLoopLine,
    adjustBoundFontSize,
    stations,
    lineDirection,
    bottomFadeAnim,
    rotateAnim,
    adjustFontSize,
    prevStateRef,
    fadeOut,
    fadeIn,
  ]);

  const styles = StyleSheet.create({
    gradientRoot: {
      paddingRight: 21,
      paddingLeft: 21,
      overflow: 'hidden',
      height: isPad ? 200 : 120,
      flexDirection: 'row',
    },
    bottom: {
      height: isPad ? 200 : 120,
      flexDirection: 'row',
    },
    bound: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: boundStationNameFontSize,
      textAlign: isJapanese ? 'right' : 'left',
    },
    boundFor: {
      fontSize: isPad ? 32 : 18,
      color: '#aaa',
      textAlign: isJapanese ? 'right' : 'left',
    },
    boundForJa: {
      fontSize: isPad ? 32 : 18,
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'right',
    },
    stationName: {
      fontSize: stationNameFontSize,
      fontWeight: 'bold',
      color: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 32,
    },
    left: {
      flex: 0.3,
      justifyContent: 'center',
      height: isPad ? 200 : 120,
      marginRight: 24,
    },
    right: {
      flex: 1,
      justifyContent: 'center',
      height: isPad ? 200 : 120,
    },
    state: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: isPad ? 32 : 24,
      position: 'absolute',
      top: 12,
    },
    colorBar: {
      backgroundColor: `#${line ? line.lineColorC : 'aaa'}`,
      width: isPad ? 48 : 38,
      height: isPad ? 180 : 110,
      marginRight: 32,
    },
  });

  return (
    <View>
      <LinearGradient
        colors={['#222222', '#212121']}
        style={styles.gradientRoot}
      >
        <View style={styles.left}>
          {!isJapanese && boundStation && (
            <Text style={styles.boundFor}>Bound for</Text>
          )}
          <Text style={styles.bound}>{boundText}</Text>
          {isJapanese && boundStation && (
            <Text style={styles.boundForJa}>方面</Text>
          )}
        </View>
        <View style={styles.colorBar} />
        {stationNameFontSize && (
          <View style={styles.right}>
            <Text style={styles.state}>{stateText}</Text>
            <Text style={styles.stationName}>{stationText}</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

export default React.memo(HeaderYamanote);
