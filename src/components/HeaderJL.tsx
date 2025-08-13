import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  useBoundText,
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useIsNextLastStop,
  useLoopLine,
  useNextStation,
  useNumbering,
} from '~/hooks';
import { STATION_NAME_FONT_SIZE } from '../constants';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import katakanaToHiragana from '../utils/kanaToHiragana';
import { getNumberingColor } from '../utils/numbering';
import { RFValue } from '../utils/rfValue';
import Clock from './Clock';
import NumberingIcon from './NumberingIcon';
import TrainTypeBoxJL from './TrainTypeBoxJL';
import Typography from './Typography';

const styles = StyleSheet.create({
  gradientRoot: {
    overflow: 'hidden',
    height: isTablet ? 200 : 128,
    flexDirection: 'row',
  },
  boundContainer: {
    position: 'absolute',
    top: isTablet ? 79 : 47,
    width: '100%',
    height: '50%',
    justifyContent: 'flex-end',
  },
  bound: {
    color: '#fff',
    fontWeight: 'bold',
    width: '100%',
  },
  boundSuffix: {
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  stationName: {
    fontWeight: 'bold',
    color: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    flexWrap: 'wrap',
    flex: 1,
    textAlign: 'center',
    fontSize: STATION_NAME_FONT_SIZE,
  },
  left: {
    flex: 0.2,
    height: isTablet ? 200 : 128,
    position: 'relative',
    flexDirection: 'row',
    paddingHorizontal: 32,
  },
  right: {
    flex: 0.8,
    paddingLeft: isTablet ? 64 : 8,
    justifyContent: 'center',
    height: isTablet ? 200 : 128,
  },
  state: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: RFValue(21),
    position: 'absolute',
    top: 12,
    paddingLeft: isTablet ? 64 : 32,
  },
  clockContainer: {
    position: 'absolute',
    top: 8,
    right: Dimensions.get('screen').width * 0.25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockLabel: {
    color: '#fff',
    fontSize: RFValue(14),
    marginRight: 4,
  },
  clockOverride: {
    backgroundColor: 'white',
  },
  stationNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
    marginBottom: 8,
    marginLeft: 32,
  },
});

