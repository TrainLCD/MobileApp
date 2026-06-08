import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  Animated as RNAnimated,
  StyleSheet,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import Button from '~/components/Button';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import { StatePanel } from '~/components/ToggleButton';
import Typography from '~/components/Typography';
import notifyState from '~/store/atoms/notify';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { ASYNC_STORAGE_KEYS } from '../constants';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  screenBg: {
    backgroundColor: '#FAFAFA',
  },
});

const NotificationSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const [{ wrongDirectionNotifyEnabled }, setNotifyState] =
    useAtom(notifyState);

  const navigation = useNavigation();

  const handleToggleWrongDirectionNotify = useCallback(async () => {
    const newValue = !wrongDirectionNotifyEnabled;
    try {
      await AsyncStorage.setItem(
        ASYNC_STORAGE_KEYS.WRONG_DIRECTION_NOTIFY_ENABLED,
        newValue ? 'true' : 'false'
      );
      setNotifyState((prev) => ({
        ...prev,
        wrongDirectionNotifyEnabled: newValue,
      }));
    } catch (error) {
      console.error('Failed to toggle wrong direction notify setting', error);
      Alert.alert(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [wrongDirectionNotifyEnabled, setNotifyState]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.setValue(e.nativeEvent.contentOffset.y);
    },
    [scrollY]
  );

  return (
    <>
      <View style={[styles.root, !isLEDTheme && styles.screenBg]}>
        <Animated.ScrollView
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            headerHeight
              ? { marginTop: headerHeight, paddingBottom: headerHeight }
              : null,
          ]}
        >
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={translate('wrongDirectionNotifyToggle')}
            accessibilityState={{ checked: wrongDirectionNotifyEnabled }}
            onPress={handleToggleWrongDirectionNotify}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 24,
              paddingVertical: 16,
              backgroundColor: isLEDTheme ? '#333' : 'white',
              borderRadius: isLEDTheme ? 0 : 12,
            }}
          >
            <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
              {translate('wrongDirectionNotifyToggle')}
            </Typography>
            <StatePanel state={wrongDirectionNotifyEnabled} />
          </Pressable>
          <Typography
            style={{
              marginTop: 16,
              textAlign: 'center',
              color: '#8B8B8B',
            }}
          >
            {translate('wrongDirectionNotifyDescription')}
          </Typography>
          <Button
            style={{ width: 128, alignSelf: 'center', marginTop: 32 }}
            textStyle={{ fontWeight: 'bold' }}
            onPress={() => navigation.goBack()}
          >
            OK
          </Button>
        </Animated.ScrollView>
      </View>
      <SettingsHeader
        title={translate('notificationSettings')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
    </>
  );
};

export default React.memo(NotificationSettingsScreen);
