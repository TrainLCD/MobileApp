import React, { useMemo } from 'react';
import { Platform, StyleProp, StyleSheet, Text, TextStyle } from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilValue } from 'recoil';
import useAppState from '../hooks/useAppState';
import useCurrentLine from '../hooks/useCurrentLine';
import useGetLineMark from '../hooks/useGetLineMark';
import useIsEn from '../hooks/useIsEn';
import useNextStation from '../hooks/useNextStation';
import useTransferLines from '../hooks/useTransferLines';
import { Station } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import isTablet from '../utils/isTablet';
import PadArch from './PadArch';

interface Props {
  stations: Station[];
}

const stationNameEnLineHeight = ((): number => {
  if (Platform.OS === 'android' && !isTablet) {
    return 24;
  }
  if (isTablet) {
    return 28;
  }
  return 21;
})();

const getStationNameEnExtraStyle = (isLast: boolean): StyleProp<TextStyle> => {
  if (!isTablet) {
    return {
      width: 200,
      marginBottom: 70,
    };
  }
  if (isLast) {
    return {
      width: 200,
      marginBottom: 70,
    };
  }
  return {
    width: 250,
    marginBottom: 96,
  };
};

const styles = StyleSheet.create({
  stationName: {
    width: isTablet ? 48 : 32,
    textAlign: 'center',
    fontSize: RFValue(18),
    lineHeight: stationNameEnLineHeight,
    fontWeight: 'bold',
  },
  stationNameEn: {
    fontSize: RFValue(12),
    lineHeight: stationNameEnLineHeight,
    transform: [{ rotate: '-55deg' }],
    fontWeight: 'bold',
    marginLeft: -30,
  },
  grayColor: {
    color: '#ccc',
  },
});

interface StationNameProps {
  station: Station;
  stations: Station[];
  en?: boolean;
  horizonal?: boolean;
  passed?: boolean;
  index: number;
}

const StationName: React.FC<StationNameProps> = ({
  station,
  stations,
  en,
  horizonal,
  passed,
  index,
}: StationNameProps) => {
  if (en) {
    return (
      <Text
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(index === stations.length - 1),
          passed ? styles.grayColor : null,
        ]}
      >
        {station.nameR}
      </Text>
    );
  }
  if (horizonal) {
    return (
      <Text
        style={[
          styles.stationNameEn,
          getStationNameEnExtraStyle(index === stations.length - 1),
          passed ? styles.grayColor : null,
        ]}
      >
        {station.name}
      </Text>
    );
  }
  return (
    <>
      {station.name.split('').map((c, j) => (
        <Text
          style={[styles.stationName, passed ? styles.grayColor : null]}
          key={`${j + 1}${c}`}
        >
          {c}
        </Text>
      ))}
    </>
  );
};

StationName.defaultProps = {
  en: false,
  horizonal: false,
  passed: false,
};

const LineBoardYamanotePad: React.FC<Props> = ({ stations }: Props) => {
  const appState = useAppState();
  const { station, arrived } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const currentLine = useCurrentLine();
  const getLineMarkFunc = useGetLineMark();
  const nextStation = useNextStation();
  const isEn = useIsEn();
  const transferLines = useTransferLines();
  const switchedStation = useMemo(
    () => (arrived && !getIsPass(station) ? station : nextStation ?? null),
    [arrived, nextStation, station]
  );

  const line = useMemo(
    () => currentLine || selectedLine,
    [currentLine, selectedLine]
  );

  const lineMarks = useMemo(
    () =>
      transferLines.map((tl) => {
        if (!switchedStation) {
          return null;
        }
        return getLineMarkFunc(switchedStation, tl);
      }),
    [getLineMarkFunc, switchedStation, transferLines]
  );

  const slicedStations = useMemo(
    () =>
      stations
        .slice()
        .reverse()
        .slice(0, arrived ? stations.length : stations.length - 1),
    [arrived, stations]
  );

  const archStations = useMemo(
    () =>
      new Array(6)
        .fill(null)
        .map((_, i) => slicedStations[slicedStations.length - i])
        .reverse(),
    [slicedStations]
  );

  const numberingInfo = useMemo(
    () =>
      archStations.map((s) => {
        if (!s) {
          return null;
        }
        const lineMarkShape = getLineMarkFunc(s, s.currentLine);
        return s.stationNumbers[0] && lineMarkShape
          ? {
              stationNubmer: s.stationNumbers[0].stationNumber,
              lineColor: `#${
                s.stationNumbers[0]?.lineSymbolColor ?? s.currentLine.lineColorC
              }`,
              lineMarkShape,
            }
          : null;
      }),
    [getLineMarkFunc, archStations]
  );

  if (!line) {
    return null;
  }

  return (
    <PadArch
      stations={archStations}
      line={line}
      arrived={arrived}
      appState={appState}
      transferLines={transferLines}
      station={switchedStation}
      numberingInfo={numberingInfo}
      lineMarks={lineMarks}
      isEn={isEn}
    />
  );
};

export default LineBoardYamanotePad;
