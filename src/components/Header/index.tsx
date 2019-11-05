import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

import { HEADER_CONTENT_TRANSITION_DELAY } from '../../constants';
import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { ILine, IStation } from '../../models/StationAPI';
import { katakanaToHiragana } from '../../utils/kanaToHiragana';
import { isLoopLine } from '../../utils/loopLine';

const screenWidth = Dimensions.get('screen').width;

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

  const [prevState, setPrevState] = useState<HeaderTransitionState>('CURRENT');
  const [stateText, setStateText] = useState('ただいま');
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const [stationNameFontSize, setStationNameFontSize] = useState(48);

  const [bottomFadeAnim] = useState(new Animated.Value(0));

  const loopLine = line ? isLoopLine(line) : undefined;

  useEffect(() => {
    if (!line) {
      setBoundText('TrainLCD');
    } else if (boundStation && loopLine) {
      setBoundText(
        `${line.name} ${lineDirection === 'INBOUND' ? '内回り' : '外回り'}`,
      );
    } else if (boundStation) {
      setBoundText(`${boundStation.name}方面`);
    }

    const adjustFontSize = (stationName: string) => {
      if (stationName.length >= 7) {
        setStationNameFontSize(38);
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
            setStateText('まもなく');
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
            setStateText('まもなく');
            setStationText(katakanaToHiragana(nextStation.nameK));
            adjustFontSize(nextStation.nameK);
            fadeIn();
          }, HEADER_CONTENT_TRANSITION_DELAY);
        }
        break;
      case 'CURRENT':
        if (prevState !== 'CURRENT') {
          fadeOut();
        }
        setTimeout(() => {
          setStateText('ただいま');
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
          setStateText('ただいま');
          setStationText(katakanaToHiragana(station.nameK));
          adjustFontSize(station.nameK);
          fadeIn();
        }, HEADER_CONTENT_TRANSITION_DELAY);
        break;
      case 'NEXT':
        if (nextStation) {
          fadeOut();
          setTimeout(() => {
            setStateText('次は');
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
            setStateText('つぎは');
            setStationText(katakanaToHiragana(nextStation.nameK));
            adjustFontSize(nextStation.nameK);
            fadeIn();
          }, HEADER_CONTENT_TRANSITION_DELAY);
        }
        break;
    }
    setPrevState(state);
  }, [state, nextStation, boundStation, station]);

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
      width: screenWidth / 4,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    stationName: {
      flex: 1,
      fontSize: stationNameFontSize,
      marginRight: screenWidth / 6,
      fontWeight: 'bold',
      textAlign: 'center',
    },
    divider: {
      width: screenWidth,
      backgroundColor: line ? `#${line.lineColorC}` : '#b5b5ac',
      height: 4,
    },
  });

  return (
    <View>
      <LinearGradient
        colors={['#fdfbfb', '#ebedee']}
        style={styles.gradientRoot}
      >
        <View>
          <Text style={styles.bound}>{boundText}</Text>
        </View>
        <Animated.View style={[{ opacity: bottomFadeAnim }, styles.bottom]}>
          <Text style={styles.state}>{stateText}</Text>
          <Text style={styles.stationName}>{stationText}</Text>
        </Animated.View>
      </LinearGradient>
      <View style={styles.divider} />
    </View>
  );
};

export default Header;
