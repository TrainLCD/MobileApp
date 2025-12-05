import { useAtomValue } from 'jotai';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LED_THEME_BG_COLOR, STATION_NAME_FONT_SIZE } from '../constants';
import {
  useCurrentStation,
  useIsNextLastStop,
  useNextStation,
  useNumbering,
} from '../hooks';
import type { HeaderLangState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { translate } from '../translation';
import Typography from './Typography';

const styles = StyleSheet.create({
  root: {
    backgroundColor: LED_THEME_BG_COLOR,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  state: {
    width: '20%',
    fontSize: STATION_NAME_FONT_SIZE / 1.5,
    color: 'green',
    textAlign: 'right',
  },
  stationNameContainer: {
    width: '80%',
    display: 'flex',
    flexDirection: 'row',
    textAlign: 'center',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  flexColumn: {
    flexDirection: 'column',
  },
  stationName: {
    fontSize: STATION_NAME_FONT_SIZE,
    textAlign: 'center',
    color: 'orange',
  },
  stationNumbering: {
    fontSize: STATION_NAME_FONT_SIZE * 0.75,
    textAlign: 'center',
    color: 'orange',
  },
  stationNameLetter: {
    fontSize: STATION_NAME_FONT_SIZE,
    color: 'orange',
  },
});

const HeaderLED = () => {
  const station = useCurrentStation();
  const nextStation = useNextStation();
  const isLast = useIsNextLastStop();
  const [nextStationNumber] = useNumbering();
  const [currentStationNumber] = useNumbering(true);
  const dim = useWindowDimensions();

  const { selectedBound } = useAtomValue(stationState);
  const { headerState } = useAtomValue(navigationState);

  const [stateText, setStateText] = useState('');
  const [stationText, setStationText] = useState(station?.name || '');

  useEffect(() => {
    if (!selectedBound && station) {
      setStateText('');
      setStationText(station.name || '');
    }

    switch (headerState) {
      case 'ARRIVING':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonLast' : 'soon'));
          setStationText(nextStation.name || '');
        }
        break;
      case 'ARRIVING_KANA':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonLast' : 'soon'));
          setStationText(nextStation.nameKatakana ?? '');
        }
        break;
      case 'ARRIVING_EN':
        if (nextStation) {
          setStateText(translate(isLast ? 'soonEnLast' : 'soonEn'));
          setStationText(nextStation?.nameRoman ?? '');
        }
        break;
      case 'CURRENT':
        if (station) {
          setStateText(translate('nowStoppingAt'));
          setStationText(station.name || '');
        }
        break;
      case 'CURRENT_KANA':
        if (station) {
          setStateText(translate('nowStoppingAt'));
          setStationText(station.nameKatakana ?? '');
        }
        break;
      case 'CURRENT_EN':
        if (station) {
          setStateText('');
          setStationText(station?.nameRoman ?? '');
        }
        break;
      case 'NEXT':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextLast' : 'next'));
          setStationText(nextStation.name || '');
        }
        break;
      case 'NEXT_KANA':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextLast' : 'next'));
          setStationText(nextStation.nameKatakana ?? '');
        }
        break;
      case 'NEXT_EN':
        if (nextStation) {
          setStateText(translate(isLast ? 'nextEnLast' : 'nextEn'));
          setStationText(nextStation?.nameRoman ?? '');
        }
        break;
      default:
        break;
    }
  }, [headerState, isLast, nextStation, selectedBound, station]);

  const rootHeight = useMemo(() => {
    if (!selectedBound) {
      return dim.height / 3;
    }
    return dim.height / 1.5;
  }, [selectedBound, dim.height]);

  const headerLangState = useMemo(
    () =>
      headerState.split('_')[1]?.length
        ? (headerState.split('_')[1] as HeaderLangState)
        : ('JA' as HeaderLangState),
    [headerState]
  );

  const stationTextBlocks = useMemo(
    () =>
      headerLangState === 'JA' || headerLangState === 'KANA'
        ? stationText
            .split('')
            .map((letter, index) => ({ letter, key: `${index}:${letter}` }))
        : [],
    [headerLangState, stationText]
  );

  const numberingText = useMemo(() => {
    const stoppingState = headerState.split('_')[0];
    if (stoppingState === 'CURRENT') {
      return currentStationNumber
        ? `(${currentStationNumber?.stationNumber})`
        : '';
    }
    return nextStationNumber ? `(${nextStationNumber?.stationNumber})` : '';
  }, [currentStationNumber, headerState, nextStationNumber]);

  return (
    <View style={[styles.root, { height: rootHeight }]}>
      {stateText.length ? (
        <Typography style={styles.state}>{stateText}</Typography>
      ) : null}

      <View style={styles.stationNameContainer}>
        {stationTextBlocks.length ? (
          stationTextBlocks.map(({ letter, key }) => (
            <Typography key={key} style={styles.stationNameLetter}>
              {letter}
            </Typography>
          ))
        ) : (
          <View style={styles.flexColumn}>
            <Typography style={styles.stationName}>{stationText}</Typography>
            {headerLangState === 'EN' && numberingText.length ? (
              <Typography style={styles.stationNumbering}>
                {numberingText}
              </Typography>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
};

export default React.memo(HeaderLED);
