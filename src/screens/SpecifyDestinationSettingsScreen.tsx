import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRecoilState } from 'recoil';
import { type Station, StopCondition } from '../../gen/proto/stationapi_pb';
import FAB from '../components/FAB';
import Heading from '../components/Heading';
import { StationList } from '../components/StationList';
import { useGetStationsWithTermination } from '../hooks/useGetStationsWithTermination';
import stationState from '../store/atoms/station';
import { translate } from '../translation';
import dropEitherJunctionStation from '../utils/dropJunctionStation';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 48,
    flex: 1,
    paddingVertical: 12,
  },
  listContainer: {
    flex: 1,
    width: '65%',
    alignSelf: 'center',
  },
});

const SpecifyDestinationSettingsScreen: React.FC = () => {
  const [{ stations }, setStationState] = useRecoilState(stationState);
  const getTerminatedStations = useGetStationsWithTermination();

  const stopStations = useMemo(
    () =>
      dropEitherJunctionStation(stations).filter(
        (s) => s.stopCondition !== StopCondition.Not
      ),
    [stations]
  );

  const navigation = useNavigation();

  const handleDestinationPress = useCallback(
    (destination: Station) => {
      setStationState((prev) => ({
        ...prev,
        wantedDestination: destination,
        stations: getTerminatedStations(destination, stations),
      }));
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    },
    [getTerminatedStations, navigation, setStationState, stations]
  );

  const handlePressFAB = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <View style={styles.root}>
      <Heading>{translate('selectBoundSettings')}</Heading>
      <View style={styles.listContainer}>
        <StationList data={stopStations} onSelect={handleDestinationPress} />
      </View>
      <FAB onPress={handlePressFAB} icon="close" />
    </View>
  );
};

export default React.memo(SpecifyDestinationSettingsScreen);
