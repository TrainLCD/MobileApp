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
  Image,
} from 'react-native';

import { HEADER_CONTENT_TRANSITION_DELAY } from '../../constants';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { CommonHeaderProps } from '../Header/common';
import translations from '../../translations';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import {
  isYamanoteLine,
  inboundStationForLoopLine,
  outboundStationForLoopLine,
} from '../../utils/loopLine';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import TransferLineMark from '../TransferLineMark';
import { getLineMark } from '../../lineMark';

i18n.translations = translations;

const { isPad } = Platform as PlatformIOSStatic;

const HeaderJRWest: React.FC<CommonHeaderProps> = ({
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
  const [stateText, setStateText] = useState(i18n.t('nowStoppingAt'));
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('');
  const [stationNameFontSize, setStationNameFontSize] = useState<number>();

  const [bottomFadeAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;

  useEffect(() => {
    if (!line || !boundStation) {
      setBoundText('');
    } else if (yamanoteLine) {
      const currentIndex = getCurrentStationIndex(stations, station);
      setBoundText(
        lineDirection === 'INBOUND'
          ? inboundStationForLoopLine(stations, currentIndex, line).boundFor
          : outboundStationForLoopLine(stations, currentIndex, line).boundFor
      );
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
      height: isPad ? 240 : 140,
      paddingTop: 32,
    },
    localLogo: {
      width: isPad ? 120 : 80,
      height: isPad ? 54 : 36,
    },
    bottom: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    state: {
      fontSize: isPad ? 38 : 21,
      color: '#fff',
      flex: 0.2,
      textAlign: 'right',
      fontWeight: 'bold',
      paddingBottom: 16,
    },
    top: {
      flexDirection: 'row',
    },
    stationName: {
      color: '#fff',
      flex: 0.8,
      textAlign: 'center',
      fontSize: stationNameFontSize,
      fontWeight: 'bold',
      paddingBottom: 16,
      letterSpacing: i18n.locale === 'ja' ? 4 : 0,
    },
    lineType: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    boundFor: {
      color: '#fff',
      fontSize: isPad ? 32 : 24,
      fontWeight: 'bold',
      marginLeft: 32,
    },
  });

  const mark = line && getLineMark(line);
  const wrappedBoundText =
    i18n.locale === 'ja' ? `${boundText} 方面` : `for ${boundText}`;

  return (
    <View>
      <LinearGradient colors={['#212121', '#333']} style={styles.gradientRoot}>
        <View style={styles.top}>
          {boundStation && (
            <>
              <View style={styles.lineType}>
                <TransferLineMark line={line} mark={mark} />
                <Image
                  style={styles.localLogo}
                  // eslint-disable-next-line global-require
                  source={require('../../assets/images/jrw_local.png')}
                />
              </View>
              <Text style={styles.boundFor}>{wrappedBoundText}</Text>
            </>
          )}
        </View>
        <View style={styles.bottom}>
          {stationNameFontSize && (
            <>
              <Text style={styles.state}>{stateText}</Text>
              <Text style={styles.stationName}>{stationText}</Text>
            </>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

export default memo(HeaderJRWest);
