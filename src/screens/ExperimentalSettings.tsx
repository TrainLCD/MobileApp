import { useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue } from 'jotai';
import React, { useCallback, useRef, useState } from 'react';
import {
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
import { useRemoteTTSOverride } from '~/hooks/useRemoteTTSOverride';
import {
  REMOTE_TTS_OVERRIDE,
  type RemoteTTSOverride,
  setRemoteTTSOverride,
} from '~/lib/remoteTTSOverride';
import { useAppColors } from '~/providers/AppColorsProvider';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import tuningState from '~/store/atoms/tuning';
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
  toggleSpacer: {
    marginTop: 16,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: 'bold',
  },
  notice: {
    marginTop: 32,
    textAlign: 'center',
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
  const colors = useAppColors();

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
        backgroundColor: isLEDTheme ? '#333' : colors.card,
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

// 三択の設定項目。トグルでは表せない「自動 / 強制ON / 強制OFF」を、配色設定や
// アナウンス速度と同じく radio ロールで「使用中 / 選択」を出し分けて並べる。
const ChoiceItem = ({
  title,
  state,
  isFirst,
  isLast,
  onSelect,
}: {
  title: string;
  state: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={title}
      accessibilityState={{ checked: state }}
      onPress={onSelect}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: isLEDTheme ? '#333' : colors.card,
        borderTopLeftRadius: isFirst && !isLEDTheme ? 12 : 0,
        borderTopRightRadius: isFirst && !isLEDTheme ? 12 : 0,
        borderBottomLeftRadius: isLast && !isLEDTheme ? 12 : 0,
        borderBottomRightRadius: isLast && !isLEDTheme ? 12 : 0,
      }}
    >
      <Typography style={{ flex: 1, fontSize: 21, fontWeight: 'bold' }}>
        {title}
      </Typography>

      <StatePanel
        state={state}
        onText={translate('inUse')}
        offText={translate('select')}
      />
    </Pressable>
  );
};

const REMOTE_TTS_OVERRIDE_ITEMS: Array<{
  id: RemoteTTSOverride;
  titleKey: string;
}> = [
  { id: REMOTE_TTS_OVERRIDE.AUTO, titleKey: 'remoteTTSOverrideAuto' },
  { id: REMOTE_TTS_OVERRIDE.ON, titleKey: 'remoteTTSOverrideOn' },
  { id: REMOTE_TTS_OVERRIDE.OFF, titleKey: 'remoteTTSOverrideOff' },
];

const ExperimentalSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const [tuning, setTuning] = useAtom(tuningState);
  // 値の情報源はモジュール側のキャッシュなので、画面はローカル state を持たず購読する。
  const remoteTTSOverride = useRemoteTTSOverride();

  const navigation = useNavigation();

  const handleSelectRemoteTTSOverride = useCallback(
    (value: RemoteTTSOverride) => {
      try {
        // 保存に成功したときだけキャッシュが進むため、UI側のロールバックは不要。
        setRemoteTTSOverride(value);
      } catch (error) {
        console.error('Failed to save remote TTS override setting', error);
        showDialog(
          translate('errorTitle'),
          translate('failedToSavePreference')
        );
      }
    },
    []
  );

  const handleToggleUntouchableMode = useCallback(() => {
    const flag = !tuning.untouchableModeEnabled;
    setTuning((prev) => ({ ...prev, untouchableModeEnabled: flag }));
    try {
      storage.set(STORAGE_KEYS.UNTOUCHABLE_MODE_ENABLED, String(flag));
    } catch (error) {
      // 保存に失敗したままだと次回起動時に設定が巻き戻るため、
      // UIと永続値の不整合を防ぐべくatom状態をロールバックする
      setTuning((prev) => ({ ...prev, untouchableModeEnabled: !flag }));
      console.error('Failed to save untouchable mode setting', error);
      showDialog(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [tuning.untouchableModeEnabled, setTuning]);

  const handleToggleTelemetry = useCallback(() => {
    const flag = !tuning.telemetryEnabled;
    setTuning((prev) => ({ ...prev, telemetryEnabled: flag }));
    try {
      storage.set(STORAGE_KEYS.TELEMETRY_ENABLED, flag ? 'true' : 'false');
    } catch (error) {
      setTuning((prev) => ({ ...prev, telemetryEnabled: !flag }));
      console.error('Failed to save telemetry setting', error);
      showDialog(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [tuning.telemetryEnabled, setTuning]);

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
            title={translate('optInTelemetryTitle')}
            state={tuning.telemetryEnabled}
            onToggle={handleToggleTelemetry}
          />
          <Typography
            style={[styles.description, { color: colors.secondaryText }]}
          >
            {translate('telemetryDescription')}
          </Typography>
          <View style={styles.toggleSpacer}>
            <ToggleItem
              title={translate('untouchableModeTitle')}
              state={tuning.untouchableModeEnabled}
              onToggle={handleToggleUntouchableMode}
            />
          </View>
          <Typography
            style={[styles.description, { color: colors.secondaryText }]}
          >
            {translate('untouchableModeDescription')}
          </Typography>
          <Typography style={styles.sectionTitle}>
            {translate('remoteTTSOverrideTitle')}
          </Typography>
          {REMOTE_TTS_OVERRIDE_ITEMS.map((item, index) => (
            <ChoiceItem
              key={item.id}
              title={translate(item.titleKey)}
              state={remoteTTSOverride === item.id}
              isFirst={index === 0}
              isLast={index === REMOTE_TTS_OVERRIDE_ITEMS.length - 1}
              onSelect={() => handleSelectRemoteTTSOverride(item.id)}
            />
          ))}
          <Typography
            style={[styles.description, { color: colors.secondaryText }]}
          >
            {translate('remoteTTSOverrideDescription')}
          </Typography>
          <Typography style={[styles.notice, { color: colors.secondaryText }]}>
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
