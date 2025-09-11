import type React from 'react';
import { useCallback } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { APP_THEME } from '~/models/Theme';
import { isDevApp } from '~/utils/isDevApp';
import isTablet from '~/utils/isTablet';
import Button from '../components/Button';
import { Heading } from '../components/Heading';
import { LED_THEME_BG_COLOR } from '../constants';
import { useThemeStore } from '../hooks';
import { translate } from '../translation';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  contentView: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 8,
    minHeight: 256,
  },
  buttonsContainer: {
    gap: 8,
    marginTop: 24,
    width: '100%',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: { marginTop: 24 },
  closeButtonText: { fontWeight: 'bold' },
});

type Props = {
  visible: boolean;
  onClose: () => void;
  hasTrainTypes: boolean;
  isLoopLine: boolean;
  autoModeEnabled: boolean;
  toggleAutoModeEnabled: () => void;
};

export const SelectBoundSettingListModal: React.FC<Props> = ({
  visible,
  onClose,
  hasTrainTypes,
  isLoopLine,
  autoModeEnabled,
  toggleAutoModeEnabled,
}) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const showUnimplementedAlert = useCallback(() => {
    if (isDevApp) {
      Alert.alert('Unimplemented', 'This feature is not implemented yet.');
    }
  }, []);

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable style={styles.root} onPress={onClose}>
        <Pressable
          style={[
            styles.contentView,
            {
              backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
            },
            isTablet && {
              width: '80%',
              maxHeight: '90%',
              shadowOpacity: 0.25,
              shadowColor: '#333',
              borderRadius: 16,
            },
          ]}
        >
          <View style={styles.container}>
            <Heading>{translate('settings')}</Heading>

            <View style={styles.buttonsContainer}>
              <Button outline onPress={showUnimplementedAlert}>
                {translate('notifySettings')}
              </Button>
              {hasTrainTypes ? (
                <Button outline onPress={showUnimplementedAlert}>
                  {translate('trainTypeSettings')}
                </Button>
              ) : null}
              {/* NOTE: 処理が複雑になりそこまで需要もなさそうなので環状運転路線では行先を指定できないようにする */}
              {!isLoopLine ? (
                <Button outline onPress={showUnimplementedAlert}>
                  {translate('selectBoundSettings')}
                </Button>
              ) : null}
              <Button outline onPress={toggleAutoModeEnabled}>
                {translate('autoModeSettings')}:{' '}
                {autoModeEnabled ? 'ON' : 'OFF'}
              </Button>
              <Button
                style={styles.closeButton}
                textStyle={styles.closeButtonText}
                onPress={onClose}
              >
                {translate('close')}
              </Button>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
