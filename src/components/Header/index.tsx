import { LinearGradient } from 'expo-linear-gradient';
import i18n from 'i18n-js';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';

import { HEADER_CONTENT_TRANSITION_DELAY } from '../../constants';
import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Line, Station } from '../../models/StationAPI';
import translations from '../../translations';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import {
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../../utils/loopLine';

i18n.translations = translations;

const { isTablet } = DeviceInfo;

interface Props {
  state: HeaderTransitionState;
  station: Station;
  nextStation?: Station;
  boundStation?: Station;
  lineDirection?: LineDirection;
  line?: Line;
  stations: Station[];
}

const Header: React.FC<Props> = ({
  station,
  nextStation,
  boundStation,
  line,
  state,
  lineDirection,
  stations,
}: Props) => {
  const [prevState, setPrevState] = useState<HeaderTransitionState>(
    i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN'
  );
  const [stateText, setStateText] = useState(i18n.t('nowStoppingAt'));
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

  useEffect(() => {
    if (!line || !boundStation) {
      setBoundText('TrainLCD');
    } else if (yamanoteLine) {
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
      if (isTablet) {
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
      paddingTop: 14,
      paddingRight: 21,
      paddingLeft: 21,
      overflow: 'hidden',
    },
    bottom: {
      height: isTablet ? 128 : 84,
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingBottom: 12,
    },
    bound: {
      color: '#555',
      fontWeight: 'bold',
      fontSize: isTablet ? 32 : 21,
    },
    state: {
      fontSize: isTablet ? 38 : 24,
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
      height: isTablet ? 10 : 4,
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

export default Header;
