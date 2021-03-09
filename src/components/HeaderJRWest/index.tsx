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
  const [stationNameFontSize, setStationNameFontSize] = useState(
    isPad ? 48 : 32
  );
  const [boundStationNameFontSize, setBoundStationNameFontSize] = useState(32);
  const { headerState, trainType } = useRecoilValue(navigationState);

  const boundStationNameLineHeight =
    Platform.OS === 'android'
      ? boundStationNameFontSize + 8
      : boundStationNameFontSize;

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
        } else {
          setStationNameFontSize(64);
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
        setBoundStationNameFontSize(32);
      } else if (stationName.length >= 5) {
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

  const boundLightHeight = ((): number => {
    if (isPad) {
      return boundStationNameLineHeight;
    }
    if (Platform.OS === 'android') {
      return boundStationNameFontSize + 4;
    }
    return boundStationNameLineHeight;
  })();
  const boundForLightHeight = ((): number => {
    if (isPad) {
      return 32;
    }
    if (Platform.OS === 'android') {
      return 18 + 4;
    }
    return 18;
  })();
  const boundForLightHeightEn = ((): number => {
    if (isPad) {
      return 32;
    }
    if (Platform.OS === 'android') {
      return 24 + 4;
    }
    return 24;
  })();

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
      lineHeight: boundLightHeight,
    },
    boundFor: {
      fontSize: isPad ? 32 : 18,
      color: '#aaa',
      fontWeight: 'bold',
      lineHeight: boundForLightHeight,
    },
    boundForEn: {
      fontSize: isPad ? 32 : 24,
      color: '#aaa',
      textAlign: 'left',
      fontWeight: 'bold',
      lineHeight: boundForLightHeightEn,
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
      width: '20%',
      top: 32,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      left: 32,
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
      width: '100%',
      height: isPad ? 54 : 36,
    },
  });

  const mark = line && getLineMark(line);

  const fetchJRWLocalLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/local.png')
        : require('../../../assets/jrwest/local_en.png'),
    [headerState]
  );
  const fetchJRWRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/rapid.png')
        : require('../../../assets/jrwest/rapid_en.png'),
    [headerState]
  );
  const fetchJRWSpecialRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/specialrapid.png')
        : require('../../../assets/jrwest/specialrapid_en.png'),
    [headerState]
  );
  const fetchJRWExpressLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/express.png')
        : require('../../../assets/jrwest/express_en.png'),
    [headerState]
  );
  const fetchJRWLtdExpressLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/ltdexpress.png')
        : require('../../../assets/jrwest/ltdexpress_en.png'),
    [headerState]
  );
  const fetchJRWRegionalRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/regionalrapid.png')
        : require('../../../assets/jrwest/regionalrapid_en.png'),
    [headerState]
  );
  const fetchJRWRegionalExpressLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/regionalexpress.png')
        : require('../../../assets/jrwest/regionalexpress_en.png'),
    [headerState]
  );
  const fetchJRWKansaiAirportRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/kansaiairportrapid.png')
        : require('../../../assets/jrwest/kansaiairportrapid_en.png'),
    [headerState]
  );
  const fetchJRWKishujiRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/kishujirapid.png')
        : require('../../../assets/jrwest/kishujirapid_en.png'),
    [headerState]
  );
  const fetchJRWMiyakojiRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/miyakojirapid.png')
        : require('../../../assets/jrwest/miyakojirapid_en.png'),
    [headerState]
  );
  const fetchJRWYamatojiRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/miyakojirapid.png')
        : require('../../../assets/jrwest/miyakojirapid_en.png'),
    [headerState]
  );
  const fetchKeikyuAPLtdExpressRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/keikyuairportltdexpress.png')
        : require('../../../assets/jrwest/keikyuairportltdexpress_en.png'),
    [headerState]
  );
  const fetchKeikyuAPExpressRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/keikyuairtportexpress.png')
        : require('../../../assets/jrwest/keikyuairtportexpress_en.png'),
    [headerState]
  );
  const fetchKeikyuLtdExpressRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/keikyultdexpress.png')
        : require('../../../assets/jrwest/keikyultdexpress_en.png'),
    [headerState]
  );
  const fetchJRESpecialRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/jrespecialrapid.png')
        : require('../../../assets/jrwest/jrespecialrapid_en.png'),
    [headerState]
  );
  const fetchJRECommuterRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/jrecommuterrapid.png')
        : require('../../../assets/jrwest/jrecommuterrapid_en.png'),
    [headerState]
  );
  const fetchJRECommuterSpecialRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/jrecommuterspecialrapid.png')
        : require('../../../assets/jrwest/jrecommuterspecialrapid_en.png'),
    [headerState]
  );
  const fetchJRWDirectRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/directrapid.png')
        : require('../../../assets/jrwest/directrapid_en.png'),
    [headerState]
  );
  const fetchJREChuoLineSpecialRapidLogo = useCallback(
    (): unknown =>
      !headerState.endsWith('_EN')
        ? require('../../../assets/jrwest/jrechuolinespecialrapid.png')
        : require('../../../assets/jrwest/jrechuolinespecialrapid_en.png'),
    [headerState]
  );

  const trainTypeName = trainType?.name.replace(parenthesisRegexp, '') || '';

  const trainTypeImage = useMemo(() => {
    switch (trainTypeName) {
      case '急行':
        return fetchJRWExpressLogo();
      case '特急':
        return fetchJRWLtdExpressLogo();
      case '区間快速':
        return fetchJRWRegionalRapidLogo();
      case '区間急行':
        return fetchJRWRegionalExpressLogo();
      case '関空快速':
        return fetchJRWKansaiAirportRapidLogo();
      case '紀州路快速':
        return fetchJRWKishujiRapidLogo();
      case 'みやこ路快速':
        return fetchJRWMiyakojiRapidLogo();
      case '大和路快速':
        return fetchJRWYamatojiRapidLogo();
      case '快特':
        return fetchKeikyuLtdExpressRapidLogo();
      case 'エアポート快特':
        return fetchKeikyuAPLtdExpressRapidLogo();
      case 'エアポート急行':
        return fetchKeikyuAPExpressRapidLogo();
      case '特別快速':
        return fetchJRESpecialRapidLogo();
      case '通勤快速':
        return fetchJRECommuterRapidLogo();
      case '通勤特快':
        return fetchJRECommuterSpecialRapidLogo();
      case '直通快速':
        return fetchJRWDirectRapidLogo();
      case '新快速':
        return fetchJRWSpecialRapidLogo();
      default:
        break;
    }
    if (
      // 200~299 JR特急
      // 500~599 私鉄特急
      (trainType?.id >= 200 && trainType?.id < 300) ||
      (trainType?.id >= 500 && trainType?.id < 600)
    ) {
      return fetchJRWLtdExpressLogo();
    }
    if (trainTypeName.includes('特快')) {
      return fetchJREChuoLineSpecialRapidLogo();
    }
    if (trainTypeName.includes('特急')) {
      return fetchJRWLtdExpressLogo();
    }
    if (trainTypeName.includes('急')) {
      return fetchJRWExpressLogo();
    }
    if (
      trainTypeName.includes('ライナー') ||
      trainTypeName.includes('ウィング号')
    ) {
      return fetchJRWExpressLogo();
    }
    if (
      getTrainType(line, station, lineDirection) === 'rapid' ||
      trainTypeName.endsWith('快速')
    ) {
      return fetchJRWRapidLogo();
    }
    return fetchJRWLocalLogo();
  }, [
    fetchJREChuoLineSpecialRapidLogo,
    fetchJRECommuterRapidLogo,
    fetchJRECommuterSpecialRapidLogo,
    fetchJRESpecialRapidLogo,
    fetchJRWDirectRapidLogo,
    fetchJRWExpressLogo,
    fetchJRWKansaiAirportRapidLogo,
    fetchJRWKishujiRapidLogo,
    fetchJRWLocalLogo,
    fetchJRWLtdExpressLogo,
    fetchJRWMiyakojiRapidLogo,
    fetchJRWRapidLogo,
    fetchJRWRegionalExpressLogo,
    fetchJRWRegionalRapidLogo,
    fetchJRWSpecialRapidLogo,
    fetchJRWYamatojiRapidLogo,
    fetchKeikyuAPExpressRapidLogo,
    fetchKeikyuAPLtdExpressRapidLogo,
    fetchKeikyuLtdExpressRapidLogo,
    line,
    lineDirection,
    station,
    trainType,
    trainTypeName,
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
