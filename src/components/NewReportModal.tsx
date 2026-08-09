import { Ionicons } from '@expo/vector-icons';
import { useAtomValue } from 'jotai';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInput as TextInputType,
  View,
} from 'react-native';
import { FONTS, LED_THEME_BG_COLOR } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { showDialog } from '~/utils/dialogPresentation';
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

const ACCENT_COLOR = '#008ffe';

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalView: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 143, 254, 0.1)',
  },
  iconBadgeLED: {
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
  },
  title: {
    textAlign: 'left',
    flex: 1,
  },
  inputLabel: {
    fontSize: RFValue(13),
    fontWeight: 'bold',
    marginTop: 20,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
    height: 140,
    fontSize: RFValue(14),
    marginTop: 8,
    textAlignVertical: 'top',
    borderRadius: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: RFValue(11),
  },
  cautionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 143, 254, 0.06)',
  },
  cautionBoxLED: {
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  cautionText: {
    flex: 1,
    fontSize: RFValue(10),
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  closeButton: {
    flex: 1,
  },
  sendButton: {
    flex: 1,
  },
});

const NewReportModal: React.FC<Props> = ({
  visible,
  sending,
  onClose,
  onSubmit,
  descriptionLowerLimit,
}: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const textInputRef = useRef<TextInputType>(null);
  const textRef = useRef('');
  const [charCount, setCharCount] = useState(0);
  const [inputFocused, setInputFocused] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // モーダルが開かれたときに初期化
  useEffect(() => {
    if (visible) {
      textRef.current = '';
      setCharCount(0);
      textInputRef.current?.clear();
    }
  }, [visible]);

  // 下限文字数に対する進捗をプログレスバーに反映する
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.min(charCount / descriptionLowerLimit, 1),
      duration: 200,
      // NOTE: width をアニメーションするため native driver は使えない
      useNativeDriver: false,
    }).start();
  }, [charCount, descriptionLowerLimit, progressAnim]);

  const handleChangeText = useCallback((text: string) => {
    textRef.current = text;
    setCharCount(text.trim().length);
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit(textRef.current);
  }, [onSubmit]);

  const handleShow = useCallback(() => {
    if (Platform.OS === 'ios') {
      textInputRef.current?.focus();
    }
  }, []);

  const handleFocus = useCallback(() => setInputFocused(true), []);
  const handleBlur = useCallback(() => setInputFocused(false), []);

  const handleClose = useCallback(() => {
    const hasInput = textRef.current.trim().length > 0;

    if (hasInput) {
      showDialog(
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

  const sendable = charCount >= descriptionLowerLimit;
  const remainingCount = Math.max(descriptionLowerLimit - charCount, 0);

  const accentColor = isLEDTheme ? '#fff' : ACCENT_COLOR;
  const mutedTextColor = isLEDTheme ? 'rgba(255, 255, 255, 0.7)' : '#777';
  const inputBorderColor = (() => {
    if (isLEDTheme) {
      return inputFocused ? '#fff' : 'rgba(255, 255, 255, 0.4)';
    }
    return inputFocused ? ACCENT_COLOR : '#dde3ea';
  })();

  return (
    <CustomModal
      visible={visible}
      onClose={handleClose}
      onShow={handleShow}
      backdropStyle={styles.backdrop}
      contentContainerStyle={[
        styles.modalView,
        isLEDTheme
          ? {
              backgroundColor: LED_THEME_BG_COLOR,
              borderRadius: 0,
              borderWidth: 1,
              borderColor: '#fff',
            }
          : {
              backgroundColor: '#fff',
              borderRadius: 16,
            },
      ]}
      dismissOnBackdropPress={!sending}
      avoidKeyboard
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={Keyboard.dismiss}>
          <View style={styles.header}>
            <View style={[styles.iconBadge, isLEDTheme && styles.iconBadgeLED]}>
              <Ionicons
                name="chatbubble-ellipses"
                size={22}
                color={accentColor}
              />
            </View>
            <Heading style={styles.title}>
              {translate('reportModalTitle')}
            </Heading>
          </View>

          <Typography style={styles.inputLabel}>
            {translate('reportBodyTitle')}
          </Typography>

          <TextInput
            ref={textInputRef}
            autoFocus={Platform.OS !== 'ios'}
            defaultValue=""
            onChangeText={handleChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!sending}
            multiline
            style={[
              styles.textInput,
              {
                color: isLEDTheme ? '#fff' : '#333',
                fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
                borderColor: inputBorderColor,
                backgroundColor: isLEDTheme ? 'transparent' : '#f6f8fa',
                borderRadius: isLEDTheme ? 0 : 12,
              },
            ]}
            placeholder={translate('reportPlaceholder', {
              lowerLimit: descriptionLowerLimit,
            })}
            placeholderTextColor={
              isLEDTheme ? 'rgba(255, 255, 255, 0.5)' : '#999'
            }
          />

          <View style={styles.progressRow}>
            <View
              style={[
                styles.progressTrack,
                {
                  backgroundColor: isLEDTheme
                    ? 'rgba(255, 255, 255, 0.25)'
                    : '#e5eaf0',
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: accentColor,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.statusRow}>
              {sendable ? (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={RFValue(12)}
                    color={accentColor}
                  />
                  <Typography
                    style={[styles.statusText, { color: accentColor }]}
                  >
                    {translate('sendable')}
                  </Typography>
                </>
              ) : (
                <Typography
                  style={[styles.statusText, { color: mutedTextColor }]}
                >
                  {translate('remainingCharacters', { count: remainingCount })}
                </Typography>
              )}
            </View>
          </View>

          <View style={[styles.cautionBox, isLEDTheme && styles.cautionBoxLED]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={20}
              color={accentColor}
            />
            <Typography
              style={[
                styles.cautionText,
                {
                  color: isLEDTheme ? '#fff' : '#555',
                  lineHeight: RFValue(15),
                },
              ]}
            >
              {translate('reportCaution')}
            </Typography>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              style={styles.closeButton}
              disabled={sending}
              onPress={handleClose}
              outline
            >
              {translate('close')}
            </Button>

            <Button
              style={styles.sendButton}
              disabled={!sendable || sending}
              onPress={handleSubmit}
            >
              {sending
                ? translate('reportSendInProgress')
                : translate('reportSend')}
            </Button>
          </View>
        </Pressable>
      </ScrollView>
    </CustomModal>
  );
};

export default React.memo(NewReportModal);
