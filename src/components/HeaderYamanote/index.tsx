import { LinearGradient } from 'expo-linear-gradient';
import i18n from 'i18n-js';
import React, { useEffect, useState, memo } from 'react';
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
import translations from '../../translations';
import katakanaToHiragana from '../../utils/kanaToHiragana';

i18n.translations = translations;

const { isPad } = Platform as PlatformIOSStatic;

const HeaderTokyoMetro: React.FC<CommonHeaderProps> = ({
  station,
  nextStation,
  boundStation,
  line,
  state,
}: CommonHeaderProps) => {
  const [prevState, setPrevState] = useState<HeaderTransitionState>(
    i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN'
  );
  const [stateText, setStateText] = useState(i18n.t('nowStoppingAt'));
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const [stationNameFontSize, setStationNameFontSize] = useState<number>();

  const [bottomFadeAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!line || !boundStation) {
      setBoundText('TrainLCD');
    } else {
      setBoundText(
        i18n.locale === 'ja' ? boundStation.name : boundStation.nameR
      );
    }

    const adjustFontSize = (stationName: string): void => {
      if (isPad) {
        if (stationName.length >= 10) {
          setStationNameFontSize(84);
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
            setStateText(i18n.t('arrivingAt'));
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
            setStateText(i18n.t('arrivingAt'));
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
            setStateText(i18n.t('arrivingAtEn'));
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
          setStateText(i18n.t('nowStoppingAt'));
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
          setStateText(i18n.t('nowStoppingAt'));
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
          setStateText(i18n.t('nowStoppingAtEn'));
          setStationText(station.nameR);
          adjustFontSize(station.nameR);
          fadeIn();
        }, HEADER_CONTENT_TRANSITION_DELAY);
        break;
      case 'NEXT':
        if (nextStation) {
          fadeOut();
          setTimeout(() => {
            setStateText(i18n.t('next'));
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
            setStateText(i18n.t('nextKana'));
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
            setStateText(i18n.t('nextEn'));
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
      paddingRight: 21,
      paddingLeft: 21,
      overflow: 'hidden',
      height: isPad ? 200 : 120,
    },
    bottom: {
      height: isPad ? 200 : 120,
      flexDirection: 'row',
    },
    bound: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: isPad ? 36 : 32,
      textAlign: i18n.locale === 'ja' ? 'right' : 'left',
    },
    boundFor: {
      fontSize: isPad ? 24 : 18,
      color: '#aaa',
      textAlign: i18n.locale === 'ja' ? 'right' : 'left',
    },
    boundForJa: {
      fontSize: isPad ? 24 : 18,
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
      fontSize: 28,
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
        <View style={styles.bottom}>
          <View style={styles.left}>
            {i18n.locale !== 'ja' && (
              <Text style={styles.boundFor}>Bound for</Text>
            )}
            <Text style={styles.bound}>{boundText}</Text>
            {i18n.locale === 'ja' && (
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
        </View>
      </LinearGradient>
    </View>
  );
};

export default memo(HeaderTokyoMetro);
