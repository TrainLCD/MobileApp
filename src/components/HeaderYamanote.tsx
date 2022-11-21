import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilValue } from 'recoil';
import useValueRef from '../hooks/useValueRef';
import {
  HeaderLangState,
  HeaderTransitionState,
} from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import getCurrentStationIndex from '../utils/currentStationIndex';
import isTablet from '../utils/isTablet';
import katakanaToHiragana from '../utils/kanaToHiragana';
import {
  getIsLoopLine,
  inboundStationForLoopLine,
  isYamanoteLine,
  outboundStationForLoopLine,
} from '../utils/loopLine';
import Clock from './Clock';
import CommonHeaderProps from './CommonHeaderProps';
import VisitorsPanel from './VisitorsPanel';

const styles = StyleSheet.create({
  gradientRoot: {
    paddingRight: 21,
    paddingLeft: 21,
    overflow: 'hidden',
    height: isTablet ? 200 : 120,
    flexDirection: 'row',
  },
  bound: {
    color: '#fff',
    fontWeight: 'bold',
  },
  boundFor: {
    fontSize: RFValue(18),
    color: '#aaa',
  },
  boundForJa: {
    fontSize: RFValue(18),
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  stationName: {
    fontWeight: 'bold',
    color: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  left: {
    flex: 0.3,
    justifyContent: 'center',
    height: isTablet ? 200 : 120,
    marginRight: 24,
  },
  right: {
    flex: 1,
    justifyContent: 'center',
    height: isTablet ? 200 : 120,
  },
  state: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: RFValue(21),
    position: 'absolute',
    top: 12,
  },
  colorBar: {
    width: isTablet ? 48 : 38,
    height: isTablet ? 180 : 110,
    marginRight: 32,
  },
  clockOverride: {
    position: 'absolute',
    top: 8,
    right: Dimensions.get('window').width * 0.25,
  },
});

const HeaderYamanote: React.FC<CommonHeaderProps> = ({
  station,
  nextStation,
  line,
  isLast,
}: CommonHeaderProps) => {
  const [prevState, setPrevState] = useState<HeaderTransitionState>(
    isJapanese ? 'CURRENT' : 'CURRENT_EN'
  );
  const [stateText, setStateText] = useState(translate('nowStoppingAt'));
  const [stationText, setStationText] = useState(station.name);
  const [boundText, setBoundText] = useState('TrainLCD');
  const [stationNameFontSize, setStationNameFontSize] = useState(32);
  const [selectedBoundNameFontSize, setselectedBoundNameFontSize] =
    useState(28);
  const { headerState, trainType } = useRecoilValue(navigationState);
  const { stations, selectedBound, selectedDirection } =
    useRecoilValue(stationState);

  const prevStateRef = useValueRef(prevState);

  const yamanoteLine = useMemo(
    () => (line ? isYamanoteLine(line.id) : undefined),
    [line]
  );
  const osakaLoopLine = useMemo(
    () => (line ? !trainType && line.id === 11623 : undefined),
    [line, trainType]
  );

  const adjustFontSize = useCallback(
    (stationName: string, en?: boolean): void => {
      if (en) {
        setStationNameFontSize(32);
        return;
      }
      if (stationName.length >= 10) {
        setStationNameFontSize(24);
      } else {
        setStationNameFontSize(32);
      }
    },
    []
  );
  const adjustBoundFontSize = useCallback((stationName: string): void => {
    if (stationName.length >= 10) {
      setselectedBoundNameFontSize(18);
    } else if (stationName.length >= 5) {
      setselectedBoundNameFontSize(21);
    } else {
      setselectedBoundNameFontSize(26);
    }
  }, []);

  const headerLangState = useMemo(
    () => headerState.split('_')[1] as HeaderLangState,
    [headerState]
  );

  useEffect(() => {
    if (selectedBound) {
      adjustBoundFontSize(
        headerState.endsWith('_EN') ? selectedBound.nameR : selectedBound.name
      );
    }

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
          setStateText(translate(isLast ? 'soonLast' : 'soon'));
          setStationText(nextStation.name);
          adjustFontSize(nextStation.name);
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonKanaLast' : 'soon'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustFontSize(katakanaToHiragana(nextStation.nameK));
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonEnLast' : 'soonEn'));
          setStationText(nextStation.nameR);
          adjustFontSize(nextStation.nameR, true);
        }
        break;
      case 'ARRIVING_ZH':
        if (nextStation?.nameZh) {
          setStateText(translate(isLast ? 'soonZhLast' : 'soonZh'));
          setStationText(nextStation.nameZh);
          adjustFontSize(nextStation.nameZh);
        }
        break;
      case 'ARRIVING_KO':
        if (nextStation?.nameKo) {
          setStateText(translate(isLast ? 'soonKoLast' : 'soonKo'));
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
        setStateText(translate('nowStoppingAtEn'));
        setStationText(station.nameR);
        adjustFontSize(station.nameR, true);
        break;
      case 'CURRENT_ZH':
        if (!station.nameZh) {
          break;
        }
        setStateText(translate('nowStoppingAtZh'));
        setStationText(station.nameZh);
        adjustFontSize(station.nameZh);
        break;
      case 'CURRENT_KO':
        if (!station.nameKo) {
          break;
        }
        setStateText(translate('nowStoppingAtKo'));
        setStationText(station.nameKo);
        adjustFontSize(station.nameKo);
        break;
      case 'NEXT':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextLast' : 'next'));
          setStationText(nextStation.name);
          adjustFontSize(nextStation.name);
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextKanaLast' : 'nextKana'));
          setStationText(katakanaToHiragana(nextStation.nameK));
          adjustFontSize(katakanaToHiragana(nextStation.nameK));
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextEnLast' : 'nextEn'));
          setStationText(nextStation.nameR);
          adjustFontSize(nextStation.nameR, true);
        }
        break;
      case 'NEXT_ZH':
        if (!station.nameZh) {
          break;
        }
        if (nextStation) {
          setStateText(translate(isLast ? 'nextZhLast' : 'nextZh'));
          setStationText(katakanaToHiragana(nextStation.nameZh));
          adjustFontSize(katakanaToHiragana(nextStation.nameZh));
        }
        break;
      case 'NEXT_KO':
        if (!station.nameKo) {
          break;
        }
        if (nextStation) {
          setStateText(translate(isLast ? 'nextKoLast' : 'nextKo'));
          setStationText(nextStation.nameKo);
          adjustFontSize(katakanaToHiragana(nextStation.nameKo));
        }
        break;
      default:
        break;
    }
    setPrevState(headerState);
  }, [
    line,
    nextStation,
    selectedBound,
    station,
    yamanoteLine,
    osakaLoopLine,
    adjustBoundFontSize,
    stations,
    selectedDirection,
    adjustFontSize,
    prevStateRef,
    headerState,
    headerLangState,
    isLast,
  ]);

  const boundPrefix = (() => {
    switch (headerLangState) {
      case 'EN':
        return 'Bound for';
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

  return (
    <View>
      <LinearGradient
        colors={['#222222', '#212121']}
        style={styles.gradientRoot}
      >
        <VisitorsPanel />
        <View style={styles.left}>
          {boundPrefix !== '' && selectedBound && (
            <Text style={styles.boundFor}>{boundPrefix}</Text>
          )}
          <Text
            style={{
              ...styles.bound,
              fontSize: RFValue(selectedBoundNameFontSize),
            }}
          >
            {boundText}
          </Text>
          {boundSuffix !== '' && selectedBound && (
            <Text style={styles.boundForJa}>{boundSuffix}</Text>
          )}
        </View>
        <View
          style={{
            ...styles.colorBar,
            backgroundColor: `#${line ? line.lineColorC : 'aaa'}`,
          }}
        />
        {stationNameFontSize && (
          <View style={styles.right}>
            <Text style={styles.state}>{stateText}</Text>
            <Text
              style={{
                ...styles.stationName,
                fontSize: RFValue(stationNameFontSize),
              }}
            >
              {stationText}
            </Text>
          </View>
        )}
        <Clock white style={styles.clockOverride} />
      </LinearGradient>
    </View>
  );
};

export default HeaderYamanote;
