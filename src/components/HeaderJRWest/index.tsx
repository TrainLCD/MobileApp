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
import stationState from '../../store/atoms/station';

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
  const [boundStationNameFontSize, setBoundStationNameFontSize] = useState(21);
  const { headerState, trainType } = useRecoilValue(navigationState);
  const { selectedBound } = useRecoilValue(stationState);

  const boundStationNameLineHeight =
    Platform.OS === 'android'
      ? boundStationNameFontSize + 8
      : boundStationNameFontSize;

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? !trainType && line.id === 11623 : undefined;

  const adjustFontSize = useCallback(
    (stationName: string, en?: boolean): void => {
      if (en) {
        setStationNameFontSize(32);
        return;
      }
      if (stationName.length >= 15) {
        setStationNameFontSize(32);
      } else {
        setStationNameFontSize(38);
      }
    },
    []
  );

  const adjustBoundFontSize = useCallback((stationName: string): void => {
    if (stationName.length >= 10) {
      setBoundStationNameFontSize(14);
    } else {
      setBoundStationNameFontSize(21);
    }
  }, []);

  const headerLangState = headerState.split('_')[1] as HeaderLangState;
  const boundPrefix = (() => {
    switch (headerLangState) {
      case 'EN':
        return 'for ';
      case 'ZH':
        return '开往 ';
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
        return ' 행';
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
      case 'ARRIVING_ZH':
        if (nextStation?.nameZh) {
          setStateText(translate('arrivingAtZh'));
          setStationText(nextStation.nameZh);
          adjustFontSize(nextStation.nameZh);
        }
        break;
      case 'ARRIVING_KO':
        if (nextStation?.nameKo) {
          setStateText(translate('arrivingAtKo'));
          setStationText(nextStation.nameKo);
          adjustFontSize(nextStation.nameKo);
        }
        break;
      case 'CURRENT':
        if (selectedBound) {
          setStateText('');
          setStationText(selectedBound.name);
          adjustFontSize(selectedBound.name);
          break;
        }

        setStateText('');
        setStationText(station.name);
        adjustFontSize(station.name);
        break;
      case 'CURRENT_KANA':
        if (selectedBound) {
          setStateText('');
          setStationText(katakanaToHiragana(selectedBound.nameK));
          adjustFontSize(katakanaToHiragana(selectedBound.nameK));
          break;
        }

        setStateText('');
        setStationText(katakanaToHiragana(station.nameK));
        adjustFontSize(katakanaToHiragana(station.nameK));
        break;
      case 'CURRENT_EN':
        if (selectedBound) {
          setStateText('Bound for');
          setStationText(selectedBound.nameR);
          adjustFontSize(selectedBound.nameR, true);
          break;
        }

        setStateText('');
        setStationText(station.nameR);
        adjustFontSize(station.nameR, true);
        break;
      case 'CURRENT_ZH':
        if (!station.nameZh) {
          break;
        }
        if (selectedBound) {
          setStateText('开往');
          setStationText(selectedBound.nameZh);
          adjustFontSize(selectedBound.nameZh);
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
        if (selectedBound) {
          setStateText('');
          setStationText(selectedBound.nameKo);
          adjustFontSize(selectedBound.nameKo);
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
    adjustBoundFontSize,
    adjustFontSize,
    boundStation,
    headerLangState,
    headerState,
    line,
    lineDirection,
    nextStation,
    osakaLoopLine,
    selectedBound,
    state,
    station,
    stations,
    yamanoteLine,
  ]);

  const boundLightHeight = ((): number => {
    if (Platform.OS === 'android') {
      return boundStationNameFontSize + 8;
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
      fontSize: RFValue(boundStationNameFontSize),
      lineHeight: RFValue(boundLightHeight),
      marginTop: 8,
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
      fontWeight: 'bold',
      lineHeight: RFValue(boundForLightHeightEn),
    },
    stationName: {
      textAlign: 'center',
      fontSize: RFValue(stationNameFontSize),
      fontWeight: 'bold',
      color: '#2266b7',
    },
    top: {
      position: 'absolute',
      width: '20%',
      top: 16,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      left: 32,
    },
    left: {
      flex: 0.2,
      justifyContent: 'center',
      alignItems: 'flex-end',
      height: isPad ? 200 : 120,
      marginTop: 64,
      marginRight: 32,
    },
    right: {
      flex: 1,
      justifyContent: 'center',
      alignContent: 'flex-end',
      height: isPad ? 200 : 150,
    },
    localLogo: {
      width: '100%',
      height: RFValue(36),
    },
    stationNameContainer: {
      backgroundColor: 'white',
      height: isPad ? 150 : 100,
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
      borderRadius: 8,
    },
    stationNameAndSuffix: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: isPad ? undefined : 8,
      flex: 1,
      width: '100%',
    },
    stationNameSuffix: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: RFValue(21),
      marginLeft: 16,
      width: 128,
    },
  });

  const mark = line && getLineMark(line);

  const fetchJRWLocalLogo = useCallback((): unknown => {
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
  const fetchJRWRapidLogo = useCallback((): unknown => {
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
  const fetchJRWSpecialRapidLogo = useCallback((): unknown => {
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
  const fetchJRWExpressLogo = useCallback((): unknown => {
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
  const fetchJRWLtdExpressLogo = useCallback((): unknown => {
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
  const fetchJRWRegionalRapidLogo = useCallback((): unknown => {
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
  const fetchJRWRegionalExpressLogo = useCallback((): unknown => {
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
  const fetchJRWKansaiAirportRapidLogo = useCallback((): unknown => {
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
  const fetchJRWKishujiRapidLogo = useCallback((): unknown => {
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
  const fetchJRWMiyakojiRapidLogo = useCallback((): unknown => {
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
  const fetchJRWYamatojiRapidLogo = useCallback((): unknown => {
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
  const fetchKeikyuAPLtdExpressRapidLogo = useCallback((): unknown => {
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
  const fetchKeikyuAPExpressRapidLogo = useCallback((): unknown => {
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
  const fetchKeikyuLtdExpressLogo = useCallback((): unknown => {
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
  const fetchJRESpecialRapidLogo = useCallback((): unknown => {
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
  const fetchJRECommuterRapidLogo = useCallback((): unknown => {
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
  const fetchJRECommuterSpecialRapidLogo = useCallback((): unknown => {
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
  const fetchJRWDirectRapidLogo = useCallback((): unknown => {
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
  const fetchJREChuoLineSpecialRapidLogo = useCallback((): unknown => {
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

  const isJaState =
    !headerState.split('_')[1] || headerState.split('_')[1] === 'KANA';

  const rightText = (() => {
    if (headerState.split('_')[0] === 'CURRENT' && selectedBound) {
      return boundSuffix;
    }

    if (!selectedBound) {
      return '';
    }

    return isJaState ? 'です' : '';
  })();

  return (
    <View>
      <LinearGradient
        colors={['#222222', '#212121']}
        style={styles.gradientRoot}
      >
        <View style={[styles.top, mark?.subSign ? { left: 58 } : undefined]}>
          {mark?.sign ? (
            <TransferLineMark white line={line} mark={mark} />
          ) : null}
          {line ? (
            <FastImage style={styles.localLogo} source={trainTypeImage} />
          ) : null}
        </View>
        <View style={[styles.left, mark?.subSign ? { flex: 0.3 } : undefined]}>
          <Text style={styles.bound}>{stateText}</Text>
        </View>

        {stationNameFontSize && (
          <View style={styles.right}>
            <Text style={styles.bound}>
              {boundPrefix !== '' && boundStation && boundPrefix}
              {boundText}
              {boundSuffix !== '' && boundStation && boundSuffix}
            </Text>
            <View style={styles.stationNameAndSuffix}>
              <View style={styles.stationNameContainer}>
                <Text style={styles.stationName}>{stationText}</Text>
              </View>
              <Text style={styles.stationNameSuffix}>{rightText}</Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

export default HeaderJRWest;
