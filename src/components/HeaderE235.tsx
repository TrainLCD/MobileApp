import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { STATION_NAME_FONT_SIZE } from '../constants';
import {
  useBoundText,
  useCurrentLine,
  useCurrentStation,
  useCurrentTrainType,
  useIsNextLastStop,
  useLoopLine,
  useNextStation,
  useNumbering,
} from '../hooks';
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
import TrainTypeBoxJO from './TrainTypeBoxJO';
import Typography from './Typography';

const styles = StyleSheet.create({
  gradientRoot: {
    paddingLeft: 24,
    overflow: 'hidden',
    height: isTablet ? 200 : 128,
    flexDirection: 'row',
  },
  boundContainer: {
    width: '100%',
    height: '50%',
    justifyContent: 'flex-end',
  },
  bound: {
    color: '#fff',
    fontWeight: 'bold',
    width: '100%',
  },
  boundGrayText: {
    color: '#aaa',
    fontWeight: 'bold',
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
    flexWrap: 'wrap',
    flex: 1,
    textAlign: 'center',
    fontSize: STATION_NAME_FONT_SIZE,
  },
  left: {
    flex: 0.3,
    justifyContent: 'center',
    height: isTablet ? 200 : 128,
    marginRight: 24,
    position: 'relative',
  },
  right: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
    height: isTablet ? 200 : 128,
  },
  state: {
    position: 'absolute',
    top: isTablet ? 24 : 12,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: RFValue(21),
  },
  colorBar: {
    width: isTablet ? 48 : 38,
    height: isTablet ? 190 : 120,
    marginRight: 16,
  },
  clockOverride: {
    position: 'absolute',
    top: 8,
    right: '25%',
  },
  stationNameContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
});

type Props = {
  isJO?: boolean;
};

const HeaderE235: React.FC<Props> = ({ isJO }: Props) => {
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
          setStationText(nextStation.name || '');
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
        setStationText(station.name || '');
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
          setStationText(nextStation.name || '');
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
        return isLoopLine ? 'Bound for' : 'for';
      case 'ZH':
        return '开往';
      default:
        return '';
    }
  }, [headerLangState, isLoopLine]);
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

  const boundContainerMarginTop = useMemo(() => {
    if (!isJO) {
      return 0;
    }
    if (isTablet) {
      return 85;
    }
    return 55;
  }, [isJO]);

  const boundFontSize = useMemo(() => {
    if (isJO) {
      return RFValue(20);
    }
    return RFValue(25);
  }, [isJO]);

  return (
    <LinearGradient colors={['#222222', '#212121']} style={styles.gradientRoot}>
      <View style={styles.left}>
        {isJO ? <TrainTypeBoxJO trainType={trainType} /> : null}

        <View
          style={[
            styles.boundContainer,
            {
              marginTop: boundContainerMarginTop,
            },
          ]}
        >
          {selectedBound && boundPrefix.length ? (
            <Typography
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[
                styles.boundGrayText,
                {
                  fontSize: RFValue(isJO ? 14 : 18),
                },
              ]}
            >
              {boundPrefix}
            </Typography>
          ) : null}
          <Typography
            style={[
              styles.bound,
              {
                fontSize: boundFontSize,
              },
            ]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {boundText}
          </Typography>
          {selectedBound && boundSuffix.length ? (
            <Typography
              style={[
                styles.boundSuffix,
                {
                  fontSize: RFValue(isJO ? 14 : 18),
                },
                headerLangState === 'KO' ? styles.boundGrayText : null,
              ]}
            >
              {boundSuffix}
            </Typography>
          ) : null}
        </View>
      </View>
      <View
        style={[
          styles.colorBar,
          {
            backgroundColor: currentLine
              ? (currentLine.color ?? '#000')
              : '#aaa',
          },
        ]}
      />
      <View style={styles.right}>
        <Typography style={styles.state} adjustsFontSizeToFit numberOfLines={2}>
          {stateText}
        </Typography>
        <View style={styles.stationNameContainer}>
          {currentStationNumber ? (
            <NumberingIcon
              shape={currentStationNumber.lineSymbolShape || ''}
              lineColor={numberingColor}
              stationNumber={currentStationNumber.stationNumber || ''}
              threeLetterCode={threeLetterCode}
              withDarkTheme
              allowScaling
              transformOrigin={Platform.OS === 'android' ? 'bottom' : undefined}
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
      <Clock white style={styles.clockOverride} />
    </LinearGradient>
  );
};

export default React.memo(HeaderE235);
