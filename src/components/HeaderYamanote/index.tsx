import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  PlatformIOSStatic,
} from 'react-native';
import { useRecoilValue } from 'recoil';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { CommonHeaderProps } from '../Header/common';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import useValueRef from '../../hooks/useValueRef';
import { isJapanese, translate } from '../../translation';
import navigationState from '../../store/atoms/navigation';
import {
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../../utils/loopLine';

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
  const { headerState, trainType } = useRecoilValue(navigationState);

  const prevStateRef = useValueRef(prevState);

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? !trainType && line.id === 11623 : undefined;

  const adjustFontSize = useCallback(
    (stationName: string, en?: boolean): void => {
      if (en) {
        return;
      }
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
    },
    []
  );
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

  useEffect(() => {
    if (boundStation) {
      adjustBoundFontSize(
        headerState.endsWith('_EN') ? boundStation.nameR : boundStation.name
      );
    }

    if (!line || !boundStation) {
      setBoundText('TrainLCD');
    } else if (yamanoteLine || osakaLoopLine) {
      const currentIndex = getCurrentStationIndex(stations, station);
      setBoundText(
        lineDirection === 'INBOUND'
          ? inboundStationForLoopLine(
              stations,
              currentIndex,
              line,
              !headerState.endsWith('_EN')
            ).boundFor
          : outboundStationForLoopLine(
              stations,
              currentIndex,
              line,
              !headerState.endsWith('_EN')
            ).boundFor
      );
    } else {
      setBoundText(
        headerState.endsWith('_EN') ? boundStation.nameR : boundStation.name
      );
    }

    switch (state) {
      case 'ARRIVING':
        if (nextStation) {
          setStateText(translate('arrivingAt'));
          setStationText(nextStation.name);
          adjustFontSize(nextStation.name);
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          setStateText(translate('arrivingAt'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustFontSize(katakanaToHiragana(nextStation.nameK));
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          setStateText(translate('arrivingAtEn'));
          setStationText(nextStation.nameR);
          adjustFontSize(nextStation.nameR, true);
        }
        break;
      case 'CURRENT':
        setStateText(translate('nowStoppingAt'));
        setStationText(station.name);
        adjustFontSize(station.name);
        break;
      case 'CURRENT_KANA':
        setStateText(translate('nowStoppingAt'));
        setStationText(katakanaToHiragana(station.nameK));
        adjustFontSize(katakanaToHiragana(station.nameK));
        break;
      case 'CURRENT_EN':
        setStateText(translate('nowStoppingAtEn'));
        setStationText(station.nameR);
        adjustFontSize(station.nameR, true);
        break;
      case 'NEXT':
        if (nextStation) {
          setStateText(translate('next'));
          setStationText(nextStation.name);
          adjustFontSize(nextStation.name);
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          setStateText(translate('nextKana'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustFontSize(katakanaToHiragana(nextStation.nameK));
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          setStateText(translate('nextEn'));
          setStationText(nextStation.nameR);
          adjustFontSize(nextStation.nameR, true);
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
    adjustFontSize,
    prevStateRef,
    headerState,
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
    },
    boundFor: {
      fontSize: isPad ? 32 : 18,
      color: '#aaa',
    },
    boundForJa: {
      fontSize: isPad ? 32 : 18,
      fontWeight: 'bold',
      color: '#fff',
      marginTop: 4,
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
          {headerState.endsWith('_EN') && boundStation && (
            <Text style={styles.boundFor}>Bound for</Text>
          )}
          <Text style={styles.bound}>{boundText}</Text>
          {!headerState.endsWith('_EN') && boundStation && (
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
