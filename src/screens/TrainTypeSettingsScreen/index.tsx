import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRecoilState, useRecoilValue } from 'recoil';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import FAB from '../../components/FAB';
import { isJapanese, translate } from '../../translation';
import Heading from '../../components/Heading';
import stationState from '../../store/atoms/station';
import lineState from '../../store/atoms/line';
import useStationList from '../../hooks/useStationList';
import useStationListByTrainType from '../../hooks/useStationListByTrainType';
import navigationState from '../../store/atoms/navigation';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
});

const TrainTypeSettings: React.FC = () => {
  const [{ station }, setStation] = useRecoilState(stationState);
  const [{ stationsWithTrainTypes, trainType }, setNavigation] = useRecoilState(
    navigationState
  );
  const { selectedLine } = useRecoilValue(lineState);
  const navigation = useNavigation();
  const [
    fetchStationListFunc,
    stationListLoading,
    fetchStationListError,
  ] = useStationList(true);
  const [
    fetchStationListWithoutTrainTypeFunc,
    stationListWithoutTrainTypeLoading,
    fetchStationWithoutTrainTypeListError,
  ] = useStationList(false);
  const [
    fetchStationListByTrainTypeFunc,
    fetchStationListByTrainTypeLoading,
    fetchStationListByTrainTypeError,
  ] = useStationListByTrainType();

  // stationにはstationByCoordsで取った値が入っているのでtrainTypesが入ってない
  const currentStation = useMemo(() => {
    return stationsWithTrainTypes.find((s) => station.groupId === s.groupId);
  }, [station.groupId, stationsWithTrainTypes]);

  useFocusEffect(
    useCallback(() => {
      fetchStationListFunc(selectedLine.id);
    }, [fetchStationListFunc, selectedLine.id])
  );

  const handlePressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const showNotificationNotGrantedAlert = useCallback(() => {
    Alert.alert(translate('notice'), translate('trainTypeIsBetaAlert'), [
      {
        text: translate('back'),
        onPress: handlePressBack,
        style: 'cancel',
      },
      {
        text: 'OK',
        onPress: (): void => {
          AsyncStorage.setItem('@TrainLCD:trainTypeCautionViewed', 'true');
        },
      },
    ]);
  }, [handlePressBack]);

  useEffect(() => {
    const f = async (): Promise<void> => {
      const cautionViewed = await AsyncStorage.getItem(
        '@TrainLCD:trainTypeCautionViewed'
      );
      if (!cautionViewed) {
        showNotificationNotGrantedAlert();
      }
    };
    f();
  }, [showNotificationNotGrantedAlert]);

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleTrainTypeChange = (trainTypeId: number): void => {
    const selectedTrainType = currentStation.trainTypes?.find(
      (tt) => tt.id === trainTypeId
    );
    setNavigation((prev) => ({
      ...prev,
      trainType: selectedTrainType,
    }));
    if (selectedTrainType?.groupId) {
      fetchStationListByTrainTypeFunc(selectedTrainType.groupId);
    } else {
      setStation((prev) => ({
        ...prev,
        stations: [],
      }));
      fetchStationListWithoutTrainTypeFunc(selectedLine.id);
    }
  };

  if (
    fetchStationListByTrainTypeLoading ||
    stationListWithoutTrainTypeLoading ||
    (stationListLoading && !currentStation?.trainTypes)
  ) {
    return (
      <View style={styles.root}>
        <Heading>{translate('trainTypeSettings')}</Heading>
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
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
        <Picker.Item label={isJapanese ? '普通/各駅停車' : 'Local'} value={0} />
        {currentStation?.trainTypes?.map((tt) => (
          <Picker.Item
            key={tt.id}
            label={isJapanese ? tt.name : tt.nameR}
            value={tt.id}
          />
        ))}
      </Picker>

      <FAB onPress={onPressBack} icon="md-checkmark" />
    </View>
  );
};

export default TrainTypeSettings;