const HeaderJL = () => {
  const station = useCurrentStation();
  const currentLine = useCurrentLine();
  const nextStation = useNextStation();

  const [stateText, setStateText] = useState(translate('nowStoppingAt'));
  const [stationText, setStationText] = useState(station?.name || '');
  const { headerState } = useAtomValue(navigationState);
  const { selectedBound, arrived } = useAtomValue(stationState);
  const isLast = useIsNextLastStop();
  const trainType = useCurrentTrainType();
  const boundStationNameList = useBoundText(true);

  const { isLoopLine, isPartiallyLoopLine } = useLoopLine();

  const headerLangState = useMemo(
    () =>
      headerState.split('_')[1]?.length
        ? (headerState.split('_')[1] as HeaderLangState)
        : ('JA' as HeaderLangState),
    [headerState]
  );
  const boundText = boundStationNameList[headerLangState];

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

  useEffect(() => {
    if (!station) {
      return;
    }

    switch (headerState) {
      case 'ARRIVING':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'soonLast' : 'soon').replace(/\n/, ' ')
          );
          setStationText(nextStation.name);
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'soonKanaLast' : 'soon').replace(/\n/, ' ')
          );
          setStationText(katakanaToHiragana(nextStation.nameKatakana));
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'soonEnLast' : 'soonEn').replace(/\n/, ' ')
          );
          setStationText(nextStation.nameRoman ?? '');
        }
        break;
      case 'ARRIVING_ZH':
        if (nextStation?.nameChinese) {
          setStateText(
            translate(isLast ? 'soonZhLast' : 'soonZh').replace(/\n/, ' ')
          );
          setStationText(nextStation.nameChinese);
        }
        break;
      case 'ARRIVING_KO':
        if (nextStation?.nameKorean) {
          setStateText(
            translate(isLast ? 'soonKoLast' : 'soonKo').replace(/\n/, ' ')
          );
          setStationText(nextStation.nameKorean);
        }
        break;
      case 'CURRENT':
        setStateText(translate('nowStoppingAt'));
        setStationText(station.name);
        break;
      case 'CURRENT_KANA':
        setStateText(translate('nowStoppingAt'));
        setStationText(katakanaToHiragana(station.nameKatakana));
        break;
      case 'CURRENT_EN':
        setStateText(translate('nowStoppingAtEn'));
        setStationText(station.nameRoman ?? '');
        break;
      case 'CURRENT_ZH':
        if (!station.nameChinese) {
          break;
        }
        setStateText(translate('nowStoppingAtZh'));
        setStationText(station.nameChinese);
        break;
      case 'CURRENT_KO':
        if (!station.nameKorean) {
          break;
        }
        setStateText(translate('nowStoppingAtKo'));
        setStationText(station.nameKorean);
        break;
      case 'NEXT':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'nextLast' : 'next').replace(/\n/, ' ')
          );
          setStationText(nextStation.name);
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          setStateText(
            translate(isLast ? 'nextKanaLast' : 'nextKana').replace(/\n/, ' ')
          );
          setStationText(katakanaToHiragana(nextStation.nameKatakana));
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          if (isLast) {
            // 2単語以降はlower caseにしたい
            // Next Last Stop -> Next last stop
            const smallCapitalizedLast = translate('nextEnLast')
              ?.split('\n')
              .map((letters, index) =>
                !index ? letters : letters.toLowerCase()
              )
              .join(' ');
            setStateText(smallCapitalizedLast);
          } else {
            setStateText(translate('nextEn').replace(/\n/, ' '));
          }

          setStationText(nextStation.nameRoman ?? '');
        }
        break;
      case 'NEXT_ZH':
        if (nextStation?.nameChinese) {
          setStateText(
            translate(isLast ? 'nextZhLast' : 'nextZh').replace(/\n/, ' ')
          );
          setStationText(nextStation.nameChinese);
        }
        break;
      case 'NEXT_KO':
        if (nextStation?.nameKorean) {
          setStateText(
            translate(isLast ? 'nextKoLast' : 'nextKo').replace(/\n/, ' ')
          );
          setStationText(nextStation.nameKorean);
        }
        break;
      default:
        break;
    }
  }, [headerState, isLast, nextStation, station]);

  const boundPrefix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return 'for';
      case 'ZH':
        return '开往';
      default:
        return '';
    }
  }, [headerLangState]);
  const boundSuffix = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return '';
      case 'ZH':
        return '';
      case 'KO':
        return isLoopLine || isPartiallyLoopLine ? '방면' : '행';
      default:
        return isLoopLine || isPartiallyLoopLine ? '方面' : 'ゆき';
    }
  }, [headerLangState, isLoopLine, isPartiallyLoopLine]);

  const clockLabel = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return 'Time';
      case 'ZH':
        return '时间';
      case 'KO':
        return '시간';
      default:
        return '現在時刻';
    }
  }, [headerLangState]);

  return (
    <LinearGradient colors={['#222222', '#212121']} style={styles.gradientRoot}>
      <View
        style={{
          ...styles.left,
          backgroundColor: currentLine?.color ?? 'transparent',
        }}
      >
        <View
          style={{ width: '100%', height: '100%', flexDirection: 'column' }}
        >
          <TrainTypeBoxJL
            trainType={trainType}
            trainTypeColor={currentLine?.color}
          />
          <View style={styles.boundContainer}>
            {selectedBound && boundPrefix.length ? (
              <Typography
                adjustsFontSizeToFit
                numberOfLines={1}
                style={{
                  ...styles.bound,
                  fontSize: RFValue(14),
                }}
              >
                {boundPrefix}
              </Typography>
            ) : null}

            <Typography
              style={{
                ...styles.bound,
                fontSize: RFValue(20),
              }}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {boundText}
            </Typography>
            {selectedBound && boundSuffix.length ? (
              <Typography
                style={{
                  ...styles.boundSuffix,
                  fontSize: RFValue(14),
                }}
              >
                {boundSuffix}
              </Typography>
            ) : null}
          </View>
        </View>
        <Svg
          width={isTablet ? 114 : 95}
          height="100%"
          viewBox="0 0 25 100"
          fill="none"
        >
          <Path
            d="M25 50L0 0L0 100L25 50Z"
            fill={currentLine?.color ?? 'transparent'}
          />
        </Svg>
      </View>
      <View style={styles.right}>
        <Typography style={styles.state}>{stateText}</Typography>
        <View style={styles.stationNameContainer}>
          {currentStationNumber ? (
            <NumberingIcon
              shape={currentStationNumber.lineSymbolShape}
              lineColor={numberingColor}
              stationNumber={currentStationNumber.stationNumber}
              threeLetterCode={threeLetterCode}
              withDarkTheme
            />
          ) : null}
          <Typography
            style={styles.stationName}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {stationText}
          </Typography>
        </View>
      </View>
      <View style={styles.clockContainer}>
        <Typography style={styles.clockLabel}>{clockLabel}</Typography>
        <Clock style={styles.clockOverride} />
      </View>
    </LinearGradient>
  );
};

export default React.memo(HeaderJL);
