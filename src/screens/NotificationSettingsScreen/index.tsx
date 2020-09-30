import i18n from 'i18n-js';
import React, { useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableWithoutFeedback,
  VirtualizedList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';
import Heading from '../../components/Heading';
import getTranslatedText from '../../utils/translate';
import { TrainLCDAppState } from '../../store';
import { Station } from '../../models/StationAPI';
import {
  addNotifyStationId,
  removeNotifyStationId,
} from '../../store/actions/notify';
import FAB from '../../components/FAB';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
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
    marginTop: 24,
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
            {i18n.locale === 'ja' ? item.name : item.nameR}
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </View>
  )
);

const NotificationSettingsScreen: React.FC = () => {
  const { stations } = useSelector((state: TrainLCDAppState) => state.station);
  const { targetStationIds } = useSelector(
    (state: TrainLCDAppState) => state.notify
  );
  const dispatch = useDispatch();
  const navigation = useNavigation();

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
          dispatch(removeNotifyStationId(item.id));
        } else {
          dispatch(addNotifyStationId(item.id));
        }
      };
      return (
        <ListItem active={isActive} onPress={handleListItemPress} item={item} />
      );
    },
    [dispatch, targetStationIds]
  );

  const getItemCount = useCallback(() => stations.length, [stations.length]);
  const getItem = useCallback(
    (data: Station, index: number) => data[index],
    []
  );

  const listHeaderComponent = useCallback(
    () => (
      <Heading style={styles.headingStyle}>
        {getTranslatedText('notifySettingsTitle')}
      </Heading>
    ),
    []
  );

  return (
    <>
      <SafeAreaView style={styles.root}>
        <VirtualizedList
          ListHeaderComponent={listHeaderComponent}
          contentContainerStyle={styles.listContainerStyle}
          getItemCount={getItemCount}
          getItem={getItem}
          data={stations}
          renderItem={renderItem}
          keyExtractor={(item: Station): string => item.id}
        />
      </SafeAreaView>
      <FAB onPress={onPressBack} icon="md-save" />
    </>
  );
};

export default NotificationSettingsScreen;
