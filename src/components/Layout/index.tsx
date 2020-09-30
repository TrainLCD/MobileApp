import React, { useState, memo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import Header from '../Header';
import WarningPanel from '../WarningPanel';
import DevOverlay from '../DevOverlay';
import useDispatchLocation from '../../hooks/useDispatchLocation';
import { TrainLCDAppState } from '../../store';
import useDetectBadAccuracy from '../../hooks/useDetectBadAccuracy';
import isDevMode from '../../devMode';
import { translate } from '../../translation';

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
});

type Props = {
  children: React.ReactNode;
};

const Layout: React.FC<Props> = ({ children }: Props) => {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height
  );
  const onLayout = (): void => {
    setWindowHeight(Dimensions.get('window').height);
  };
  const { station, stations, selectedDirection, selectedBound } = useSelector(
    (state: TrainLCDAppState) => state.station
  );
  const { selectedLine } = useSelector((state: TrainLCDAppState) => state.line);
  const { location, badAccuracy } = useSelector(
    (state: TrainLCDAppState) => state.location
  );
  const { headerState, leftStations } = useSelector(
    (state: TrainLCDAppState) => state.navigation
  );

  const [locationPermissionDenied] = useDispatchLocation();
  useDetectBadAccuracy();

  const getWarningText = (): string | null => {
    if (warningDismissed) {
      return null;
    }
    if (badAccuracy) {
      return translate('badAccuracy');
    }
    if (locationPermissionDenied) {
      return translate('couldNotGetLocation');
    }
    return null;
  };
  const warningText = getWarningText();
  const onWarningPress = (): void => setWarningDismissed(true);

  const rootExtraStyle = {
    height: windowHeight,
  };

  const NullableWarningPanel: React.FC = () =>
    warningText ? (
      <WarningPanel
        dismissible={!!badAccuracy}
        onPress={onWarningPress}
        text={warningText}
      />
    ) : null;

  return (
    <View style={[styles.root, rootExtraStyle]} onLayout={onLayout}>
      {isDevMode && station && location && (
        <DevOverlay gap={station.distance} location={location} />
      )}
      {station && (
        <Header
          state={headerState}
          station={station}
          stations={stations}
          nextStation={leftStations[1]}
          line={selectedLine}
          lineDirection={selectedDirection}
          boundStation={selectedBound}
        />
      )}
      {children}
      <NullableWarningPanel />
    </View>
  );
};

export default memo(Layout);
