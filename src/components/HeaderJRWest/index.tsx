/* eslint-disable global-require */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  PlatformIOSStatic,
  Image,
} from 'react-native';
import { useRecoilValue } from 'recoil';
import { RFValue } from 'react-native-responsive-fontsize';
import { CommonHeaderProps } from '../Header/common';
import katakanaToHiragana from '../../utils/kanaToHiragana';
import {
  isYamanoteLine,
  inboundStationForLoopLine,
  outboundStationForLoopLine,
  isLoopLine,
} from '../../utils/loopLine';
import getCurrentStationIndex from '../../utils/currentStationIndex';
import { getLineMark } from '../../lineMark';
import TransferLineMark from '../TransferLineMark';
import { translate } from '../../translation';
import getTrainType from '../../utils/getTrainType';
import navigationState from '../../store/atoms/navigation';
import { parenthesisRegexp } from '../../constants/regexp';
import { HeaderLangState } from '../../models/HeaderTransitionState';
import { LineType } from '../../models/StationAPI';

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
  const [stationNameFontSize, setStationNameFontSize] = useState(38);
  const { headerState, trainType } = useRecoilValue(navigationState);

  const boundStationNameLineHeight = Platform.OS === 'android' ? 21 + 8 : 21;

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? !trainType && line.id === 11623 : undefined;

  const adjustFontSize = useCallback(
    (stationName: string, en?: boolean): void => {
      if (en) {
        if (stationName.length <= 30) {
          setStationNameFontSize(38);
        } else {
          setStationNameFontSize(24);
        }
        return;
      }
      if (stationName.length >= 10) {
        setStationNameFontSize(32);
      } else {
        setStationNameFontSize(38);
      }
    },
    []
  );

  const headerLangState = headerState.split('_')[1] as HeaderLangState;
  const boundPrefix = (() => {
    switch (headerLangState) {
      case 'EN':
        return 'for';
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
        return isLoopLine(line) ? '方面' : 'ゆき';
    }
  })();

  useEffect(() => {
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
      case 'NEXT_ZH':
        if (nextStation?.nameZh) {
          setStateText(translate('nextZh'));
          setStationText(nextStation.nameZh);
          adjustFontSize(nextStation.nameZh);
        }
        break;
      case 'NEXT_KO':
        if (nextStation?.nameKo) {
          setStateText(translate('nextKo'));
          setStationText(nextStation.nameKo);
          adjustFontSize(nextStation.nameKo);
        }
        break;
      default:
        break;
    }
  }, [
    adjustFontSize,
    boundStation,
    headerLangState,
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
    if (Platform.OS === 'android') {
      return 21 + 8;
    }
    return boundStationNameLineHeight;
  })();
  const boundForLightHeight = ((): number => {
    if (Platform.OS === 'android') {
      return 18 + 8;
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
      fontSize: RFValue(21),
      lineHeight: RFValue(boundLightHeight),
    },
    boundFor: {
      fontSize: isPad ? 32 : 18,
      color: '#aaa',
      fontWeight: 'bold',
      lineHeight: RFValue(boundForLightHeight),
    },
    boundForEn: {
      fontSize: RFValue(21),
      color: '#aaa',
      textAlign: 'left',
      fontWeight: 'bold',
      lineHeight: RFValue(boundForLightHeightEn),
    },
    stationName: {
      textAlign: 'center',
      fontSize: RFValue(stationNameFontSize),
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
      fontSize: RFValue(21),
      position: 'absolute',
      top: 32,
    },
    localLogo: {
      width: '100%',
      height: RFValue(36),
    },
  });

  const mark = line && getLineMark(line);

  const fetchJRWLocalLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/local_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/local_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/local_ko.png');
      default:
        return require('../../../assets/jrwest/local.png');
    }
  }, [headerLangState]);

  const fetchJRWRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/rapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/rapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/rapid_ko.png');
      default:
        return require('../../../assets/jrwest/rapid.png');
    }
  }, [headerLangState]);
  const fetchJRWSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/specialrapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/specialrapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/specialrapid_ko.png');
      default:
        return require('../../../assets/jrwest/specialrapid.png');
    }
  }, [headerLangState]);
  const fetchJRWExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/express_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/express_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/express_ko.png');
      default:
        return require('../../../assets/jrwest/express.png');
    }
  }, [headerLangState]);
  const fetchJRWLtdExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/ltdexpress_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/ltdexpress_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/ltdexpress_ko.png');
      default:
        return require('../../../assets/jrwest/ltdexpress.png');
    }
  }, [headerLangState]);
  const fetchJRWRegionalRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/regionalrapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/regionalrapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/regionalrapid_ko.png');
      default:
        return require('../../../assets/jrwest/regionalrapid.png');
    }
  }, [headerLangState]);
  const fetchJRWRegionalExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/regionalexpress_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/regionalexpress_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/regionalexpress_ko.png');
      default:
        return require('../../../assets/jrwest/regionalexpress.png');
    }
  }, [headerLangState]);
  const fetchJRWKansaiAirportRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/kansaiairportrapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/kansaiairportrapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/kansaiairportrapid_ko.png');
      default:
        return require('../../../assets/jrwest/kansaiairportrapid.png');
    }
  }, [headerLangState]);
  const fetchJRWKishujiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/kishujirapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/kishujirapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/kishujirapid_ko.png');
      default:
        return require('../../../assets/jrwest/kishujirapid.png');
    }
  }, [headerLangState]);
  const fetchJRWMiyakojiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/miyakojirapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/miyakojirapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/miyakojirapid_ko.png');
      default:
        return require('../../../assets/jrwest/miyakojirapid.png');
    }
  }, [headerLangState]);
  const fetchJRWYamatojiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/yamatojirapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/yamatojirapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/yamatojirapid_ko.png');
      default:
        return require('../../../assets/jrwest/yamatojirapid.png');
    }
  }, [headerLangState]);
  const fetchKeikyuAPLtdExpressRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/keikyuairportltdexpress_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/keikyuairportltdexpress_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/keikyuairportltdexpress_ko.png');
      default:
        return require('../../../assets/jrwest/keikyuairportltdexpress.png');
    }
  }, [headerLangState]);
  const fetchKeikyuAPExpressRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/keikyuairtportexpress_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/keikyuairtportexpress_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/keikyuairtportexpress_ko.png');
      default:
        return require('../../../assets/jrwest/keikyuairtportexpress.png');
    }
  }, [headerLangState]);
  const fetchKeikyuLtdExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/keikyultdexpress_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/keikyultdexpress_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/keikyultdexpress_ko.png');
      default:
        return require('../../../assets/jrwest/keikyultdexpress.png');
    }
  }, [headerLangState]);
  const fetchJRESpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/jrespecialrapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/jrespecialrapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/jrespecialrapid_ko.png');
      default:
        return require('../../../assets/jrwest/jrespecialrapid.png');
    }
  }, [headerLangState]);
  const fetchJRECommuterRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/jrecommuterrapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/jrecommuterrapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/jrecommuterrapid_ko.png');
      default:
        return require('../../../assets/jrwest/jrecommuterrapid.png');
    }
  }, [headerLangState]);
  const fetchJRECommuterSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/jrecommuterspecialrapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/jrecommuterspecialrapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/jrecommuterspecialrapid_ko.png');
      default:
        return require('../../../assets/jrwest/jrecommuterspecialrapid.png');
    }
  }, [headerLangState]);
  const fetchJRWDirectRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/directrapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/directrapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/directrapid_ko.png');
      default:
        return require('../../../assets/jrwest/directrapid.png');
    }
  }, [headerLangState]);
  const fetchJREChuoLineSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../../assets/jrwest/jrechuolinespecialrapid_en.png');
      case 'ZH':
        return require('../../../assets/jrwest/jrechuolinespecialrapid_zh.png');
      case 'KO':
        return require('../../../assets/jrwest/jrechuolinespecialrapid_ko.png');
      default:
        return require('../../../assets/jrwest/jrechuolinespecialrapid.png');
    }
  }, [headerLangState]);

  const trainTypeName = trainType?.name.replace(parenthesisRegexp, '') || '';

  const trainTypeImage = useMemo((): number => {
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
        return fetchKeikyuLtdExpressLogo();
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
      (trainType?.id >= 500 && trainType?.id < 600) ||
      line?.lineType === LineType.BulletTrain
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
    fetchKeikyuLtdExpressLogo,
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
            <Image style={styles.localLogo} source={trainTypeImage} />
          ) : null}
        </View>
        <View style={styles.left}>
          {boundPrefix !== '' && boundStation && (
            <Text style={styles.boundForEn}>{boundPrefix}</Text>
          )}
          <Text style={styles.bound}>{boundText}</Text>
          {boundSuffix !== '' && boundStation && (
            <Text style={styles.boundFor}>{boundSuffix}</Text>
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

export default HeaderJRWest;
