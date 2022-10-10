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
  isMeijoLine,
  isOsakaLoopLine,
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

  const yamanoteLine = line ? isYamanoteLine(line.id) : undefined;
  const osakaLoopLine = line
    ? !trainType && isOsakaLoopLine(line.id)
    : undefined;

  const adjustScale = useCallback((stationName: string, en?: boolean): void => {
    setStationNameScale(getStationNameScale(stationName, en));
  }, []);

  const headerLangState = headerState.split('_')[1] as HeaderLangState;
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
        return '행';
      default:
        return getIsLoopLine(line, trainType) ? '方面' : 'ゆき';
    }
  }, [headerLangState, line, trainType]);

  const meijoLineBoundText = useMemo(() => {
    if (selectedDirection === 'INBOUND') {
      switch (headerLangState) {
        case 'EN':
          return 'Meijo Line Clockwise';
        case 'ZH':
          return '名城线 右环';
        case 'KO':
          return '메이조선 우회전';
        default:
          return '名城線 右回り';
      }
    }
    switch (headerLangState) {
      case 'EN':
        return 'Meijo Line Counterclockwise';
      case 'ZH':
        return '名城线 左环';
      case 'KO':
        return '메이조선 좌회전';
      default:
        return '名城線 左回り';
    }
  }, [headerLangState, selectedDirection]);

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
    if (!line || !selectedBound) {
      setBoundText('TrainLCD');
    } else if (isMeijoLine(line.id)) {
      setBoundText(meijoLineBoundText);
    } else if ((yamanoteLine || osakaLoopLine) && !trainType) {
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
    } else if (selectedBoundName) {
      setBoundText(selectedBoundName);
    }

    switch (headerState) {
      case 'ARRIVING':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonLast' : 'soon'));
          setStationText(nextStation.name);
          adjustScale(nextStation.name);
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonKanaLast' : 'soon'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustScale(nextStation.nameK);
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonEnLast' : 'soonEn'));
          setStationText(nextStation.nameR);
          adjustScale(nextStation.nameR, true);
        }
        break;
      case 'ARRIVING_ZH':
        if (nextStation?.nameZh) {
          setStateText(translate(isLast ? 'soonZhLast' : 'soonZh'));
          setStationText(nextStation.nameZh);
          adjustScale(nextStation.nameZh);
        }
        break;
      case 'ARRIVING_KO':
        if (nextStation?.nameKo) {
          setStateText(translate(isLast ? 'soonKoLast' : 'soonKo'));
          setStationText(nextStation.nameKo);
          adjustScale(nextStation.nameKo);
        }
        break;
      case 'CURRENT':
        setStateText(translate('nowStoppingAt'));
        setStationText(station.name);
        adjustScale(station.name);

        break;
      case 'CURRENT_KANA':
        setStateText(translate('nowStoppingAt'));
        setStationText(katakanaToHiragana(station.nameK));
        adjustScale(station.nameK);

        break;
      case 'CURRENT_EN':
        setStateText('');
        setStationText(station.nameR);
        adjustScale(station.nameR, true);

        break;
      case 'CURRENT_ZH':
        if (!station.nameZh) {
          break;
        }

        setStateText('');
        setStationText(station.nameZh);
        adjustScale(station.nameZh);

        break;
      case 'CURRENT_KO':
        if (!station.nameKo) {
          break;
        }

        setStateText('');
        setStationText(station.nameKo);
        adjustScale(station.nameKo);

        break;
      case 'NEXT':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextLast' : 'next'));
          setStationText(nextStation.name);
          adjustScale(nextStation.name);
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextKanaLast' : 'nextKana'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustScale(nextStation.nameK);
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextEnLast' : 'nextEn'));
          setStationText(nextStation.nameR);
          adjustScale(nextStation.nameR, true);
        }
        break;
      case 'NEXT_ZH':
        if (nextStation?.nameZh) {
          setStateText(translate(isLast ? 'nextZhLast' : 'nextZh'));
          setStationText(nextStation.nameZh);
          adjustScale(nextStation.nameZh);
        }
        break;
      case 'NEXT_KO':
        if (nextStation?.nameKo) {
          setStateText(translate(isLast ? 'nextKoLast' : 'nextKo'));
          setStationText(nextStation.nameKo);
          adjustScale(nextStation.nameKo);
        }
        break;
      default:
        break;
    }
  }, [
    adjustScale,
    headerLangState,
    headerState,
    isLast,
    line,
    meijoLineBoundText,
    nextStation,
    osakaLoopLine,
    selectedBound,
    selectedBoundName,
    selectedDirection,
    station,
    stations,
    trainType,
    yamanoteLine,
  ]);

  const boundStationNameScale = useMemo(
    () =>
      getStationNameScale(
        (isJapanese ? selectedBound?.name : selectedBound?.nameR) || '',
        !isJapanese
      ),
    [selectedBound?.name, selectedBound?.nameR]
  );

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
