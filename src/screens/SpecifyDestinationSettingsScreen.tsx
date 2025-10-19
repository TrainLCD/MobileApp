import { useNavigation } from '@react-navigation/native';
import { useAtom } from 'jotai';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { type Station, StopCondition } from '~/@types/graphql';
import FAB from '../components/FAB';
import { Heading } from '../components/Heading';
import { StationList } from '../components/StationList';
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
  const [{ stations }, setStationState] = useAtom(stationState);

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
      }));
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    },
    [navigation, setStationState]
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
