import { useNavigation } from '@react-navigation/native';
import { Effect, pipe } from 'effect';
import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { isClip } from 'react-native-app-clip';
import { Path, Svg } from 'react-native-svg';
import { Heading } from '~/components/Heading';
import type { Station } from '~/@types/graphql';
import { useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import { isJapanese, translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import FAB from '../components/FAB';
import Typography from '../components/Typography';
import notifyState from '../store/atoms/notify';
import stationState from '../store/atoms/station';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  itemRoot: {
    flex: 1,
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
            style={[
              styles.checkbox,
              {
                borderColor: checkboxBorderColor,
                backgroundColor: isLEDTheme ? '#212121' : 'white',
              },
            ]}
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

  const { stations } = useAtomValue(stationState);
  const [{ targetStationIds }, setNotify] = useAtom(notifyState);
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
          } catch (_err) {
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
            } catch (_err) {
              openFailedToOpenSettingsAlert();
            }
          },
        },
      ]
    );
  }, [handlePressBack, openFailedToOpenSettingsAlert]);

  // effectライブラリを使用した権限チェック
  useEffect(() => {
    pipe(
      Effect.promise(() => Notifications.requestPermissionsAsync()),
      Effect.andThen(({ granted: notifyPermGranted }) => {
        if (!notifyPermGranted) {
          showNotificationNotGrantedAlert();
          return;
        }

        return Effect.promise(() =>
          Location.getBackgroundPermissionsAsync()
        ).pipe(
          Effect.andThen(({ granted: bgPermGranted }) => {
            if (!bgPermGranted) {
              showAlwaysPermissionNotGrantedAlert();
            }
          })
        );
      }),
      Effect.runPromise
    );
  }, [showAlwaysPermissionNotGrantedAlert, showNotificationNotGrantedAlert]);

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
      const isActive = !!targetStationIds.find((id) => id === item.id);
      const handleListItemPress = (): void => {
        if (!item.id) {
          return;
        }
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
            targetStationIds: [...prev.targetStationIds, item.id as number],
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
      <SafeAreaView style={styles.root}>
        <FlatList
          ListHeaderComponent={listHeaderComponent}
          numColumns={4}
          data={stations}
          renderItem={renderItem}
          keyExtractor={(item: Station): string => (item.id ?? 0).toString()}
        />
      </SafeAreaView>
      <FAB onPress={handlePressBack} icon="checkmark" />
    </>
  );
};

export default React.memo(NotificationSettings);
