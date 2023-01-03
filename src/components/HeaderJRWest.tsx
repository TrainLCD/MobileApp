/* eslint-disable global-require */
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilValue } from 'recoil';
import { STATION_NAME_FONT_SIZE } from '../constants';
import { NUMBERING_ICON_SIZE } from '../constants/numbering';
import { parenthesisRegexp } from '../constants/regexp';
import useCurrentLine from '../hooks/useCurrentLine';
import useGetLineMark from '../hooks/useGetLineMark';
import useLoopLineBound from '../hooks/useLoopLineBound';
import useNumbering from '../hooks/useNumbering';
import { HeaderLangState } from '../models/HeaderTransitionState';
import { LINE_TYPE } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import getStationNameScale from '../utils/getStationNameScale';
import getTrainType from '../utils/getTrainType';
import isTablet from '../utils/isTablet';
import katakanaToHiragana from '../utils/kanaToHiragana';
import { getIsLoopLine, isMeijoLine, isOsakaLoopLine } from '../utils/loopLine';
import { getNumberingColor } from '../utils/numbering';
import CommonHeaderProps from './CommonHeaderProps';
import NumberingIcon from './NumberingIcon';
import TransferLineMark from './TransferLineMark';
import VisitorsPanel from './VisitorsPanel';

const HeaderJRWest: React.FC<CommonHeaderProps> = ({
  station,
  nextStation,
  isLast,
}: CommonHeaderProps) => {
  const { headerState, trainType } = useRecoilValue(navigationState);
  const { selectedBound, selectedDirection, arrived } =
    useRecoilValue(stationState);
  const [stateText, setStateText] = useState(translate('nowStoppingAt'));
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const [stationNameScale, setStationNameScale] = useState(
    getStationNameScale(isJapanese ? station.name : station.nameR, !isJapanese)
  );
  const [boundStationNameScale, setBoundStationNameScale] = useState(
    getStationNameScale(
      (isJapanese ? selectedBound?.name : selectedBound?.nameR) || '',
      !isJapanese
    )
  );
  const currentLine = useCurrentLine();
  const loopLineBound = useLoopLineBound();

  const isLoopLine = currentLine && isOsakaLoopLine(currentLine.id);

  const adjustStationNameScale = useCallback(
    (stationName: string, en?: boolean): void => {
      setStationNameScale(getStationNameScale(stationName, en));
    },
    []
  );

  const adjustBoundStationNameScale = useCallback(
    (stationName: string, en?: boolean): void => {
      setBoundStationNameScale(getStationNameScale(stationName, en));
    },
    []
  );

  const headerLangState = headerState.split('_')[1] as HeaderLangState;

  const currentLineIsMeijo = useMemo(
    () => currentLine && isMeijoLine(currentLine.id),
    [currentLine]
  );

  const boundPrefix = useMemo(() => {
    if (currentLineIsMeijo) {
      return '';
    }
    switch (headerLangState) {
      case 'EN':
        return 'for';
      case 'ZH':
        return '开往';
      default:
        return '';
    }
  }, [currentLineIsMeijo, headerLangState]);

  const boundSuffix = useMemo(() => {
    if (currentLineIsMeijo) {
      return '';
    }
    switch (headerLangState) {
      case 'EN':
        return '';
      case 'ZH':
        return '';
      case 'KO':
        return '행';
      default:
        return getIsLoopLine(currentLine, trainType) ? '方面' : 'ゆき';
    }
  }, [currentLineIsMeijo, headerLangState, currentLine, trainType]);

  const selectedBoundName = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return selectedBound?.nameR;
      case 'ZH':
        return selectedBound?.nameZh;
      case 'KO':
        return selectedBound?.nameKo;
      default:
        return selectedBound?.name;
    }
  }, [
    headerLangState,
    selectedBound?.name,
    selectedBound?.nameKo,
    selectedBound?.nameR,
    selectedBound?.nameZh,
  ]);

  useEffect(() => {
    if (!currentLine || !selectedBound) {
      setBoundText('TrainLCD');
    } else if (isLoopLine && !trainType) {
      setBoundText(loopLineBound?.boundFor ?? '');
    } else if (selectedBoundName) {
      setBoundText(selectedBoundName);
    }

    switch (headerState) {
      case 'ARRIVING':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'soonLast' : 'soon').replace(/\n/, ' ')
          );
          setStationText(nextStation.name);
          adjustStationNameScale(nextStation.name);
          if (selectedBound) {
            adjustBoundStationNameScale(selectedBound.name);
          }
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'soonKanaLast' : 'soon').replace(/\n/, ' ')
          );
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustStationNameScale(katakanaToHiragana(nextStation.nameK));
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'soonEnLast' : 'soonEn').replace(/\n/, ' ')
          );
          setStationText(nextStation.nameR);
          adjustStationNameScale(nextStation.nameR, true);
          if (selectedBound) {
            adjustBoundStationNameScale(selectedBound.nameR, true);
          }
        }
        break;
      case 'ARRIVING_ZH':
        if (nextStation?.nameZh) {
          setStateText(
            translate(isLast ? 'soonZhLast' : 'soonZh').replace(/\n/, ' ')
          );
          setStationText(nextStation.nameZh);
          adjustStationNameScale(nextStation.nameZh);
          if (selectedBound) {
            adjustBoundStationNameScale(selectedBound.nameZh);
          }
        }
        break;
      case 'ARRIVING_KO':
        if (nextStation?.nameKo) {
          setStateText(
            translate(isLast ? 'soonKoLast' : 'soonKo').replace(/\n/, ' ')
          );
          setStationText(nextStation.nameKo);
          adjustStationNameScale(nextStation.nameKo);
          if (selectedBound) {
            adjustBoundStationNameScale(selectedBound.nameKo);
          }
        }
        break;
      case 'CURRENT':
        setStateText(translate('nowStoppingAt'));
        setStationText(station.name);
        adjustStationNameScale(station.name);
        if (selectedBound) {
          adjustBoundStationNameScale(selectedBound.name);
        }
        break;
      case 'CURRENT_KANA':
        setStateText(translate('nowStoppingAt'));
        setStationText(katakanaToHiragana(station.nameK));
        adjustStationNameScale(katakanaToHiragana(station.nameK));
        break;
      case 'CURRENT_EN':
        setStateText('');
        setStationText(station.nameR);
        adjustStationNameScale(station.nameR, true);
        if (selectedBound) {
          adjustBoundStationNameScale(selectedBound.nameR, true);
        }
        break;
      case 'CURRENT_ZH':
        if (!station.nameZh) {
          break;
        }
        setStateText('');
        setStationText(station.nameZh);
        adjustBoundStationNameScale(station.nameZh);
        if (selectedBound) {
          adjustBoundStationNameScale(selectedBound.nameZh);
        }
        break;
      case 'CURRENT_KO':
        if (!station.nameKo) {
          break;
        }
        setStateText('');
        setStationText(station.nameKo);
        adjustStationNameScale(station.nameKo);
        if (selectedBound) {
          adjustBoundStationNameScale(selectedBound.nameKo);
        }
        break;
      case 'NEXT':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'nextLast' : 'next').replace(/\n/, ' ')
          );
          setStationText(nextStation.name);
          adjustStationNameScale(nextStation.name);
          if (selectedBound) {
            adjustBoundStationNameScale(selectedBound.name);
          }
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'nextKanaLast' : 'nextKana').replace(/\n/, ' ')
          );
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustStationNameScale(nextStation.nameK);
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          if (isLast) {
            // 2単語以降はlower caseにしたい
            // Next Last Stop -> Next last stop
            const smallCapitalizedLast = translate('nextEnLast')
              .split('\n')
              .map((letters, index) =>
                !index ? letters : letters.toLowerCase()
              )
              .join(' ');
            setStateText(smallCapitalizedLast);
          } else {
            setStateText(translate('nextEn').replace(/\n/, ' '));
          }

          setStationText(nextStation.nameR);
          adjustStationNameScale(nextStation.nameR, true);
          if (selectedBound) {
            adjustBoundStationNameScale(selectedBound.nameR, true);
          }
        }
        break;
      case 'NEXT_ZH':
        if (nextStation?.nameZh) {
          setStateText(
            translate(isLast ? 'nextZhLast' : 'nextZh').replace(/\n/, ' ')
          );
          setStationText(nextStation.nameZh);
          adjustStationNameScale(nextStation.nameZh);
          if (selectedBound) {
            adjustBoundStationNameScale(selectedBound.nameZh);
          }
        }
        break;
      case 'NEXT_KO':
        if (nextStation?.nameKo) {
          setStateText(
            translate(isLast ? 'nextKoLast' : 'nextKo').replace(/\n/, ' ')
          );
          setStationText(nextStation.nameKo);
          adjustStationNameScale(nextStation.nameKo);
          if (selectedBound) {
            adjustBoundStationNameScale(selectedBound.nameKo);
          }
        }
        break;
      default:
        break;
    }
  }, [
    adjustBoundStationNameScale,
    adjustStationNameScale,
    currentLine,
    headerState,
    isLast,
    isLoopLine,
    loopLineBound?.boundFor,
    nextStation,
    selectedBound,
    selectedBoundName,
    station.name,
    station.nameK,
    station.nameKo,
    station.nameR,
    station.nameZh,
    trainType,
  ]);

  const styles = StyleSheet.create({
    gradientRoot: {
      paddingRight: 21,
      paddingLeft: 21,
      overflow: 'hidden',
      height: isTablet ? 210 : 150,
      flexDirection: 'row',
    },
    bound: {
      color: '#fff',
      fontWeight: 'bold',
      transform: [
        {
          scaleX: boundStationNameScale,
        },
      ],
      fontSize: RFValue(18),
    },
    boundFor: {
      fontSize: RFValue(16),
      color: '#aaa',
      fontWeight: 'bold',
    },
    boundForEn: {
      fontSize: RFValue(16),
      color: '#aaa',
      textAlign: 'left',
      fontWeight: 'bold',
    },
    stationName: {
      textAlign: 'center',
      transform: [
        {
          scaleX: stationNameScale,
        },
      ],
      fontSize: STATION_NAME_FONT_SIZE,
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
      height: isTablet ? 200 : 120,
      marginTop: 48,
    },
    right: {
      flex: 1,
      justifyContent: 'flex-end',
      alignContent: 'flex-end',
      height: isTablet ? 200 : 150,
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
    numberingContainer: {
      position: 'absolute',
      bottom: 0,
    },
  });

  const getLineMarkFunc = useGetLineMark();
  const mark = currentLine && getLineMarkFunc(station, currentLine);

  const fetchJRWLocalLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/local_en.png');
      case 'ZH':
        return require('../../assets/jrwest/local_zh.png');
      case 'KO':
        return require('../../assets/jrwest/local_ko.png');
      default:
        return require('../../assets/jrwest/local.png');
    }
  }, [headerLangState]);

  const fetchJRWRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/rapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/rapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/rapid_ko.png');
      default:
        return require('../../assets/jrwest/rapid.png');
    }
  }, [headerLangState]);
  const fetchJRWSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/specialrapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/specialrapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/specialrapid_ko.png');
      default:
        return require('../../assets/jrwest/specialrapid.png');
    }
  }, [headerLangState]);
  const fetchJRWExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/express_en.png');
      case 'ZH':
        return require('../../assets/jrwest/express_zh.png');
      case 'KO':
        return require('../../assets/jrwest/express_ko.png');
      default:
        return require('../../assets/jrwest/express.png');
    }
  }, [headerLangState]);
  const fetchJRWLtdExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/ltdexpress_en.png');
      case 'ZH':
        return require('../../assets/jrwest/ltdexpress_zh.png');
      case 'KO':
        return require('../../assets/jrwest/ltdexpress_ko.png');
      default:
        return require('../../assets/jrwest/ltdexpress.png');
    }
  }, [headerLangState]);
  const fetchJRWRegionalRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/regionalrapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/regionalrapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/regionalrapid_ko.png');
      default:
        return require('../../assets/jrwest/regionalrapid.png');
    }
  }, [headerLangState]);
  const fetchJRWRegionalExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/regionalexpress_en.png');
      case 'ZH':
        return require('../../assets/jrwest/regionalexpress_zh.png');
      case 'KO':
        return require('../../assets/jrwest/regionalexpress_ko.png');
      default:
        return require('../../assets/jrwest/regionalexpress.png');
    }
  }, [headerLangState]);
  const fetchJRWKansaiAirportRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/kansaiairportrapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/kansaiairportrapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/kansaiairportrapid_ko.png');
      default:
        return require('../../assets/jrwest/kansaiairportrapid.png');
    }
  }, [headerLangState]);
  const fetchJRWKishujiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/kishujirapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/kishujirapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/kishujirapid_ko.png');
      default:
        return require('../../assets/jrwest/kishujirapid.png');
    }
  }, [headerLangState]);
  const fetchJRWMiyakojiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/miyakojirapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/miyakojirapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/miyakojirapid_ko.png');
      default:
        return require('../../assets/jrwest/miyakojirapid.png');
    }
  }, [headerLangState]);
  const fetchJRWYamatojiRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/yamatojirapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/yamatojirapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/yamatojirapid_ko.png');
      default:
        return require('../../assets/jrwest/yamatojirapid.png');
    }
  }, [headerLangState]);
  const fetchKeikyuAPLtdExpressRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/keikyuairportltdexpress_en.png');
      case 'ZH':
        return require('../../assets/jrwest/keikyuairportltdexpress_zh.png');
      case 'KO':
        return require('../../assets/jrwest/keikyuairportltdexpress_ko.png');
      default:
        return require('../../assets/jrwest/keikyuairportltdexpress.png');
    }
  }, [headerLangState]);
  const fetchKeikyuAPExpressRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/keikyuairtportexpress_en.png');
      case 'ZH':
        return require('../../assets/jrwest/keikyuairtportexpress_zh.png');
      case 'KO':
        return require('../../assets/jrwest/keikyuairtportexpress_ko.png');
      default:
        return require('../../assets/jrwest/keikyuairtportexpress.png');
    }
  }, [headerLangState]);
  const fetchKeikyuLtdExpressLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/keikyultdexpress_en.png');
      case 'ZH':
        return require('../../assets/jrwest/keikyultdexpress_zh.png');
      case 'KO':
        return require('../../assets/jrwest/keikyultdexpress_ko.png');
      default:
        return require('../../assets/jrwest/keikyultdexpress.png');
    }
  }, [headerLangState]);
  const fetchJRESpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrespecialrapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/jrespecialrapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/jrespecialrapid_ko.png');
      default:
        return require('../../assets/jrwest/jrespecialrapid.png');
    }
  }, [headerLangState]);
  const fetchJRECommuterRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrecommuterrapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/jrecommuterrapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/jrecommuterrapid_ko.png');
      default:
        return require('../../assets/jrwest/jrecommuterrapid.png');
    }
  }, [headerLangState]);
  const fetchJRECommuterSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrecommuterspecialrapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/jrecommuterspecialrapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/jrecommuterspecialrapid_ko.png');
      default:
        return require('../../assets/jrwest/jrecommuterspecialrapid.png');
    }
  }, [headerLangState]);
  const fetchJRWDirectRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/directrapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/directrapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/directrapid_ko.png');
      default:
        return require('../../assets/jrwest/directrapid.png');
    }
  }, [headerLangState]);
  const fetchJREChuoLineSpecialRapidLogo = useCallback((): number => {
    switch (headerLangState) {
      case 'EN':
        return require('../../assets/jrwest/jrechuolinespecialrapid_en.png');
      case 'ZH':
        return require('../../assets/jrwest/jrechuolinespecialrapid_zh.png');
      case 'KO':
        return require('../../assets/jrwest/jrechuolinespecialrapid_ko.png');
      default:
        return require('../../assets/jrwest/jrechuolinespecialrapid.png');
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
      (trainType && trainType?.typeId >= 200 && trainType?.typeId < 300) ||
      (trainType && trainType?.typeId >= 500 && trainType?.typeId < 600) ||
      currentLine?.lineType === LINE_TYPE.BULLET_TRAIN
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
      getTrainType(currentLine, station, selectedDirection) === 'rapid' ||
      trainTypeName.endsWith('快速')
    ) {
      return fetchJRWRapidLogo();
    }
    return fetchJRWLocalLogo();
  }, [
    currentLine,
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
    selectedDirection,
    station,
    trainType,
    trainTypeName,
  ]);

  const [currentStationNumber, threeLetterCode, lineMarkShape] = useNumbering();
  const lineColor = useMemo(
    () => currentLine && `#${currentLine.lineColorC}`,
    [currentLine]
  );
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

  return (
    <View>
      <LinearGradient
        colors={['#222222', '#212121']}
        style={styles.gradientRoot}
      >
        <VisitorsPanel />
        <View style={styles.top}>
          {mark && mark.sign ? (
            <TransferLineMark
              line={currentLine}
              mark={mark}
              color={numberingColor}
              size={NUMBERING_ICON_SIZE.SMALL}
            />
          ) : null}
          {currentLine ? (
            <FastImage style={styles.localLogo} source={trainTypeImage} />
          ) : null}
        </View>
        <View style={styles.left}>
          {boundPrefix !== '' && selectedBound && (
            <Text style={styles.boundForEn}>{boundPrefix}</Text>
          )}
          <Text style={styles.bound}>{boundText}</Text>
          {boundSuffix !== '' && selectedBound && (
            <Text style={styles.boundFor}>{boundSuffix}</Text>
          )}
        </View>

        {stationNameScale && (
          <View style={styles.right}>
            <Text style={styles.state}>{stateText}</Text>
            {lineMarkShape !== null &&
            lineMarkShape !== undefined &&
            lineColor &&
            currentStationNumber ? (
              <View style={styles.numberingContainer}>
                <NumberingIcon
                  shape={lineMarkShape}
                  lineColor={numberingColor}
                  stationNumber={currentStationNumber.stationNumber}
                  threeLetterCode={threeLetterCode}
                />
              </View>
            ) : null}
            <Text style={styles.stationName}>{stationText}</Text>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

export default HeaderJRWest;
