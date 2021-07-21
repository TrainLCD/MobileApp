import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRecoilState } from 'recoil';
import { Picker } from '@react-native-picker/picker';
import FAB from '../../components/FAB';
import { isJapanese, translate } from '../../translation';
import Heading from '../../components/Heading';
import stationState from '../../store/atoms/station';
import navigationState from '../../store/atoms/navigation';
import getLocalType from '../../utils/localType';
import { APITrainType } from '../../models/StationAPI';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
});

const TrainTypeSettings: React.FC = () => {
  const [{ station, stationsWithTrainTypes, stations }, setStation] =
    useRecoilState(stationState);
  const [{ trainType }, setNavigation] = useRecoilState(navigationState);
  const navigation = useNavigation();
  const [trainTypes, setTrainTypes] = useState<APITrainType[]>([]);

  const currentStation = useMemo(
    () => stationsWithTrainTypes.find((s) => station.name === s.name),
    [station.name, stationsWithTrainTypes]
  );

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      onPressBack();
      return true;
    });
    return (): void => {
      handler.remove();
    };
  }, [onPressBack, navigation]);

  const handleTrainTypeChange = (trainTypeId: number): void => {
    if (trainTypeId === 0) {
      setNavigation((prev) => ({
        ...prev,
        trainType: null,
      }));
      setStation((prev) => ({
        ...prev,
        stations: [],
      }));
      return;
    }

    const selectedTrainType = currentStation?.trainTypes?.find(
      (tt) => tt.id === trainTypeId
    );
    setStation((prev) => ({
      ...prev,
      stations: [],
    }));
    setNavigation((prev) => ({
      ...prev,
      trainType: selectedTrainType,
    }));
  };

  const localType = getLocalType(currentStation);
  useEffect(() => {
    setTrainTypes([]);
    if (!localType) {
      setTrainTypes([
        {
          id: 0,
          groupId: 0,
          name: '普通/各駅停車',
          nameK: '',
          nameR: 'Local',
          nameZh: '普通/各站停车',
          nameKo: '보통/각역정차',
          stations: [],
          color: '',
          lines: [],
        },
        ...(currentStation?.trainTypes || []),
      ]);
      return;
    }
    setTrainTypes(currentStation?.trainTypes || []);
  }, [currentStation?.trainTypes, localType]);

  if (!currentStation?.trainTypes) {
    return (
      <View style={styles.root}>
        <Heading>{translate('trainTypeSettings')}</Heading>
        <ActivityIndicator
          color="#555"
          size="large"
          style={{ marginTop: 24 }}
        />
        <FAB onPress={onPressBack} icon="md-checkmark" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Heading>{translate('trainTypeSettings')}</Heading>
      <Picker
        selectedValue={trainType?.id}
        onValueChange={handleTrainTypeChange}
      >
        {trainTypes.map((tt) => (
          <Picker.Item
            key={tt.id}
            label={isJapanese ? tt.name : tt.nameR}
            value={tt.id}
          />
        ))}
      </Picker>

      <FAB
        disabled={!stations.length}
        onPress={onPressBack}
        icon="md-checkmark"
      />
    </View>
  );
};

export default TrainTypeSettings;
