import { LinearGradient } from 'expo-linear-gradient';
import i18n from 'i18n-js';
import React, { useEffect, useState, memo } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
  Platform,
  PlatformIOSStatic,
} from 'react-native';

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
import getTranslatedText from '../../utils/translate';

const { isPad } = Platform as PlatformIOSStatic;

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
    i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN'
  );
  const [stateText, setStateText] = useState(
    getTranslatedText('nowStoppingAt')
  );
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const [stationNameFontSize, setStationNameFontSize] = useState<number>();
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width
  );

  const onLayout = (): void => {
    setWindowWidth(Dimensions.get('window').width);
  };

  const [bottomFadeAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? isOsakaLoopLine(line.id) : undefined;

  useEffect(() => {
    if (!line || !boundStation) {
      setBoundText('TrainLCD');
    } else if (yamanoteLine || osakaLoopLine) {
      const currentIndex = getCurrentStationIndex(stations, station);
      setBoundText(
        `${i18n.locale === 'ja' ? '' : `for `} ${
          lineDirection === 'INBOUND'
            ? `${
                inboundStationForLoopLine(stations, currentIndex, line).boundFor
              }`
            : outboundStationForLoopLine(stations, currentIndex, line).boundFor
        }${i18n.locale === 'ja' ? '方面' : ''}`
      );
    } else if (i18n.locale === 'ja') {
      setBoundText(`${boundStation.name}方面`);
    } else {
      setBoundText(`for ${boundStation.nameR}`);
    }

    const adjustFontSize = (stationName: string): void => {
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
    };

    const fadeIn = (): void => {
      Animated.timing(bottomFadeAnim, {
        toValue: 1,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
      }).start();
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
      }).start();
    };

    const fadeOut = (): void => {
      Animated.timing(bottomFadeAnim, {
        toValue: 0,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
      }).start();
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
      }).start();
    };

    switch (state) {
      case 'ARRIVING':
        if (nextStation) {
          fadeOut();
          setTimeout(() => {
            setStateText(getTranslatedText('arrivingAt'));
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
            setStateText(getTranslatedText('arrivingAt'));
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
            setStateText(getTranslatedText('arrivingAtEn'));
            setStationText(nextStation.nameR);
            adjustFontSize(nextStation.nameR);
            fadeIn();
          }, HEADER_CONTENT_TRANSITION_DELAY);
        }
        break;
      case 'CURRENT':
        if (prevState !== 'CURRENT') {
          fadeOut();
        }
        setTimeout(() => {
          setStateText(getTranslatedText('nowStoppingAt'));
          setStationText(station.name);
          adjustFontSize(station.name);
          fadeIn();
        }, HEADER_CONTENT_TRANSITION_DELAY);
        break;
      case 'CURRENT_KANA':
        if (prevState !== 'CURRENT_KANA') {
          fadeOut();
        }
        setTimeout(() => {
          setStateText(getTranslatedText('nowStoppingAt'));
          setStationText(katakanaToHiragana(station.nameK));
          adjustFontSize(katakanaToHiragana(station.nameK));
          fadeIn();
        }, HEADER_CONTENT_TRANSITION_DELAY);
        break;
      case 'CURRENT_EN':
        if (prevState !== 'CURRENT_EN') {
          fadeOut();
        }
        setTimeout(() => {
          setStateText(getTranslatedText('nowStoppingAtEn'));
          setStationText(station.nameR);
          adjustFontSize(station.nameR);
          fadeIn();
        }, HEADER_CONTENT_TRANSITION_DELAY);
        break;
      case 'NEXT':
        if (nextStation) {
          fadeOut();
          setTimeout(() => {
            setStateText(getTranslatedText('next'));
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
            setStateText(getTranslatedText('nextKana'));
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
            setStateText(getTranslatedText('nextEn'));
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
  }, [state, line, nextStation, boundStation, station]);

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
    },
    state: {
      fontSize: isPad ? 38 : 24,
      width: windowWidth / 4,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    stationName: {
      flex: 1,
      fontSize: stationNameFontSize,
      marginRight: windowWidth / 6,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    divider: {
      width: '100%',
      alignSelf: 'stretch',
      height: isPad ? 10 : 4,
    },
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  return (
    <View onLayout={onLayout}>
      <LinearGradient
        colors={['#fdfbfb', '#ebedee']}
        style={styles.gradientRoot}
      >
        <View>
          <Text style={styles.bound}>{boundText}</Text>
        </View>
        <Animated.View
          style={[
            { opacity: bottomFadeAnim, transform: [{ rotateX: spin }] },
            styles.bottom,
          ]}
        >
          {stationNameFontSize && (
            <>
              <Text style={styles.state}>{stateText}</Text>
              <Text style={styles.stationName}>{stationText}</Text>
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

export default memo(HeaderSaikyo);
