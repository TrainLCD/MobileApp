import { useAtomValue } from 'jotai';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInput as TextInputType,
  View,
} from 'react-native';
import { FONTS, LED_THEME_BG_COLOR } from '~/constants';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import Button from './Button';
import { CustomModal } from './CustomModal';
import { Heading } from './Heading';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  defaultName: string;
};

const styles = StyleSheet.create({
  contentView: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#aaa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    fontSize: RFValue(14),
    marginTop: 12,
    borderRadius: 8,
  },
  buttonContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    gap: 16,
  },
  saveButton: {
    width: 120,
  },
});

export const SavePresetNameModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  defaultName,
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const textInputRef = useRef<TextInputType>(null);
  const textRef = useRef(defaultName);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    if (visible) {
      textRef.current = defaultName;
      setIsEmpty(!defaultName.trim());
    }
  }, [visible, defaultName]);

  const handleChangeText = useCallback((text: string) => {
    textRef.current = text;
    setIsEmpty(!text.trim());
  }, []);

  const handleSubmit = useCallback(() => {
    const name = textRef.current.trim();
    if (name) {
      onSubmit(name);
    }
  }, [onSubmit]);

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      backdropStyle={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      contentContainerStyle={[
        styles.contentView,
        {
          backgroundColor: isLEDTheme ? LED_THEME_BG_COLOR : '#fff',
          borderRadius: isLEDTheme ? 0 : 8,
        },
      ]}
      avoidKeyboard
    >
      <Pressable onPress={Keyboard.dismiss}>
        <Heading>{translate('presetNameInputTitle')}</Heading>

        <TextInput
          ref={textInputRef}
          autoFocus={Platform.OS === 'ios'}
          defaultValue={defaultName}
          onChangeText={handleChangeText}
          style={[
            styles.textInput,
            {
              color: isLEDTheme ? '#fff' : '#000',
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            },
          ]}
          placeholder={translate('presetNamePlaceholder')}
          placeholderTextColor={isLEDTheme ? 'rgba(255,255,255,0.5)' : '#999'}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        <View style={styles.buttonContainer}>
          <Button onPress={onClose} outline>
            {translate('cancel')}
          </Button>
          <Button
            style={styles.saveButton}
            disabled={isEmpty}
            onPress={handleSubmit}
          >
            {translate('save')}
          </Button>
        </View>
      </Pressable>
    </CustomModal>
  );
};
