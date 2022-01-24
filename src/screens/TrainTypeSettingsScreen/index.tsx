import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import FAB from '../../components/FAB';
import Heading from '../../components/Heading';
import PickerChevronIcon from '../../components/PickerChevronIcon';
import usePickerStyle from '../../hooks/usePickerStyle';
import { APITrainType, TrainDirection } from '../../models/StationAPI';
import lineState from '../../store/atoms/line';
import navigationState from '../../store/atoms/navigation';
import stationState from '../../store/atoms/station';
import { isJapanese, translate } from '../../translation';
import { findLocalType, getIsChuoLineRapid } from '../../utils/localType';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
});

const TrainTypeSettings: React.FC = () => {
  const [{ station, stationsWithTrainTypes }, setStation] =
    useRecoilState(stationState);
  const { selectedLine } = useRecoilValue(lineState);
  const [{ trainType }, setNavigation] = useRecoilState(navigationState);
  const navigation = useNavigation();
  const [trainTypes, setTrainTypes] = useState<APITrainType[]>([]);

  const pickerStyle = usePickerStyle();

  const currentStation = useMemo(
    () => stationsWithTrainTypes.find((s) => station?.groupId === s.groupId),
    [station?.groupId, stationsWithTrainTypes]
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

  const handleTrainTypeChange = useRecoilCallback(
    ({ set, snapshot }) =>
      async (trainTypeId: number): Promise<void> => {
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
        if (!selectedTrainType) {
          return;
        }

        const prev = await snapshot.getPromise(navigationState);
        set(navigationState, { ...prev, trainType: selectedTrainType });
      },
    [currentStation?.trainTypes, setNavigation, setStation]
  );

  useEffect(() => {
    if (!currentStation) {
      return;
    }
    const localType = findLocalType(currentStation);

    setTrainTypes([]);

    // 中央線快速に各停の種別が表示されないようにしたい
    if (getIsChuoLineRapid(selectedLine)) {
      setTrainTypes(currentStation?.trainTypes || []);
      return;
    }

    if (!localType) {
      setTrainTypes([
        {
          id: 0,
          typeId: 0,
          groupId: 0,
          name: '普通/各駅停車',
          nameK: '',
          nameR: 'Local',
          nameZh: '慢车/每站停车',
          nameKo: '보통/각역정차',
          stations: [],
          color: '',
          lines: [],
          allTrainTypes: [],
          direction: TrainDirection.BOTH,
        },
        ...(currentStation?.trainTypes || []),
      ]);
      return;
    }

    setTrainTypes(currentStation?.trainTypes || []);
  }, [currentStation, selectedLine]);

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
      <RNPickerSelect
        value={trainType?.id}
        onValueChange={handleTrainTypeChange}
        placeholder={{}}
        key="id"
        items={trainTypes.map((tt) => ({
          label: isJapanese
            ? tt.name.replace(/\n/g, '')
            : tt.nameR.replace(/\n/g, ''),
          value: tt.id,
        }))}
        doneText={translate('pickerDone')}
        style={pickerStyle}
        Icon={PickerChevronIcon}
      />
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </View>
  );
};

export default TrainTypeSettings;
