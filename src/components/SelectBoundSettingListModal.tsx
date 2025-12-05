import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { APP_THEME } from '~/models/Theme';
import isTablet from '~/utils/isTablet';
import Button from '../components/Button';
import { Heading } from '../components/Heading';
import { LED_THEME_BG_COLOR } from '../constants';
import { useThemeStore } from '../hooks';
import { translate } from '../translation';
import { CustomModal } from './CustomModal';
import { ToggleButton } from './ToggleButton';

const styles = StyleSheet.create({
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
  autoModeEnabled: boolean;
  toggleAutoModeEnabled: () => void;
};

export const SelectBoundSettingListModal: React.FC<Props> = ({
  visible,
  onClose,
  autoModeEnabled,
  toggleAutoModeEnabled,
}) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      contentContainerStyle={[
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
          <ToggleButton
            outline
            onToggle={toggleAutoModeEnabled}
            state={autoModeEnabled}
          >
            {translate('autoModeSettings')}
          </ToggleButton>
          <Button
            style={styles.closeButton}
            textStyle={styles.closeButtonText}
            onPress={onClose}
          >
            {translate('close')}
          </Button>
        </View>
      </View>
    </CustomModal>
  );
};
