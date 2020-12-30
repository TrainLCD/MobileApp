import React, { useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableWithoutFeedback,
  VirtualizedList,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Path, Svg } from 'react-native-svg';
import { useRecoilState, useRecoilValue } from 'recoil';
import Heading from '../../components/Heading';
import { Station } from '../../models/StationAPI';
import FAB from '../../components/FAB';
import { isJapanese, translate } from '../../translation';
import stationState from '../../store/atoms/station';
import notifyState from '../../store/atoms/notify';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  main: {
    marginTop: 24,
  },
  settingItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    marginBottom: 32,
  },
  itemRoot: {
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkbox: {
    width: 24,
    height: 24,
    backgroundColor: 'white',
    borderWidth: 2,
    borderRadius: 2,
    borderColor: '#555',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#555',
  },
  listContainerStyle: {
    paddingBottom: 24,
  },
  headingStyle: {
    marginVertical: 24,
  },
});

type ListItemProps = {
  item: Station;
  active: boolean;
  onPress: () => void;
};

const ListItem: React.FC<ListItemProps> = React.memo(
  ({ active, item, onPress }: ListItemProps) => (
    <View style={styles.itemRoot}>
      <TouchableWithoutFeedback onPress={onPress}>
        <View style={styles.item}>
          <View style={styles.checkbox}>
            {active && (
              <Svg height="100%" width="100%" viewBox="0 0 24 24">
                <Path
                  fill="#333"
                  d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"
                />
              </Svg>
            )}
          </View>
          <Text style={styles.stationName}>
            {isJapanese ? item.name : item.nameR}
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  )
);

const NotificationSettingsScreen: React.FC = () => {
  const { stations } = useRecoilValue(stationState);
  const [{ targetStationIds }, setNotify] = useRecoilState(notifyState);
  const navigation = useNavigation();

  const openFailedToOpenSettingsAlert = useCallback(
    () =>
      Alert.alert(translate('errorTitle'), translate('failedToOpenSettings'), [
        {
          text: 'OK',
        },
      ]),
    []
  );

  useEffect(() => {
    if (Platform.OS === 'android') {
      const f = async (): Promise<void> => {
        const firstOpenPassed = await AsyncStorage.getItem(
          '@TrainLCD:dozeConfirmed'
        );
        if (firstOpenPassed === null) {
          Alert.alert(translate('notice'), translate('dozeAlertText'), [
            {
              text: 'OK',
              onPress: async (): Promise<void> => {
                await AsyncStorage.setItem('@TrainLCD:dozeConfirmed', 'true');
              },
            },
            {
              text: translate('settings'),
              onPress: async (): Promise<void> => {
                Linking.openSettings().catch(() => {
                  openFailedToOpenSettingsAlert();
                });
                await AsyncStorage.setItem('@TrainLCD:dozeConfirmed', 'true');
              },
            },
          ]);
        }
      };
      f();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const renderItem: React.FC<{ item: Station }> = useCallback(
    ({ item }) => {
      const isActive = !!targetStationIds.find((id) => id === item.id);
      const handleListItemPress = (): void => {
        if (isActive) {
          setNotify((prev) => ({
            ...prev,
            targetStationIds: prev.targetStationIds.filter(
              (id) => id !== item.id
            ),
          }));
        } else {
          setNotify((prev) => ({
            ...prev,
            targetStationIds: [...targetStationIds, item.id],
          }));
        }
      };
      return (
        <ListItem active={isActive} onPress={handleListItemPress} item={item} />
      );
    },
    [setNotify, targetStationIds]
  );

  const getItemCount = useCallback(() => stations.length, [stations.length]);
  const getItem = useCallback(
    (data: Station, index: number) => data[index],
    []
  );

  const listHeaderComponent = useCallback(
    () => (
      <Heading style={styles.headingStyle}>
        {translate('notifySettingsTitle')}
      </Heading>
    ),
    []
  );

  return (
    <View style={styles.root}>
      <VirtualizedList
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={styles.listContainerStyle}
        getItemCount={getItemCount}
        getItem={getItem}
        data={stations}
        renderItem={renderItem}
        keyExtractor={(item: Station): string => item.id.toString()}
      />
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </View>
  );
};

export default NotificationSettingsScreen;
