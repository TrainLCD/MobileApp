import i18n from 'i18n-js';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Path, Svg } from 'react-native-svg';
import Heading from '../../components/Heading';
import getTranslatedText from '../../utils/translate';
import Button from '../../components/Button';
import { TrainLCDAppState } from '../../store';
import { Station } from '../../models/StationAPI';
import {
  addNotifyStationId,
  removeNotifyStationId,
} from '../../store/actions/notify';

const styles = StyleSheet.create({
  rootPadding: {
    padding: 24,
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
});

type ListItemProps = {
  item: Station;
  active: boolean;
  onPress: () => void;
};

const ListItem: React.FC<ListItemProps> = ({
  active,
  item,
  onPress,
}: ListItemProps) => (
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
);

const NotificationSettingsScreen: React.FC = () => {
  const { stations } = useSelector((state: TrainLCDAppState) => state.station);
  const { targetStationIds } = useSelector(
    (state: TrainLCDAppState) => state.notify
  );
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [isToggled, setIsToggled] = useState(false);

  const onPressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleToggleAll = useCallback(() => {
    stations.forEach((s) =>
      isToggled
        ? dispatch(removeNotifyStationId(s.id))
        : dispatch(addNotifyStationId(s.id))
    );
    setIsToggled((prev) => !prev);
  }, [dispatch, isToggled, stations]);

  const renderItem: React.FC<{ item: Station }> = ({
    item,
  }: {
    item: Station;
  }) => {
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
  };

  return (
    <SafeAreaView>
      <ScrollView contentContainerStyle={styles.rootPadding}>
        <Heading>{getTranslatedText('notifySettingsTitle')}</Heading>
        <View style={styles.main}>
          <View style={styles.settingItem}>
            <Button onPress={handleToggleAll}>
              {getTranslatedText('toggleAll')}
            </Button>
          </View>
          <FlatList
            data={stations}
            renderItem={renderItem}
            keyExtractor={(item: Station): string => item.id}
          />
        </View>
        <View style={[styles.settingItem, styles.backButton]}>
          <Button onPress={onPressBack}>{getTranslatedText('save')}</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default NotificationSettingsScreen;
