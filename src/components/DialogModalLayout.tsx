import type React from 'react';
import {
  ScrollView,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { LED_THEME_BG_COLOR } from '~/constants';
import { RFValue } from '~/utils/rfValue';
import Button from './Button';
import { CustomModal } from './CustomModal';
import Typography from './Typography';

const styles = StyleSheet.create({
  contentView: {
    width: '100%',
  },
  container: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  leading: {
    width: 48,
    height: 48,
    overflow: 'hidden',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: RFValue(16),
    fontWeight: 'bold',
    flex: 1,
  },
  description: {
    fontSize: RFValue(12),
    lineHeight: RFValue(16),
    marginBottom: 24,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  button: {
    minWidth: 100,
  },
  buttonText: {
    fontWeight: 'bold',
  },
});

export type DialogModalLayoutProps = {
  visible: boolean;
  isLEDTheme: boolean;
  leading: React.ReactNode;
  leadingStyle?: StyleProp<ViewStyle>;
  title: React.ReactNode;
  description: React.ReactNode;
  cancelButtonText: React.ReactNode;
  confirmButtonText: React.ReactNode;
  children?: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  onCloseAnimationEnd?: () => void;
  testID?: string;
};

export const DialogModalLayout: React.FC<DialogModalLayoutProps> = ({
  visible,
  isLEDTheme,
  leading,
  leadingStyle,
  title,
  description,
  cancelButtonText,
  confirmButtonText,
  children,
  onClose,
  onConfirm,
  onCloseAnimationEnd,
  testID,
}) => (
  <CustomModal
    visible={visible}
    onClose={onClose}
    onCloseAnimationEnd={onCloseAnimationEnd}
    testID={testID}
    contentContainerStyle={[
      styles.contentView,
      {
        backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
      },
    ]}
  >
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={[styles.leading, leadingStyle]}>{leading}</View>
        <Typography style={styles.title}>{title}</Typography>
      </View>
      {children}
      <Typography style={styles.description}>{description}</Typography>
      <View style={styles.buttonsRow}>
        <Button
          style={styles.button}
          textStyle={styles.buttonText}
          onPress={onClose}
          outline
        >
          {cancelButtonText}
        </Button>
        <Button
          style={styles.button}
          textStyle={styles.buttonText}
          onPress={onConfirm}
        >
          {confirmButtonText}
        </Button>
      </View>
    </ScrollView>
  </CustomModal>
);
