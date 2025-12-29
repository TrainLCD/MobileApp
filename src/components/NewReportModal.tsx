import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInput as TextInputType,
  View,
} from 'react-native';
import { FONTS, LED_THEME_BG_COLOR } from '~/constants';
import { useThemeStore } from '~/hooks';
import { APP_THEME } from '~/models/Theme';
import { translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { RFValue } from '~/utils/rfValue';
import Button from './Button';
import { CustomModal } from './CustomModal';
import { Heading } from './Heading';
import Typography from './Typography';

type Props = {
  visible: boolean;
  sending: boolean;
  onClose: () => void;
  onSubmit: (description: string) => void;
  descriptionLowerLimit: number;
};

const styles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalView: {
    paddingVertical: 32,
    width: '100%',
    // iPhoneのみ全方位に角丸を設定(KeyboardAvoidingViewでの見栄え関係)
    borderRadius: !isTablet && Platform.OS === 'ios' ? 16 : 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#aaa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    fontSize: RFValue(14),
    marginTop: 8,
    textAlignVertical: 'top',
    borderRadius: 8,
  },
  caution: {
    fontSize: RFValue(11),
    fontWeight: 'bold',
    marginTop: 12,
    color: '#555',
  },
  buttonContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
    gap: 16,
  },
  sendButton: {
    width: 150,
  },
  charCount: {
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#555',
    marginTop: 4,
    fontSize: RFValue(11),
  },
  title: {
    textAlign: 'left',
  },
  modalContent: {
    marginTop: 21,
  },
  subtitle: {
    textAlign: 'left',
    fontSize: RFValue(14),
  },
});

const NewReportModal: React.FC<Props> = ({
  visible,
  sending,
  onClose,
  onSubmit,
  descriptionLowerLimit,
}: Props) => {
  const isLEDTheme = useThemeStore((state) => state === APP_THEME.LED);
  const textInputRef = useRef<TextInputType>(null);
  const textRef = useRef('');
  const [charCount, setCharCount] = useState(0);

  // モーダルが開かれたときに初期化
  useEffect(() => {
    if (visible) {
      textRef.current = '';
      setCharCount(0);
      textInputRef.current?.clear();
    }
  }, [visible]);

  const handleChangeText = useCallback((text: string) => {
    textRef.current = text;
    setCharCount(text.trim().length);
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(textRef.current);
  }, [onSubmit]);

  const handleClose = useCallback(() => {
    const hasInput = textRef.current.trim().length > 0;

    if (hasInput) {
      Alert.alert(
        translate('confirmDiscardTitle'),
        translate('confirmDiscardMessage'),
        [
          {
            text: translate('cancel'),
            style: 'cancel',
          },
          {
            text: translate('discard'),
            style: 'destructive',
            onPress: onClose,
          },
        ]
      );
    } else {
      onClose();
    }
  }, [onClose]);

  const needsLeftCount = charCount - descriptionLowerLimit;

  return (
    <CustomModal
      visible={visible}
      onClose={handleClose}
      containerStyle={styles.modalContainer}
      backdropStyle={styles.backdrop}
      contentContainerStyle={[
        styles.modalView,
        {
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          paddingLeft: 32,
          paddingRight: 32,
        },
      ]}
      dismissOnBackdropPress={!sending}
      avoidKeyboard
    >
      <Pressable onPress={Keyboard.dismiss}>
        <Heading style={styles.title}>{translate('reportModalTitle')}</Heading>

        <View style={styles.modalContent}>
          <Heading style={styles.subtitle}>
            {translate('reportBodyTitle')}
          </Heading>

          <TextInput
            ref={textInputRef}
            autoFocus={Platform.OS === 'ios'}
            defaultValue=""
            onChangeText={handleChangeText}
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

          {needsLeftCount < 0 ? (
            <Typography style={styles.charCount}>
              {translate('remainingCharacters', { count: -needsLeftCount })}
            </Typography>
          ) : (
            <Typography style={styles.charCount}>
              {translate('sendable')}
            </Typography>
          )}
        </View>

        <Typography
          style={[
            styles.caution,
            {
              color: isLEDTheme ? '#fff' : '#000',
              lineHeight: Platform.select({ ios: RFValue(14) }),
            },
          ]}
        >
          {translate('reportCaution')}
        </Typography>
        <View style={styles.buttonContainer}>
          <Button disabled={sending} onPress={handleClose} outline>
            {translate('close')}
          </Button>

          <Button
            style={styles.sendButton}
            disabled={charCount < descriptionLowerLimit || sending}
            onPress={handleSubmit}
          >
            {sending
              ? translate('reportSendInProgress')
              : translate('reportSend')}
          </Button>
        </View>
      </Pressable>
    </CustomModal>
  );
};

export default React.memo(NewReportModal);
