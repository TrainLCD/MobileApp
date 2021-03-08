import React, { useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRecoilState, useRecoilValue } from 'recoil';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import FAB from '../../components/FAB';
import { isJapanese, translate } from '../../translation';
import Heading from '../../components/Heading';
import stationState from '../../store/atoms/station';
import navigationState from '../../store/atoms/navigation';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
    paddingTop: 24,
  },
});

const TrainTypeSettings: React.FC = () => {
  const { station, stationsWithTrainTypes } = useRecoilValue(stationState);
  const [{ trainType }, setNavigation] = useRecoilState(navigationState);
  const navigation = useNavigation();

  const currentStation = useMemo(
    () => stationsWithTrainTypes.find((s) => station.name === s.name),
    [station.name, stationsWithTrainTypes]
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
    const selectedTrainType = currentStation?.trainTypes?.find(
      (tt) => tt.id === trainTypeId
    );
    setNavigation((prev) => ({
      ...prev,
      trainType: selectedTrainType,
    }));
  };

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

  // 100 = 普通
  // 101 = 各駅停車
  const localType = currentStation?.trainTypes?.find(
    (tt) => tt.id === 100 || tt.id === 101 || tt.id === 300 || tt.id === 301
  );

  return (
    <View style={styles.root}>
      <Heading>{translate('trainTypeSettings')}</Heading>
      <Picker
        selectedValue={trainType?.id}
        onValueChange={handleTrainTypeChange}
      >
        {!localType ? (
          <Picker.Item
            label={isJapanese ? '普通/各駅停車' : 'Local'}
            value={0}
          />
        ) : null}
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
