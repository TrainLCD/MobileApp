import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { Path, Svg } from 'react-native-svg';
import { useRecoilState, useRecoilValue } from 'recoil';
import FAB from '../components/FAB';
import Heading from '../components/Heading';
import { Station } from '../models/StationAPI';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    height: '100%',
  },
  itemRoot: {
    width: Dimensions.get('window').width / 4,
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationName: {
    fontSize: RFValue(14),
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
          {isJapanese ? item.name : item.nameR}
        </Text>
      </View>
    </TouchableWithoutFeedback>
  </View>
);

const NotificationSettings: React.FC = () => {
  const { stations } = useRecoilValue(stationState);
  const [{ targetStationIds }, setNotify] = useRecoilState(notifyState);
  const navigation = useNavigation();

  const handlePressBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const openFailedToOpenSettingsAlert = useCallback(
    () =>
      Alert.alert(translate('errorTitle'), translate('failedToOpenSettings'), [
        {
          text: 'OK',
        },
      ]),
    []
  );

  const showNotificationNotGrantedAlert = useCallback(() => {
    Alert.alert(translate('errorTitle'), translate('notificationNotGranted'), [
      {
        text: translate('back'),
        onPress: handlePressBack,
        style: 'cancel',
      },
      {
        text: translate('settings'),
        onPress: async (): Promise<void> => {
          Linking.openSettings().catch(() => {
            openFailedToOpenSettingsAlert();
          });
        },
      },
    ]);
  }, [handlePressBack, openFailedToOpenSettingsAlert]);

  useEffect(() => {
    const f = async (): Promise<void> => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
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

  const listHeaderComponent = () => (
    <Heading style={styles.headingStyle}>
      {translate('notifySettingsTitle')}
    </Heading>
  );

  return (
    <View style={styles.root}>
      <FlatList
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={styles.listContainerStyle}
        numColumns={4}
        data={stations}
        renderItem={renderItem}
        keyExtractor={(item: Station): string => item.id.toString()}
      />
      <FAB onPress={onPressBack} icon="md-checkmark" />
    </View>
  );
};

export default NotificationSettings;
