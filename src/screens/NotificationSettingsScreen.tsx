import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import { Path, Svg } from 'react-native-svg';
import { useRecoilState, useRecoilValue } from 'recoil';
import type { Station } from '../../gen/proto/stationapi_pb';
import FAB from '../components/FAB';
import Heading from '../components/Heading';
import Typography from '../components/Typography';
import { useThemeStore } from '../hooks/useThemeStore';
import { APP_THEME } from '../models/Theme';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';
import { RFValue } from '../utils/rfValue';

const styles = StyleSheet.create({
  root: {
    width: '100%',
    height: '100%',
    paddingHorizontal: 24,
  },
  itemRoot: {
    width: Dimensions.get('screen').width / 4,
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stationName: {
    flex: 1,
    flexWrap: 'wrap',
    fontSize: RFValue(14),
    fontWeight: 'bold',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 2,
    borderColor: '#555',
    marginRight: 12,
  },
  listContainerStyle: {
    alignSelf: 'center',
    width: '100%',
  },
  headingStyle: {
    marginTop: 24,
    marginBottom: 24,
  },
});

type ListItemProps = {
  item: Station;
  active: boolean;
  isLEDTheme: boolean;
  onPress: () => void;
};

const ListItem: React.FC<ListItemProps> = ({
  active,
  item,
  isLEDTheme,
  onPress,
}: ListItemProps) => {
  const checkboxBorderColor = useMemo(() => {
    return isLEDTheme ? '#fff' : '#333';
  }, [isLEDTheme]);
  const checkmarkFill = useMemo(() => {
    if (isLEDTheme) {
      return '#fff';
    }

    return '#333';
  }, [isLEDTheme]);

  return (
    <View style={styles.itemRoot}>
      <TouchableWithoutFeedback onPress={onPress}>
        <View style={styles.item}>
          <View
            style={{
              ...styles.checkbox,
              borderColor: checkboxBorderColor,
              backgroundColor: isLEDTheme ? '#212121' : 'white',
            }}
          >
            {active && (
              <Svg height="100%" width="100%" viewBox="0 0 24 24">
                <Path
                  fill={checkmarkFill}
                  d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"
                />
              </Svg>
            )}
          </View>
          <Typography style={styles.stationName}>
            {isJapanese ? item.name : item.nameRoman}
          </Typography>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};

const NotificationSettings: React.FC = () => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

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
        text: 'OK',
        onPress: handlePressBack,
        style: 'cancel',
      },
      {
        text: translate('settings'),
        onPress: async () => {
          try {
            await Linking.openSettings();
          } catch (err) {
            openFailedToOpenSettingsAlert();
          }
          handlePressBack();
        },
      },
    ]);
  }, [handlePressBack, openFailedToOpenSettingsAlert]);

  const showAlwaysPermissionNotGrantedAlert = useCallback(() => {
    if (isClip()) {
      return;
    }

    Alert.alert(
      translate('errorTitle'),
      translate('alwaysPermissionRequired'),
      [
        {
          text: 'OK',
          onPress: handlePressBack,
          style: 'cancel',
        },
        {
          text: translate('settings'),
          onPress: async () => {
            try {
              await Location.requestBackgroundPermissionsAsync();
            } catch (err) {
              openFailedToOpenSettingsAlert();
            }
          },
        },
      ]
    );
  }, [handlePressBack, openFailedToOpenSettingsAlert]);

  useEffect(() => {
    const f = async (): Promise<void> => {
      const { granted: notifyPermGranted } =
        await Notifications.requestPermissionsAsync();
      if (!notifyPermGranted) {
        showNotificationNotGrantedAlert();
        return;
      }

      const { granted: bgPermGranted } =
        await Location.getBackgroundPermissionsAsync();
      if (!bgPermGranted) {
        showAlwaysPermissionNotGrantedAlert();
      }
    };
    f();
  }, [showAlwaysPermissionNotGrantedAlert, showNotificationNotGrantedAlert]);

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
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
        <ListItem
          isLEDTheme={isLEDTheme}
          active={isActive}
          onPress={handleListItemPress}
          item={item}
        />
      );
    },
    [isLEDTheme, setNotify, targetStationIds]
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
    <>
      <View style={styles.root}>
        <FlatList
          ListHeaderComponent={listHeaderComponent}
          contentContainerStyle={styles.listContainerStyle}
          numColumns={4}
          data={stations}
          renderItem={renderItem}
          keyExtractor={(item: Station): string => item.id.toString()}
        />
      </View>
      <FAB onPress={handlePressBack} icon="checkmark" />
    </>
  );
};

export default React.memo(NotificationSettings);
