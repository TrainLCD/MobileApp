import React, { useMemo } from 'react';
import {
  Dimensions,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { useRecoilValue } from 'recoil';
import useAppState from '../../hooks/useAppState';
import useTransferLines from '../../hooks/useTransferLines';
import { Line, Station } from '../../models/StationAPI';
import navigationState from '../../store/atoms/navigation';
import stationState from '../../store/atoms/station';
import isTablet from '../../utils/isTablet';
import omitJRLinesIfThresholdExceeded from '../../utils/jr';
import {
  getNextInboundStopStation,
  getNextOutboundStopStation,
} from '../../utils/nextStation';
import PadArch from './PadArch';

interface Props {
  arrived: boolean;
  line: Line;
  stations: Station[];
}

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

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
  root: {
    flex: 1,
    height: windowHeight,
    bottom: isTablet ? windowHeight / 2.5 : undefined,
  },
  bar: {
    position: 'absolute',
    bottom: 32,
    height: isTablet ? 48 : 32,
  },
  barTerminal: {
    right: isTablet ? 19 : 18,
    bottom: isTablet ? 29.5 : 32,
    width: isTablet ? 42 : 33.7,
    height: isTablet ? 53 : 32,
    position: 'absolute',
  },
  stationNameWrapper: {
    flexDirection: 'row',
    justifyContent: isTablet ? 'space-between' : undefined,
    marginLeft: 32,
    flex: 1,
  },
  stationNameContainer: {
    width: windowWidth / 9,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    bottom: isTablet ? 84 : undefined,
    paddingBottom: !isTablet ? 84 : undefined,
  },
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
  rotatedStationName: {
    width: 'auto',
    transform: [{ rotate: '-55deg' }],
    marginBottom: 8,
    paddingBottom: 0,
    fontSize: 21,
  },
  lineDot: {
    width: isTablet ? 48 : 32,
    height: isTablet ? 36 : 24,
    position: 'absolute',
    zIndex: 9999,
    bottom: isTablet ? -46 : 32 + 4,
    overflow: 'visible',
  },
  chevron: {
    marginLeft: isTablet ? 57 : 38,
    width: isTablet ? 48 : 32,
    height: isTablet ? 48 : 32,
    marginTop: isTablet ? -6 : -4,
  },
  chevronArrived: {
    marginLeft: 0,
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

const LineBoardYamanotePad: React.FC<Props> = ({
  arrived,
  stations,
  line,
}: Props) => {
  const appState = useAppState();
  const {
    station,
    selectedDirection,
    stations: allStations,
  } = useRecoilValue(stationState);
  const { leftStations } = useRecoilValue(navigationState);

  const transferLines = useTransferLines();
  const omittedTransferLines = omitJRLinesIfThresholdExceeded(transferLines);

  const nextStation = useMemo(() => {
    const actualNextStation = leftStations[1];
    const nextInboundStopStation = getNextInboundStopStation(
      allStations,
      actualNextStation,
      station
    );
    const nextOutboundStopStation = getNextOutboundStopStation(
      allStations,
      actualNextStation,
      station
    );

    return selectedDirection === 'INBOUND'
      ? nextInboundStopStation
      : nextOutboundStopStation;
  }, [leftStations, selectedDirection, station, allStations]);

  return (
    <PadArch
      stations={stations.slice().reverse()}
      line={line}
      arrived={arrived}
      appState={appState}
      transferLines={omittedTransferLines}
      nextStation={nextStation}
    />
  );
};

export default LineBoardYamanotePad;
