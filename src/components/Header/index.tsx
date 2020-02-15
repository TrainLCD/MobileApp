import {LinearGradient} from 'expo-linear-gradient';
import i18n from 'i18n-js';
import React, {useEffect, useState} from 'react';
import {Animated, Dimensions, StyleSheet, Text, View} from 'react-native';

import {HEADER_CONTENT_TRANSITION_DELAY} from '../../constants';
import {LineDirection} from '../../models/Bound';
import {HeaderTransitionState} from '../../models/HeaderTransitionState';
import {ILine, IStation} from '../../models/StationAPI';
import {translations} from '../../translations';
import {katakanaToHiragana} from '../../utils/kanaToHiragana';
import {katakanaToRomaji} from '../../utils/katakanaToRomaji';
import {isLoopLine} from '../../utils/loopLine';

i18n.translations = translations;

interface IProps {
  state: HeaderTransitionState;
  station: IStation;
  nextStation?: IStation;
  boundStation?: IStation;
  lineDirection?: LineDirection;
  line?: ILine;
}

const Header = (props: IProps) => {
  const {
    station,
    nextStation,
    boundStation,
    line,
    state,
    lineDirection,
  } = props;

  const [prevState, setPrevState] = useState<HeaderTransitionState>(i18n.locale === 'ja' ? 'CURRENT' : 'CURRENT_EN');
  const [stateText, setStateText] = useState(i18n.t('nowStoppingAt'));
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const [stationNameFontSize, setStationNameFontSize] = useState(48);
  const [windowWidth, setWindowWidth] = useState(
    Dimensions.get('window').width,
  );

  const onLayout = () => {
    setWindowWidth(Dimensions.get('window').width);
  };

  const [bottomFadeAnim] = useState(new Animated.Value(0));

  const loopLine = line ? isLoopLine(line) : undefined;

  useEffect(() => {
    if (!line || !boundStation) {
      setBoundText('TrainLCD');
    } else if (loopLine) {
      if (i18n.locale === 'ja') {
        setBoundText(
          `${line.name} ${lineDirection === 'INBOUND' ? '内回り' : '外回り'}`,
        );
      } else {
        setBoundText(
          `${line.name} ${lineDirection === 'INBOUND' ? 'Inbound' : 'Outbound'}`,
        );
      }
    } else {
      if (i18n.locale === 'ja') {
        setBoundText(`${boundStation.name}方面`);
      } else {
        setBoundText(`Bound for ${katakanaToRomaji(boundStation.nameK)}`);
      }
    }

    const adjustFontSize = (stationName: string) => {
      if (stationName.length >= 7) {
        setStationNameFontSize(32);
      } else {
        setStationNameFontSize(48);
      }
    };

    const fadeIn = () => {
      Animated.timing(bottomFadeAnim, {
        toValue: 1,
        duration: HEADER_CONTENT_TRANSITION_DELAY,
      }).start();
    };

    const fadeOut = () => {
      Animated.timing(bottomFadeAnim, {
        toValue: 0,
        duration: 250,
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
            setStationText(katakanaToRomaji(nextStation.nameK));
            adjustFontSize(katakanaToRomaji(nextStation.nameK));
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
          setStationText(katakanaToRomaji(station.nameK));
          adjustFontSize(katakanaToRomaji(station.nameK));
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
            setStationText(katakanaToRomaji(nextStation.nameK));
            adjustFontSize(katakanaToRomaji(nextStation.nameK));
            fadeIn();
          }, HEADER_CONTENT_TRANSITION_DELAY);
        }
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
      height: 84,
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingBottom: 12,
    },
    bound: {
      color: '#555',
      fontWeight: 'bold',
      fontSize: 21,
    },
    state: {
      fontSize: 24,
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
      backgroundColor: line ? `#${line.lineColorC}` : '#b5b5ac',
      height: 4,
    },
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
        <Animated.View style={[{opacity: bottomFadeAnim}, styles.bottom]}>
          <Text style={styles.state}>{stateText}</Text>
          <Text style={styles.stationName}>{stationText}</Text>
        </Animated.View>
      </LinearGradient>
      <View style={styles.divider}/>
    </View>
  );
};

export default Header;
