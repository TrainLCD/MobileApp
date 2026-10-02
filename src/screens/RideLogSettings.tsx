import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { deleteAllRideLogs, hasRideLogs } from '~/lib/rideLog';
import { useAppColors } from '~/providers/AppColorsProvider';
import {
  rideLogEnabledAtom,
  rideLogSettingsSeenAtom,
} from '~/store/atoms/rideLog';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';
import { STORAGE_KEYS } from '../constants';
import { storage } from '../lib/storage';

const DESTRUCTIVE_TEXT_COLOR = '#FF3B30';
// 記録が無いときの「記録をすべて削除」の不透明度
const DISABLED_OPACITY = 0.4;

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 24,
    flex: 1,
  },
  description: {
    marginTop: 16,
    lineHeight: 21,
  },
  sectionTitle: {
    marginTop: 32,
    marginBottom: 12,
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemText: {
    flex: 1,
    fontSize: 21,
    fontWeight: 'bold',
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
      <Typography style={styles.itemText}>{title}</Typography>

      <StatePanel state={state} />
    </Pressable>
  );
};

const RideLogSettingsScreen: React.FC = () => {
  const [headerHeight, setHeaderHeight] = useState(0);

  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colors = useAppColors();
  const [rideLogEnabled, setRideLogEnabled] = useAtom(rideLogEnabledAtom);

  const navigation = useNavigation();

  // 開いた時点で、設定リストとフッターの設定タブの印を消す。永続化と合わせて atom も更新する
  const setSettingsSeen = useSetAtom(rideLogSettingsSeenAtom);
  useEffect(() => {
    setSettingsSeen(true);
    try {
      storage.set(STORAGE_KEYS.RIDE_LOG_SETTINGS_SEEN, 'true');
    } catch (error) {
      // 保存に失敗しても、このセッションでは atom で印を消しておく
      console.error('Failed to save ride log settings seen status', error);
    }
  }, [setSettingsSeen]);

  // 保存済みの記録があるか。読み込み中と読み込みに失敗したときは null にして、
  // 削除を押せるままにする(DB の不具合で記録を消せなくならないようにする)
  const [hasLogs, setHasLogs] = useState<boolean | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      hasRideLogs()
        .then((found) => {
          if (!cancelled) {
            setHasLogs(found);
          }
        })
        .catch((error) => {
          console.error('Failed to check ride logs', error);
          if (!cancelled) {
            setHasLogs(null);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );
  const deleteDisabled = hasLogs === false;

  const handleToggle = useCallback(() => {
    const flag = !rideLogEnabled;
    setRideLogEnabled(flag);
    try {
      storage.set(STORAGE_KEYS.RIDE_LOG_ENABLED, flag ? 'true' : 'false');
    } catch (error) {
      // 保存に失敗したままだと次回起動時に設定が巻き戻るため、
      // UIと永続値の不整合を防ぐべくatom状態をロールバックする
      setRideLogEnabled(!flag);
      console.error('Failed to save ride log setting', error);
      showDialog(translate('errorTitle'), translate('failedToSavePreference'));
    }
  }, [rideLogEnabled, setRideLogEnabled]);

  // オフにしても記録は残す。消すのはこの操作だけにする
  const handleDeleteAll = useCallback(() => {
    showDialog(
      translate('rideLogDeleteAll'),
      translate('rideLogDeleteAllConfirm'),
      [
        { text: translate('cancel'), style: 'cancel' },
        {
          text: 'OK',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllRideLogs();
              setHasLogs(false);
              showDialog(
                translate('rideLogDeleteAll'),
                translate('rideLogDeleted')
              );
            } catch (error) {
              console.error('Failed to delete ride logs', error);
              showDialog(
                translate('errorTitle'),
                translate('rideLogDeleteFailed')
              );
            }
          },
        },
      ]
    );
  }, []);

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
            title={translate('rideLogRecordTitle')}
            state={rideLogEnabled}
            onToggle={handleToggle}
          />
          <Typography
            style={[styles.description, { color: colors.secondaryText }]}
          >
            {translate('rideLogDescription')}
          </Typography>
          <Typography style={styles.sectionTitle}>
            {translate('rideLogDataSection')}
          </Typography>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={translate('rideLogDeleteAll')}
            accessibilityHint={
              deleteDisabled ? translate('rideLogDeleteAllEmpty') : undefined
            }
            accessibilityState={{ disabled: deleteDisabled }}
            disabled={deleteDisabled}
            onPress={handleDeleteAll}
            testID="ride-log-delete-all"
            style={{
              paddingHorizontal: 24,
              paddingVertical: 16,
              backgroundColor: isLEDTheme ? '#333' : colors.card,
              borderRadius: isLEDTheme ? 0 : 12,
              opacity: deleteDisabled ? DISABLED_OPACITY : 1,
            }}
          >
            <Typography
              style={[styles.itemText, { color: DESTRUCTIVE_TEXT_COLOR }]}
            >
              {translate('rideLogDeleteAll')}
            </Typography>
          </Pressable>
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
        title={translate('rideLogSettings')}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height + 32)}
        scrollY={scrollY}
      />
      <FooterTabBar active="settings" />
    </>
  );
};

export default React.memo(RideLogSettingsScreen);
