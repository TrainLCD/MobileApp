/* eslint-disable global-require */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  PlatformIOSStatic,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useRecoilValue } from 'recoil';
import { CommonHeaderProps } from '../Header/common';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import {
  isYamanoteLine,
  inboundStationForLoopLine,
  outboundStationForLoopLine,
} from '../../utils/loopLine';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import { getLineMark } from '../../lineMark';
import TransferLineMark from '../TransferLineMark';
import { translate } from '../../translation';
import getTrainType from '../../utils/getTrainType';
import navigationState from '../../store/atoms/navigation';
import { parenthesisRegexp } from '../../constants/regexp';

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
  const [stateText, setStateText] = useState(translate('nowStoppingAt'));
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const [stationNameFontSize, setStationNameFontSize] = useState<number>();
  const [boundStationNameFontSize, setBoundStationNameFontSize] = useState(32);
  const { headerState, trainType } = useRecoilValue(navigationState);

  const boundStationNameLineHeight =
    Platform.OS === 'android'
      ? boundStationNameFontSize + 8
      : boundStationNameFontSize;

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? !trainType && line.id === 11623 : undefined;

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
      if (stationName.length >= 5) {
        setBoundStationNameFontSize(38);
      } else {
        setBoundStationNameFontSize(48);
      }
      return;
    }

    if (stationName.length >= 10) {
      setBoundStationNameFontSize(21);
    } else if (stationName.length >= 5) {
      setBoundStationNameFontSize(24);
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
        !headerState.endsWith('_EN') ? boundStation.name : boundStation.nameR
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
          adjustFontSize(nextStation.nameR);
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
        setStateText(translate('nowStoppingAt'));
        setStationText(station.nameR);
        adjustFontSize(station.nameR);
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
          adjustFontSize(nextStation.nameR);
        }
        break;
      default:
        break;
    }
  }, [
    adjustBoundFontSize,
    adjustFontSize,
    boundStation,
    headerState,
    line,
    lineDirection,
    nextStation,
    osakaLoopLine,
    state,
    station,
    stations,
    yamanoteLine,
  ]);

  const styles = StyleSheet.create({
    gradientRoot: {
      paddingRight: 21,
      paddingLeft: 21,
      overflow: 'hidden',
      height: isPad ? 210 : 150,
      flexDirection: 'row',
    },
    bound: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: boundStationNameFontSize,
      lineHeight: isPad ? undefined : boundStationNameLineHeight,
    },
    boundFor: {
      fontSize: isPad ? 32 : 18,
      color: '#aaa',
      fontWeight: 'bold',
      marginTop: 4,
    },
    boundForEn: {
      fontSize: isPad ? 32 : 24,
      color: '#aaa',
      textAlign: 'left',
      fontWeight: 'bold',
    },
    stationName: {
      textAlign: 'center',
      fontSize: stationNameFontSize,
      fontWeight: 'bold',
      color: '#fff',
      marginTop: 64,
    },
    top: {
      position: 'absolute',
      flex: 0.3,
      top: 32,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 16,
    },
    left: {
      flex: 0.3,
      justifyContent: 'center',
      height: isPad ? 200 : 120,
      marginTop: 48,
      marginRight: 32,
    },
    right: {
      flex: 1,
      justifyContent: 'center',
      alignContent: 'flex-end',
      height: isPad ? 200 : 150,
    },
    state: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: isPad ? 32 : 24,
      position: 'absolute',
      top: 32,
    },
    localLogo: {
      width: isPad ? 120 : 80,
      height: isPad ? 54 : 36,
    },
  });

  const mark = line && getLineMark(line);

  const fetchJRWLocalLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../assets/images/jrw_local.png')
        : require('../../assets/images/jrw_local_en.png'),
    [headerState]
  );
  const fetchJRWRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../assets/images/jrw_rapid.png')
        : require('../../assets/images/jrw_rapid_en.png'),
    [headerState]
  );
  const fetchJRWSpecialRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../assets/images/jrw_specialrapid.png')
        : require('../../assets/images/jrw_specialrapid_en.png'),
    [headerState]
  );

  const trainTypeImage = useMemo(() => {
    if (trainType?.name === '新快速') {
      return fetchJRWSpecialRapidLogo();
    }
    if (
      getTrainType(line, station, lineDirection) === 'rapid' ||
      trainType?.name.replace(parenthesisRegexp, '').endsWith('快速')
    ) {
      return fetchJRWRapidLogo();
    }
    return fetchJRWLocalLogo();
  }, [
    fetchJRWLocalLogo,
    fetchJRWRapidLogo,
    fetchJRWSpecialRapidLogo,
    line,
    lineDirection,
    station,
    trainType,
  ]);

  return (
    <View>
      <LinearGradient
        colors={['#222222', '#212121']}
        style={styles.gradientRoot}
      >
        <View style={styles.top}>
          {mark && mark.sign ? (
            <TransferLineMark white line={line} mark={mark} />
          ) : null}
          {line ? (
            <FastImage style={styles.localLogo} source={trainTypeImage} />
          ) : null}
        </View>
        <View style={styles.left}>
          {headerState.endsWith('_EN') && boundStation && (
            <Text style={styles.boundForEn}>for</Text>
          )}
          <Text style={styles.bound}>{boundText}</Text>
          {!headerState.endsWith('_EN') && boundStation && (
            <Text style={styles.boundFor}>方面</Text>
          )}
        </View>

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

export default React.memo(HeaderJRWest);
