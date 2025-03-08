import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, SafeAreaView, StyleSheet, View } from 'react-native';
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
    flex: 1,
  },
  heading: { marginTop: 12 },
  listContainer: {
    flex: 1,
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

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handlePressFAB();
      return true;
    });
    return (): void => {
      handler.remove();
    };
  }, [handlePressFAB]);

  return (
    <SafeAreaView style={styles.root}>
      <Heading style={styles.heading}>
        {translate('selectBoundSettings')}
      </Heading>
      <View style={styles.listContainer}>
        <StationList data={stopStations} onSelect={handleDestinationPress} />
      </View>
      <FAB onPress={handlePressFAB} icon="close" />
    </SafeAreaView>
  );
};

export default React.memo(SpecifyDestinationSettingsScreen);
