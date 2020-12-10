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
  useDerivedValue,
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { HEADER_CONTENT_TRANSITION_DELAY } from '../../constants';
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
    paddingBottom: 12,
  },
  bound: {
    color: '#555',
    fontWeight: 'bold',
    fontSize: isPad ? 32 : 21,
    marginLeft: 8,
  },
  state: {
    fontSize: isPad ? 38 : 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  stationName: {
    flex: 1,
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
  const [stateText, setStateText] = useState(translate('nowStoppingAt'));
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const [stationNameFontSize, setStationNameFontSize] = useState<number>();
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );
  const prevStateRef = useValueRef(prevState);

  const onLayout = (): void => {
    setWindowWidth(Dimensions.get('window').width);
  };

  const bottomFadeAnim = useSharedValue(1);
  const rotateAnim = useSharedValue(0);

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

  const fadeIn = useCallback((): void => {
    'worklet';

    bottomFadeAnim.value = withTiming(1, {
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: Easing.out(Easing.exp),
    });
    rotateAnim.value = withTiming(0, {
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: Easing.out(Easing.exp),
    });
  }, [bottomFadeAnim, rotateAnim]);

  const fadeOut = useCallback((): void => {
    'worklet';

    bottomFadeAnim.value = withTiming(0, {
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: Easing.out(Easing.exp),
    });
    rotateAnim.value = withTiming(1, {
      duration: HEADER_CONTENT_TRANSITION_DELAY,
      easing: Easing.out(Easing.exp),
    });
  }, [bottomFadeAnim, rotateAnim]);

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
    return `${rotateAnim.value * 90}deg`;
  }, []);

  const rootAnimatedStyles = useAnimatedStyle(() => {
    return {
      opacity: bottomFadeAnim.value,
      transform: [{ rotateX: spin.value }],
    };
  });

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
          <TrainTypeBox isMetro trainType={getTrainType(line)} />
          <Text style={styles.bound}>{boundText}</Text>
        </View>
        <Animated.View style={[rootAnimatedStyles, styles.bottom]}>
          {stationNameFontSize && (
            <>
              <Text style={{ ...styles.state, width: windowWidth / 4 }}>
                {stateText}
              </Text>
              <Text
                style={{
                  ...styles.stationName,
                  fontSize: stationNameFontSize,
                  marginRight: windowWidth / 6,
                }}
              >
                {stationText}
              </Text>
            </>
          )}
        </Animated.View>
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
