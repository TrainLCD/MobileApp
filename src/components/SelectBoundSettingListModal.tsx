import { useAtomValue } from 'jotai';
import type React from 'react';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import type { Line, TrainType } from '~/@types/graphql';
import { APP_THEME } from '~/models/Theme';
import navigationState from '~/store/atoms/navigation';
import { isDevApp } from '~/utils/isDevApp';
import isTablet from '~/utils/isTablet';
import Button from '../components/Button';
import { Heading } from '../components/Heading';
import { LED_THEME_BG_COLOR } from '../constants';
import { useThemeStore } from '../hooks';
import { isJapanese, translate } from '../translation';
import { TrainTypeListModal } from './TrainTypeListModal';

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
  heading: { width: '100%' },
});

type Props = {
  visible: boolean;
  onClose: () => void;
  isLoopLine: boolean;
  autoModeEnabled: boolean;
  line: Line | null;
  toggleAutoModeEnabled: () => void;
  onTrainTypeSelect: (trainType: TrainType) => void;
};

export const SelectBoundSettingListModal: React.FC<Props> = ({
  visible,
  onClose,
  isLoopLine,
  autoModeEnabled,
  line,
  toggleAutoModeEnabled,
  onTrainTypeSelect,
}) => {
  const { trainType, fetchedTrainTypes } = useAtomValue(navigationState);
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const [isTrainTypeModalVisible, setIsTrainTypeModalVisible] = useState(false);

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
            <Heading style={styles.heading}>{translate('settings')}</Heading>

            <View style={styles.buttonsContainer}>
              <Button outline onPress={showUnimplementedAlert}>
                {translate('notifySettings')}
              </Button>
              {fetchedTrainTypes.length ? (
                <Button
                  outline
                  onPress={() => setIsTrainTypeModalVisible(true)}
                >
                  {trainType
                    ? translate('trainTypeIs', {
                        trainTypeName: isJapanese
                          ? (trainType.name ?? '')
                          : (trainType.nameRoman ?? ''),
                      })
                    : translate('trainTypeSettings')}
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
      <TrainTypeListModal
        visible={isTrainTypeModalVisible}
        line={line}
        onClose={() => setIsTrainTypeModalVisible(false)}
        onSelect={(trainType) => {
          setIsTrainTypeModalVisible(false);
          onTrainTypeSelect(trainType);
        }}
      />
    </Modal>
  );
};
