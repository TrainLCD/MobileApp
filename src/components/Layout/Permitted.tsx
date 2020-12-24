import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { useRecoilValue } from 'recoil';
import Header from '../Header';
import WarningPanel from '../WarningPanel';
import DevOverlay from '../DevOverlay';
import useDetectBadAccuracy from '../../hooks/useDetectBadAccuracy';
import { translate } from '../../translation';
import stationState from '../../store/atoms/station';
import locationState from '../../store/atoms/location';
import navigationState from '../../store/atoms/navigation';
import lineState from '../../store/atoms/line';

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
});

type Props = {
  children: React.ReactNode;
};

const PermittedLayout: React.FC<Props> = ({ children }: Props) => {
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [windowHeight, setWindowHeight] = useState(
    Dimensions.get('window').height
  );
  const onLayout = (): void => {
    setWindowHeight(Dimensions.get('window').height);
  };
  const {
    station,
    stations,
    selectedDirection,
    selectedBound,
  } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { location, badAccuracy } = useRecoilValue(locationState);
  const { headerState, leftStations, headerShown } = useRecoilValue(
    navigationState
  );

  useDetectBadAccuracy();

  const warningText = useMemo((): string | null => {
    if (warningDismissed) {
      return null;
    }
    if (badAccuracy) {
      return translate('badAccuracy');
    }
    return null;
  }, [badAccuracy, warningDismissed]);
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
      {/* eslint-disable-next-line no-undef */}
      {__DEV__ && station && location && <DevOverlay location={location} />}
      {station && headerShown && (
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

export default React.memo(PermittedLayout);
