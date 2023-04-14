import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { useRecoilCallback, useRecoilValue } from 'recoil';
import FAB from '../components/FAB';
import Heading from '../components/Heading';
import useCurrentStation from '../hooks/useCurrentStation';
import { APITrainType, TRAIN_DIRECTION } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import { findLocalType, getIsChuoLineRapid } from '../utils/localType';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
});

const TrainTypeSettings: React.FC = () => {
  const { selectedLine } = useRecoilValue(lineState);
  const { trainType } = useRecoilValue(navigationState);
  const navigation = useNavigation();
  const [trainTypes, setTrainTypes] = useState<APITrainType[]>([]);

  const currentStation = useCurrentStation({ withTrainTypes: true });

  const items = useMemo(
    () =>
      trainTypes.map((tt) => ({
        label: isJapanese
          ? tt.name.replace(/\n/g, '')
          : tt.nameR.replace(/\n/g, ''),
        value: tt.id,
      })) ?? [],
    [trainTypes]
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
  }, [onPressBack]);

  const handleTrainTypeChange = useRecoilCallback(
    ({ set }) =>
      (trainTypeIdStr: string) => {
        const trainTypeId = Number(trainTypeIdStr);
        if (trainTypeId === 0) {
          set(navigationState, (prev) => ({
            ...prev,
            trainType: null,
          }));
          set(stationState, (prev) => ({
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

        set(navigationState, (prev) => ({
          ...prev,
          trainType: selectedTrainType,
        }));
      },
    [currentStation?.trainTypes]
  );

  useEffect(() => {
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
          direction: TRAIN_DIRECTION.BOTH,
        },
        ...(currentStation?.trainTypes || []),
      ]);
      return;
    }

    setTrainTypes(currentStation?.trainTypes || []);
  }, [currentStation, currentStation?.trainTypes, selectedLine]);

  if (!items.length) {
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
        selectedValue={trainType?.id.toString()}
        onValueChange={handleTrainTypeChange}
      >
        {items.map((it) => (
          <Picker.Item
            key={it.value}
            label={it.label}
            value={it.value.toString()}
          />
        ))}
      </Picker>
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </View>
  );
};

export default TrainTypeSettings;
