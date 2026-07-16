import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
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
import { portraitModeEnabledAtom } from '~/store/atoms/experimental';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import tuningState from '~/store/atoms/tuning';
import { translate } from '~/translation';
import { STORAGE_KEYS } from '../constants';
import { storage } from '../lib/storage';

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  screenBg: {
    backgroundColor: '#FAFAFA',
  },
  description: {
    marginTop: 16,
    color: '#8B8B8B',
    lineHeight: 21,
  },
  toggleSpacer: {
    marginTop: 16,
  },
  notice: {
    marginTop: 32,
    textAlign: 'center',
    color: '#8B8B8B',
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
  disabled = false,
}: {
  title: string;
  state: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: state, disabled }}
      disabled={disabled}
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: isLEDTheme ? '#333' : 'white',
        borderRadius: isLEDTheme ? 0 : 12,
        // Remote Config で許可されていない等、操作不可のときは淡色にして無効を示す。
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
        {title}
      </Typography>

      <StatePanel state={state} />
    </Pressable>
  );
};

const ExperimentalSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const [portraitModeEnabled, setPortraitModeEnabled] = useAtom(
    portraitModeEnabledAtom
  );
  const [tuning, setTuning] = useAtom(tuningState);

  const navigation = useNavigation();

  const handleTogglePortraitMode = useCallback(() => {
    const flag = !portraitModeEnabled;
    setPortraitModeEnabled(flag);
    try {
      storage.set(STORAGE_KEYS.PORTRAIT_MODE_ENABLED, flag ? 'true' : 'false');
    } catch (error) {
      // 保存に失敗したままだと次回起動時に設定が巻き戻るため、
      // UIと永続値の不整合を防ぐべくatom状態をロールバックする
      setPortraitModeEnabled(!flag);
      console.error('Failed to save portrait mode setting', error);
      Alert.alert(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [portraitModeEnabled, setPortraitModeEnabled]);

  const handleToggleTelemetry = useCallback(() => {
    const flag = !tuning.telemetryEnabled;
    setTuning((prev) => ({ ...prev, telemetryEnabled: flag }));
    try {
      storage.set(STORAGE_KEYS.TELEMETRY_ENABLED, flag ? 'true' : 'false');
    } catch (error) {
      setTuning((prev) => ({ ...prev, telemetryEnabled: !flag }));
      console.error('Failed to save telemetry setting', error);
      Alert.alert(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [tuning.telemetryEnabled, setTuning]);

  const handleScroll = useRef(
    RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: true,
    })
  ).current;

  return (
    <>
      <View style={[styles.root, !isLEDTheme && styles.screenBg]}>
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
            title={translate('portraitModeTitle')}
            state={portraitModeEnabled}
            onToggle={handleTogglePortraitMode}
          />
          <Typography style={styles.description}>
            {translate('portraitModeDescription')}
          </Typography>
          <View style={styles.toggleSpacer}>
            <ToggleItem
              title={translate('optInTelemetryTitle')}
              state={tuning.telemetryEnabled}
              onToggle={handleToggleTelemetry}
            />
          </View>
          <Typography style={styles.description}>
            {translate('telemetryDescription')}
          </Typography>
          <Typography style={styles.notice}>
            {translate('experimentalSettingsNotice')}
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
        title={translate('experimentalSettings')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
    </>
  );
};

export default React.memo(ExperimentalSettingsScreen);
