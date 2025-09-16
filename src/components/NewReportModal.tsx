import React, { useMemo } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { hasNotch } from 'react-native-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS, LED_THEME_BG_COLOR } from '~/constants';
import { useThemeStore } from '~/hooks';
import { useScale } from '~/hooks/useScale';
import { APP_THEME } from '~/models/Theme';
import { translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import Button from './Button';
import { Heading } from './Heading';
import Typography from './Typography';

type Props = {
  visible: boolean;
  sending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  description: string;
  onDescriptionChange: (text: string) => void;
  descriptionLowerLimit: number;
};

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    height: '100%',
  },
  modalView: {
    paddingVertical: 32,
    height: !isTablet ? '100%' : undefined,
    width: '100%',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 12,
    width: '100%',
    fontSize: RFValue(14),
    marginVertical: 16,
    textAlignVertical: 'top',
    minHeight: '25%',
  },
  caution: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    marginTop: 8,
  },
  button: {
    marginTop: 8,
    marginHorizontal: 8,
  },
  charCount: {
    position: 'absolute',
    right: 0,
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#555555',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const NewReportModal: React.FC<Props> = ({
  visible,
  sending,
  onClose,
  onSubmit,
  description,
  onDescriptionChange,
  descriptionLowerLimit,
}: Props) => {
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets();
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);

  const needsLeftCount = useMemo(
    () => description.trim().length - descriptionLowerLimit,
    [description, descriptionLowerLimit]
  );
  const { widthScale } = useScale();

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable onPress={onClose} style={styles.modalContainer}>
        <Pressable
          onPress={Keyboard.dismiss}
          style={[
            styles.modalView,
            {
              backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
              paddingLeft: hasNotch() ? safeAreaLeft : 32,
              paddingRight: hasNotch() ? safeAreaRight : 32,
            },
            isTablet
              ? {
                  width: '80%',
                  shadowOpacity: 0.25,
                  shadowColor: '#333',
                  borderRadius: 16,
                }
              : {
                  borderRadius: 8,
                },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.header}>
              <Heading>{translate('report')}</Heading>

              {needsLeftCount < 0 ? (
                <Typography style={styles.charCount}>
                  あと{Math.abs(needsLeftCount)}文字必要です
                </Typography>
              ) : (
                <Typography style={styles.charCount}>送信可能です</Typography>
              )}
            </View>

            <TextInput
              autoFocus
              value={description}
              onChangeText={onDescriptionChange}
              multiline
              style={[
                styles.textInput,
                {
                  color: isLEDTheme ? '#fff' : '#000',
                  fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
                },
              ]}
              placeholder={translate('reportPlaceholder', {
                lowerLimit: descriptionLowerLimit,
              })}
            />
          </KeyboardAvoidingView>
          <Typography
            style={[
              styles.caution,
              {
                color: isLEDTheme ? '#fff' : '#555',
                lineHeight: Platform.select({ ios: RFValue(18) }),
              },
            ]}
          >
            {translate('reportCaution')}
          </Typography>
          <View style={styles.buttonContainer}>
            <Button
              style={[
                styles.button,
                {
                  width: widthScale(64),
                },
              ]}
              disabled={
                description.trim().length < descriptionLowerLimit || sending
              }
              onPress={onSubmit}
            >
              {sending
                ? translate('reportSendInProgress')
                : translate('reportSend')}
            </Button>
            <Button disabled={sending} style={styles.button} onPress={onClose}>
              {translate('cancel')}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default React.memo(NewReportModal);
