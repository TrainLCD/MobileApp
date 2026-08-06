import type React from 'react';
import {
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
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
    marginRight: 4,
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
  descriptionWithCheckbox: {
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: 'bold',
  },
  checkboxText: {
    fontSize: RFValue(12),
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
  destructiveButton: {
    backgroundColor: '#d32f2f',
  },
});

/**
 * ThemeConfirmModal と CommonDialogModal が共有する見た目と操作だけを定義する。
 * 用途固有の状態や表示条件は、それぞれの公開コンポーネント側に残す。
 */
export type DialogModalLayoutProps = {
  visible: boolean;
  isLEDTheme: boolean;
  leading: React.ReactNode;
  leadingStyle?: StyleProp<ViewStyle>;
  title: React.ReactNode;
  description: React.ReactNode;
  checkboxText?: React.ReactNode;
  checkboxChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  cancelButtonText?: React.ReactNode;
  confirmButtonText: React.ReactNode;
  children?: React.ReactNode;
  onClose: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  onCloseAnimationEnd?: () => void;
  dismissOnBackdropPress?: boolean;
  confirmButtonDestructive?: boolean;
  testID?: string;
};

export const DialogModalLayout: React.FC<DialogModalLayoutProps> = ({
  visible,
  isLEDTheme,
  leading,
  leadingStyle,
  title,
  description,
  checkboxText,
  checkboxChecked = false,
  onCheckboxChange,
  cancelButtonText,
  confirmButtonText,
  children,
  onClose,
  onCancel,
  onConfirm,
  onCloseAnimationEnd,
  dismissOnBackdropPress,
  confirmButtonDestructive,
  testID,
}) => (
  <CustomModal
    visible={visible}
    onClose={onClose}
    onCloseAnimationEnd={onCloseAnimationEnd}
    dismissOnBackdropPress={dismissOnBackdropPress}
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
      <Typography
        style={[
          styles.description,
          checkboxText ? styles.descriptionWithCheckbox : undefined,
        ]}
      >
        {description}
      </Typography>
      {checkboxText ? (
        <Pressable
          style={styles.checkboxRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: checkboxChecked }}
          onPress={() => onCheckboxChange?.(!checkboxChecked)}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: isLEDTheme ? '#fff' : '#008ffe',
                backgroundColor: checkboxChecked
                  ? '#008ffe'
                  : isLEDTheme
                    ? LED_THEME_BG_COLOR
                    : '#fff',
              },
            ]}
          >
            {checkboxChecked ? (
              <Text style={styles.checkboxMark}>✓</Text>
            ) : null}
          </View>
          <Typography style={styles.checkboxText}>{checkboxText}</Typography>
        </Pressable>
      ) : null}
      <View style={styles.buttonsRow}>
        {cancelButtonText ? (
          <Button
            style={styles.button}
            textStyle={styles.buttonText}
            onPress={onCancel ?? onClose}
            outline
          >
            {cancelButtonText}
          </Button>
        ) : null}
        <Button
          style={[
            styles.button,
            confirmButtonDestructive && styles.destructiveButton,
          ]}
          textStyle={styles.buttonText}
          onPress={onConfirm}
        >
          {confirmButtonText}
        </Button>
      </View>
    </ScrollView>
  </CustomModal>
);
