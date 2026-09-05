import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  Animated as RNAnimated,
  StyleSheet,
  View,
} from 'react-native';
import Button from '~/components/Button';
import FooterTabBar from '~/components/FooterTabBar';
import { SettingsHeader } from '~/components/SettingsHeader';
import { StatePanel } from '~/components/ToggleButton';
import Typography from '~/components/Typography';
import { useAppColors } from '~/providers/AppColorsProvider';
import { powerSavingLocationEnabledAtom } from '~/store/atoms/battery';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';
import { STORAGE_KEYS } from '../constants';
import { storage } from '../lib/storage';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  description: {
    marginTop: 16,
    lineHeight: 21,
  },
  okButton: {
    width: 128,
    alignSelf: 'center',
    marginTop: 32,
  },
});

const ToggleItem = ({
  title,
  state,
  onToggle,
}: {
  title: string;
  state: boolean;
  onToggle: () => void;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: state }}
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: isLEDTheme ? '#333' : colors.card,
        borderRadius: isLEDTheme ? 0 : 12,
      }}
    >
      <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
        {title}
      </Typography>

      <StatePanel state={state} />
    </Pressable>
  );
};

const BatterySettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const [powerSavingLocationEnabled, setPowerSavingLocationEnabled] = useAtom(
    powerSavingLocationEnabledAtom
  );

  const navigation = useNavigation();

  const handleTogglePowerSavingLocation = useCallback(() => {
    const flag = !powerSavingLocationEnabled;
    setPowerSavingLocationEnabled(flag);
    try {
      storage.set(
        STORAGE_KEYS.POWER_SAVING_LOCATION_ENABLED,
        flag ? 'true' : 'false'
      );
    } catch (error) {
      // 保存に失敗したままだと次回起動時に設定が巻き戻るため、
      // UIと永続値の不整合を防ぐべくatom状態をロールバックする
      setPowerSavingLocationEnabled(!flag);
      console.error('Failed to save power saving location setting', error);
      showDialog(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [powerSavingLocationEnabled, setPowerSavingLocationEnabled]);

  const handleScroll = useRef(
    RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    })
  ).current;

  return (
    <>
      <View
        style={[
          styles.root,
          !isLEDTheme && { backgroundColor: colors.background },
        ]}
      >
        <RNAnimated.ScrollView
          contentContainerStyle={
            headerHeight
              ? { marginTop: headerHeight, paddingBottom: headerHeight }
              : null
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <ToggleItem
            title={translate('powerSavingLocationTitle')}
            state={powerSavingLocationEnabled}
            onToggle={handleTogglePowerSavingLocation}
          />
          <Typography
            style={[styles.description, { color: colors.secondaryText }]}
          >
            {translate(
              // 停車中の測位自動休止(pausesUpdatesAutomatically)はiOS専用の挙動で、
              // Android・webでは効かないため案内文からも外す
              Platform.OS === 'ios'
                ? 'powerSavingLocationDescriptionIOS'
                : 'powerSavingLocationDescriptionAndroid'
            )}
          </Typography>
          <Button
            style={styles.okButton}
            textStyle={{ fontWeight: 'bold' }}
            onPress={() => navigation.goBack()}
          >
            OK
          </Button>
        </RNAnimated.ScrollView>
      </View>
      <SettingsHeader
        title={translate('batterySettings')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
    </>
  );
};

export default React.memo(BatterySettingsScreen);
