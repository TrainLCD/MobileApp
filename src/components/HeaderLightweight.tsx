/* eslint-disable global-require */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilValue } from 'recoil';
import { STATION_NAME_FONT_SIZE } from '../constants';
import { parenthesisRegexp } from '../constants/regexp';
import truncateTrainType from '../constants/truncateTrainType';
import useNumbering from '../hooks/useNumbering';
import { getLineMark } from '../lineMark';
import { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import getCurrentStationIndex from '../utils/currentStationIndex';
import getStationNameScale from '../utils/getStationNameScale';
import isTablet from '../utils/isTablet';
import katakanaToHiragana from '../utils/kanaToHiragana';
import {
  getIsLoopLine,
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../utils/loopLine';
import { getNumberingColor } from '../utils/numbering';
import CommonHeaderProps from './CommonHeaderProps';
import NumberingIcon from './NumberingIcon';
import TransferLineMark from './TransferLineMark';
import VisitorsPanel from './VisitorsPanel';

const HeaderLightweight: React.FC<CommonHeaderProps> = ({
  station,
  nextStation,
  line,
  isLast,
}: CommonHeaderProps) => {
  const { headerState, trainType } = useRecoilValue(navigationState);
  const { selectedBound, selectedDirection, stations, arrived } =
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

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line ? !trainType && line.id === 11623 : undefined;

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
        return getIsLoopLine(line, trainType) ? '方面' : 'ゆき';
    }
  })();

  useEffect(() => {
    if (!line || !selectedBound) {
      setBoundText('TrainLCD');
    } else if (yamanoteLine || osakaLoopLine) {
      const currentIndex = getCurrentStationIndex(stations, station);
      const text =
        selectedDirection === 'INBOUND'
          ? inboundStationForLoopLine(
              stations,
              currentIndex,
              line,
              headerLangState
            )?.boundFor
          : outboundStationForLoopLine(
              stations,
              currentIndex,
              line,
              headerLangState
            )?.boundFor;
      if (text) {
        setBoundText(text);
      }
    } else {
      const selectedBoundName = (() => {
        switch (headerLangState) {
          case 'EN':
            return selectedBound.nameR;
          case 'ZH':
            return selectedBound.nameZh;
          case 'KO':
            return selectedBound.nameKo;
          default:
            return selectedBound.name;
        }
      })();

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
    selectedBound,
    headerLangState,
    isLast,
    line,
    nextStation,
    osakaLoopLine,
    station,
    stations,
    yamanoteLine,
    selectedDirection,
    headerState,
    adjustStationNameScale,
    adjustBoundStationNameScale,
  ]);

  const styles = StyleSheet.create({
    root: {
      paddingRight: 21,
      paddingLeft: 21,
      overflow: 'hidden',
      height: isTablet ? 210 : 150,
      flexDirection: 'row',
      backgroundColor: 'black',
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
    trainTypeName: {
      fontSize: RFValue(21),
      color: 'white',
      fontWeight: 'bold',
    },
    numberingContainer: {
      position: 'absolute',
      bottom: 0,
    },
  });

  const mark = line && getLineMark(line);

  const trainTypeName = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return trainType?.nameR.replace(parenthesisRegexp, '') || '';
      case 'ZH':
        return trainType?.nameZh.replace(parenthesisRegexp, '') || '';
      case 'KO':
        return trainType?.nameKo.replace(parenthesisRegexp, '') || '';
      default:
        return trainType?.name.replace(parenthesisRegexp, '') || '';
    }
  }, [
    headerLangState,
    trainType?.name,
    trainType?.nameKo,
    trainType?.nameR,
    trainType?.nameZh,
  ]);

  const [currentStationNumber, threeLetterCode, lineMarkShape] = useNumbering();
  const lineColor = useMemo(() => line && `#${line.lineColorC}`, [line]);
  const numberingColor = useMemo(
    () => getNumberingColor(arrived, currentStationNumber, nextStation, line),
    [arrived, currentStationNumber, line, nextStation]
  );

  const localTrainName = useMemo((): string => {
    switch (headerLangState) {
      case 'EN':
        return 'Local';
      case 'ZH':
        return '慢车';
      case 'KO':
        return '완행열차';
      default:
        return '普通';
    }
  }, [headerLangState]);

  return (
    <View style={styles.root}>
      <VisitorsPanel />
      <View style={styles.top}>
        {mark && mark.sign ? (
          <TransferLineMark
            line={line}
            mark={mark}
            color={numberingColor}
            size="small"
          />
        ) : null}
        {line ? (
          <Text style={styles.trainTypeName}>
            {truncateTrainType(trainTypeName) || localTrainName}
          </Text>
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
    </View>
  );
};

export default HeaderLightweight;
