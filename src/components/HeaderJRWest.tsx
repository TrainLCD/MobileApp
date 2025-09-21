/* eslint-disable global-require */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LineType, TrainTypeKind } from '~/gen/proto/stationapi_pb';
import {
  useBoundText,
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useGetLineMark,
  useIsNextLastStop,
  useNextStation,
  useNumbering,
} from '~/hooks';
import {
  NUMBERING_ICON_SIZE,
  parenthesisRegexp,
  STATION_NAME_FONT_SIZE,
} from '../constants';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import katakanaToHiragana from '../utils/kanaToHiragana';
import { getNumberingColor } from '../utils/numbering';
import { RFValue } from '../utils/rfValue';
import NumberingIcon from './NumberingIcon';
import TransferLineMark from './TransferLineMark';
import Typography from './Typography';

const HeaderJRWest: React.FC = () => {
  const { headerState } = useAtomValue(navigationState);
  const { selectedBound, arrived } = useAtomValue(stationState);
  const [stateText, setStateText] = useState(translate('nowStoppingAt'));
  const station = useCurrentStation();
  const currentLine = useCurrentLine();
  const boundStationNameList = useBoundText();

  const [stationText, setStationText] = useState(station?.name || '');
  const isLast = useIsNextLastStop();
  const nextStation = useNextStation();
  const trainType = useCurrentTrainType();

  const headerLangState = useMemo(
    () =>
      headerState.split('_')[1]?.length
        ? (headerState.split('_')[1] as HeaderLangState)
        : ('JA' as HeaderLangState),
    [headerState]
  );
  const boundText = boundStationNameList[headerLangState];

  useEffect(() => {
    if (!selectedBound && station) {
      setStateText(translate('nowStoppingAt'));
      setStationText(station.name);
    }

    switch (headerState) {
      case 'ARRIVING':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonLast' : 'soon'));
          setStationText(nextStation.name);
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonKanaLast' : 'soon'));
          setStationText(katakanaToHiragana(nextStation.nameKatakana));
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonEnLast' : 'soonEn'));
          setStationText(nextStation?.nameRoman ?? '');
        }
        break;
      case 'ARRIVING_ZH':
        if (nextStation?.nameChinese) {
          setStateText(translate(isLast ? 'soonZhLast' : 'soonZh'));
          setStationText(nextStation.nameChinese);
        }
        break;
      case 'ARRIVING_KO':
        if (nextStation?.nameKorean) {
          setStateText(translate(isLast ? 'soonKoLast' : 'soonKo'));
          setStationText(nextStation.nameKorean);
        }
        break;
      case 'CURRENT':
        if (station) {
          setStateText(translate('nowStoppingAt'));
          setStationText(station.name);
        }
        break;
      case 'CURRENT_KANA':
        if (station) {
          setStateText(translate('nowStoppingAt'));
          setStationText(katakanaToHiragana(station.nameKatakana));
        }
        break;
      case 'CURRENT_EN':
        if (station) {
          setStateText('');
          setStationText(station?.nameRoman ?? '');
        }
        break;
      case 'CURRENT_ZH':
        if (!station?.nameChinese) {
          break;
        }
        setStateText('');
        setStationText(station.nameChinese);
        break;
      case 'CURRENT_KO':
        if (!station?.nameKorean) {
          break;
        }
        setStateText('');
        setStationText(station.nameKorean);
        break;
      case 'NEXT':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextLast' : 'next'));
          setStationText(nextStation.name);
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextKanaLast' : 'nextKana'));
          setStationText(katakanaToHiragana(nextStation.nameKatakana));
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextEnLast' : 'nextEn'));
          setStationText(nextStation?.nameRoman ?? '');
        }
        break;
      case 'NEXT_ZH':
        if (nextStation?.nameChinese) {
          setStateText(translate(isLast ? 'nextZhLast' : 'nextZh'));
          setStationText(nextStation.nameChinese);
        }
        break;
      case 'NEXT_KO':
        if (nextStation?.nameKorean) {
          setStateText(translate(isLast ? 'nextKoLast' : 'nextKo'));
          setStationText(nextStation.nameKorean);
        }
        break;
      default:
        break;
    }
  }, [headerState, isLast, nextStation, selectedBound, station]);

  const styles = StyleSheet.create({
    gradientRoot: {
      paddingRight: 21,
      paddingLeft: 21,
      height: isTablet ? 210 : 150,
      flexDirection: 'row',
    },
    bound: {
      position: 'absolute',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: RFValue(24),
      top: 32,
      left: 32,
    },
    stationNameContainer: {
      marginLeft: isTablet ? 72 * 1.5 : 72,
      justifyContent: 'center',
      alignItems: 'center',
      height: STATION_NAME_FONT_SIZE * 2 - 24,
    },
    stationName: {
      textAlign: 'center',
      fontSize: STATION_NAME_FONT_SIZE,
      fontWeight: 'bold',
      color: '#fff',
    },
    top: {
      position: 'absolute',
      width: '20%',
      top: 24,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    left: {
      flex: 0.3,
      justifyContent: 'center',
      height: '100%',
      marginTop: 48,
    },
    right: {
      flex: 1,
      justifyContent: 'flex-end',
      alignContent: 'center',
      height: isTablet ? 200 : 150,
    },
    state: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: RFValue(24),
      textAlign: 'center',
      marginBottom: isTablet ? 0 : 12,
    },
    trainTypeImageContainer: {
      width: '100%',
      marginLeft: 4,
    },
    trainTypeImage: {
      height: '100%',
    },
    numberingContainer: {
      position: 'absolute',
      bottom: isTablet ? 0 : 8,
    },
    emptyNumbering: {
      width: isTablet ? 35 * 1.5 : 35,
      height: isTablet ? 35 * 1.5 : 35,
    },
  });

  const fetchJRWLocalLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/local_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/local_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/local_ko.webp');
      default:
        return require('../../assets/jrwest/local.webp');
    }
  }, [headerLangState]);

  const fetchJRWRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/rapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/rapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/rapid_ko.webp');
      default:
        return require('../../assets/jrwest/rapid.webp');
    }
  }, [headerLangState]);
  const fetchJRWSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/specialrapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/specialrapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/specialrapid_ko.webp');
      default:
        return require('../../assets/jrwest/specialrapid.webp');
    }
  }, [headerLangState]);
  const fetchJRWExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/express_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/express_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/express_ko.webp');
      default:
        return require('../../assets/jrwest/express.webp');
    }
  }, [headerLangState]);
  const fetchJRWLtdExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/ltdexpress_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/ltdexpress_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/ltdexpress_ko.webp');
      default:
        return require('../../assets/jrwest/ltdexpress.webp');
    }
  }, [headerLangState]);
  const fetchJRWRegionalRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/regionalrapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/regionalrapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/regionalrapid_ko.webp');
      default:
        return require('../../assets/jrwest/regionalrapid.webp');
    }
  }, [headerLangState]);
  const fetchJRWRegionalExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/regionalexpress_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/regionalexpress_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/regionalexpress_ko.webp');
      default:
        return require('../../assets/jrwest/regionalexpress.webp');
    }
  }, [headerLangState]);
  const fetchJRWKansaiAirportRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/kansaiairportrapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/kansaiairportrapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/kansaiairportrapid_ko.webp');
      default:
        return require('../../assets/jrwest/kansaiairportrapid.webp');
    }
  }, [headerLangState]);
  const fetchJRWKishujiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/kishujirapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/kishujirapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/kishujirapid_ko.webp');
      default:
        return require('../../assets/jrwest/kishujirapid.webp');
    }
  }, [headerLangState]);
  const fetchJRWMiyakojiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/miyakojirapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/miyakojirapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/miyakojirapid_ko.webp');
      default:
        return require('../../assets/jrwest/miyakojirapid.webp');
    }
  }, [headerLangState]);
  const fetchJRWYamatojiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/yamatojirapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/yamatojirapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/yamatojirapid_ko.webp');
      default:
        return require('../../assets/jrwest/yamatojirapid.webp');
    }
  }, [headerLangState]);
  const fetchJRWTambajiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/tambajirapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/tambajirapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/tambajirapid_ko.webp');
      default:
        return require('../../assets/jrwest/tambajirapid.webp');
    }
  }, [headerLangState]);
  const fetchKeikyuAPLtdExpressRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/keikyuairportltdexpress_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/keikyuairportltdexpress_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/keikyuairportltdexpress_ko.webp');
      default:
        return require('../../assets/jrwest/keikyuairportltdexpress.webp');
    }
  }, [headerLangState]);
  const fetchKeikyuAPExpressRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/keikyuairtportexpress_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/keikyuairtportexpress_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/keikyuairtportexpress_ko.webp');
      default:
        return require('../../assets/jrwest/keikyuairtportexpress.webp');
    }
  }, [headerLangState]);
  const fetchKeikyuLtdExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/keikyultdexpress_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/keikyultdexpress_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/keikyultdexpress_ko.webp');
      default:
        return require('../../assets/jrwest/keikyultdexpress.webp');
    }
  }, [headerLangState]);
  const fetchJRESpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrespecialrapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/jrespecialrapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/jrespecialrapid_ko.webp');
      default:
        return require('../../assets/jrwest/jrespecialrapid.webp');
    }
  }, [headerLangState]);
  const fetchJRECommuterRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrecommuterrapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/jrecommuterrapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/jrecommuterrapid_ko.webp');
      default:
        return require('../../assets/jrwest/jrecommuterrapid.webp');
    }
  }, [headerLangState]);
  const fetchJRECommuterSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrecommuterspecialrapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/jrecommuterspecialrapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/jrecommuterspecialrapid_ko.webp');
      default:
        return require('../../assets/jrwest/jrecommuterspecialrapid.webp');
    }
  }, [headerLangState]);
  const fetchJRWDirectRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/directrapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/directrapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/directrapid_ko.webp');
      default:
        return require('../../assets/jrwest/directrapid.webp');
    }
  }, [headerLangState]);
  const fetchJREChuoLineSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrechuolinespecialrapid_en.webp');
      case 'ZH':
        return require('../../assets/jrwest/jrechuolinespecialrapid_zh.webp');
      case 'KO':
        return require('../../assets/jrwest/jrechuolinespecialrapid_ko.webp');
      default:
        return require('../../assets/jrwest/jrechuolinespecialrapid.webp');
    }
  }, [headerLangState]);

  const trainTypeName = trainType?.name.replace(parenthesisRegexp, '') || '';

  const trainTypeImage = useMemo((): number => {
    if (!station) {
      return fetchJRWLocalLogo();
    }
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
      case '丹波路快速':
        return fetchJRWTambajiRapidLogo();
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
        // TODO: 東海の新快速と同じにならないようにしたい
        return fetchJRWSpecialRapidLogo();
      default:
        break;
    }

    if (currentLine?.lineType === LineType.BulletTrain) {
      return fetchJRWLtdExpressLogo();
    }

    if (trainTypeName.includes('特快')) {
      return fetchJREChuoLineSpecialRapidLogo();
    }

    switch (trainType?.kind) {
      case TrainTypeKind.Default:
        return fetchJRWLocalLogo();
      case TrainTypeKind.Branch:
        return fetchJRWLocalLogo();
      case TrainTypeKind.Express:
        return fetchJRWExpressLogo();
      case TrainTypeKind.LimitedExpress:
        return fetchJRWLtdExpressLogo();
      case TrainTypeKind.Rapid:
      case TrainTypeKind.HighSpeedRapid:
        return fetchJRWRapidLogo();
      default:
        return fetchJRWLocalLogo();
    }
  }, [
    currentLine?.lineType,
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
    fetchJRWTambajiRapidLogo,
    fetchJRWYamatojiRapidLogo,
    fetchKeikyuAPExpressRapidLogo,
    fetchKeikyuAPLtdExpressRapidLogo,
    fetchKeikyuLtdExpressLogo,
    station,
    trainType?.kind,
    trainTypeName,
  ]);

  const [currentStationNumber, threeLetterCode] = useNumbering();

  const numberingColor = useMemo(
    () =>
      getNumberingColor(
        arrived,
        currentStationNumber,
        nextStation,
        currentLine
      ),
    [arrived, currentStationNumber, currentLine, nextStation]
  );
  const getLineMarkFunc = useGetLineMark();
  const mark = useMemo(
    () => currentLine && getLineMarkFunc({ line: currentLine }),
    [currentLine, getLineMarkFunc]
  );

  return (
    <View>
      <LinearGradient
        colors={['#222222', '#212121']}
        style={styles.gradientRoot}
      >
        <View style={[styles.top, { left: mark ? 64 : 32 }]}>
          {mark ? (
            <TransferLineMark
              line={currentLine}
              mark={mark}
              color={numberingColor}
              size={NUMBERING_ICON_SIZE.MEDIUM}
              withDarkTheme
            />
          ) : (
            <View style={styles.emptyNumbering} />
          )}
          <View style={styles.trainTypeImageContainer}>
            <Image
              style={styles.trainTypeImage}
              source={trainTypeImage}
              cachePolicy="memory-disk"
            />
          </View>
        </View>
        <View style={styles.left}>
          <Typography
            adjustsFontSizeToFit
            numberOfLines={2}
            style={styles.state}
          >
            {stateText}
          </Typography>
        </View>

        <View style={styles.right}>
          <Typography style={styles.bound}>{boundText}</Typography>
          {currentStationNumber ? (
            <View style={styles.numberingContainer}>
              <NumberingIcon
                shape={currentStationNumber.lineSymbolShape}
                lineColor={numberingColor}
                stationNumber={currentStationNumber.stationNumber}
                threeLetterCode={threeLetterCode}
                withDarkTheme
              />
            </View>
          ) : null}
          <View style={styles.stationNameContainer}>
            <Typography
              adjustsFontSizeToFit
              numberOfLines={1}
              style={styles.stationName}
            >
              {stationText}
            </Typography>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default React.memo(HeaderJRWest);
