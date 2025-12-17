import type React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Station } from '~/@types/graphql';
import { APP_THEME } from '~/models/Theme';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import Button from '../components/Button';
import { Heading } from '../components/Heading';
import { LED_THEME_BG_COLOR } from '../constants';
import { useThemeStore } from '../hooks';
import { isJapanese, translate } from '../translation';
import { CustomModal } from './CustomModal';
import { ToggleButton } from './ToggleButton';
import Typography from './Typography';

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
  lineText: { width: '100%', fontWeight: 'bold', fontSize: RFValue(12) },
  setAsTerminusButton: { marginTop: 8 },
});

type Props = {
  visible: boolean;
  onClose: () => void;
  station: Station | null;
  isSetAsTerminus: boolean;
  notificationModeEnabled: boolean;
  toggleNotificationModeEnabled: () => void;
  onDestinationSelected: () => void;
};

export const StationSettingsModal: React.FC<Props> = ({
  visible,
  onClose,
  station,
  isSetAsTerminus,
  notificationModeEnabled,
  toggleNotificationModeEnabled,
  onDestinationSelected,
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
        <Typography style={styles.lineText}>
          {isJapanese ? station?.line?.nameShort : station?.line?.nameRoman}
        </Typography>
        <Heading style={styles.heading}>
          {isJapanese ? station?.name : station?.nameRoman}
          {translate('station')}
        </Heading>

        <View style={styles.buttonsContainer}>
          <ToggleButton
            outline
            onToggle={toggleNotificationModeEnabled}
            state={notificationModeEnabled}
          >
            {translate('enableNotificationMode')}
          </ToggleButton>
          <ToggleButton
            outline
            onToggle={onDestinationSelected}
            state={isSetAsTerminus}
            style={styles.setAsTerminusButton}
          >
            {translate('setAsTerminus')}
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
