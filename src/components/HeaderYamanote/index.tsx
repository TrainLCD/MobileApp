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
import { RFValue } from 'react-native-responsive-fontsize';
import {
  HeaderLangState,
  HeaderTransitionState,
} from '../../models/HeaderTransitionState';
import { CommonHeaderProps } from '../Header/common';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import useValueRef from '../../hooks/useValueRef';
import { isJapanese, translate } from '../../translation';
import navigationState from '../../store/atoms/navigation';
import {
  inboundStationForLoopLine,
  getIsLoopLine,
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
  const [stationNameFontSize, setStationNameFontSize] = useState(32);
  const [boundStationNameFontSize, setBoundStationNameFontSize] = useState(28);
  const { headerState, trainType } = useRecoilValue(navigationState);

  const prevStateRef = useValueRef(prevState);

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? !trainType && line.id === 11623 : undefined;

  const adjustFontSize = useCallback(
    (stationName: string, en?: boolean): void => {
      if (en) {
        setStationNameFontSize(32);
        return;
      }
      if (stationName.length >= 10) {
        setStationNameFontSize(24);
      } else {
        setStationNameFontSize(32);
      }
    },
    []
  );
  const adjustBoundFontSize = useCallback((stationName: string): void => {
    if (stationName.length >= 10) {
      setBoundStationNameFontSize(18);
    } else if (stationName.length >= 5) {
      setBoundStationNameFontSize(21);
    } else {
      setBoundStationNameFontSize(26);
    }
  }, []);

  const headerLangState = headerState.split('_')[1] as HeaderLangState;

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
              headerLangState
            ).boundFor
          : outboundStationForLoopLine(
              stations,
              currentIndex,
              line,
              headerLangState
            ).boundFor
      );
    } else {
      const boundStationName = (() => {
        switch (headerLangState) {
          case 'EN':
            return boundStation.nameR;
          case 'ZH':
            return boundStation.nameZh;
          case 'KO':
            return boundStation.nameKo;
          default:
            return boundStation.name;
        }
      })();

      setBoundText(boundStationName);
    }

    switch (state) {
      case 'ARRIVING':
        if (nextStation) {
          setStateText(translate('soon'));
          setStationText(nextStation.name);
          adjustFontSize(nextStation.name);
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          setStateText(translate('soon'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustFontSize(katakanaToHiragana(nextStation.nameK));
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          setStateText(translate('soonEn'));
          setStationText(nextStation.nameR);
          adjustFontSize(nextStation.nameR, true);
        }
        break;
      case 'ARRIVING_ZH':
        if (nextStation?.nameZh) {
          setStateText(translate('soonZh'));
          setStationText(nextStation.nameZh);
          adjustFontSize(nextStation.nameZh);
        }
        break;
      case 'ARRIVING_KO':
        if (nextStation?.nameKo) {
          setStateText(translate('soonKo'));
          setStationText(nextStation.nameKo);
          adjustFontSize(nextStation.nameKo);
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
        setStateText('');
        setStationText(station.nameR);
        adjustFontSize(station.nameR, true);
        break;
      case 'CURRENT_ZH':
        if (!station.nameZh) {
          break;
        }
        setStateText('');
        setStationText(station.nameZh);
        adjustFontSize(station.nameZh);
        break;
      case 'CURRENT_KO':
        if (!station.nameKo) {
          break;
        }
        setStateText('');
        setStationText(station.nameKo);
        adjustFontSize(station.nameKo);
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
    headerLangState,
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
      fontSize: RFValue(boundStationNameFontSize),
    },
    boundFor: {
      fontSize: RFValue(18),
      color: '#aaa',
    },
    boundForJa: {
      fontSize: RFValue(18),
      fontWeight: 'bold',
      color: '#fff',
      marginTop: 4,
    },
    stationName: {
      fontSize: RFValue(stationNameFontSize),
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
      fontSize: RFValue(21),
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

  const boundPrefix = (() => {
    switch (headerLangState) {
      case 'EN':
        return 'Bound for';
      case 'ZH':
        return '开往';
      default:
        return '';
    }
  })();
  const boundSuffix = (() => {
    switch (headerLangState) {
      case 'EN':
        return '';
      case 'ZH':
        return '';
      case 'KO':
        return '행';
      default:
        return getIsLoopLine(line, trainType) ? '方面' : 'ゆき';
    }
  })();

  return (
    <View>
      <LinearGradient
        colors={['#222222', '#212121']}
        style={styles.gradientRoot}
      >
        <View style={styles.left}>
          {boundPrefix !== '' && boundStation && (
            <Text style={styles.boundFor}>{boundPrefix}</Text>
          )}
          <Text style={styles.bound}>{boundText}</Text>
          {boundSuffix !== '' && boundStation && (
            <Text style={styles.boundForJa}>{boundSuffix}</Text>
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

export default HeaderYamanote;
