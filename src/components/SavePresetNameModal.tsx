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
import { Checkbox } from './Checkbox';
import { CustomModal } from './CustomModal';
import { Heading } from './Heading';
import Typography from './Typography';

type Props = {
  visible: boolean;
  onClose: () => void;
  /**
   * @param keepEndpoints 始発駅・終着駅をそのまま保存するか。
   * false のときは行き先と始発駅で絞らず停車パターンのみを保存する
   */
  onSubmit: (name: string, keepEndpoints: boolean) => void;
  defaultName: string;
  /** 始発・終着を保存するかの選択肢を出すか（行き先を指定しているときのみ意味を持つ） */
  showKeepEndpointsOption?: boolean;
};

const styles = StyleSheet.create({
  contentView: {
    width: '100%',
    paddingVertical: 32,
    paddingHorizontal: 32,
  },
  inputLabel: {
    fontSize: RFValue(13),
    fontWeight: 'bold',
    marginTop: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#aaa',
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
    fontSize: RFValue(14),
    marginTop: 8,
    borderRadius: 8,
  },
  keepEndpointsContainer: {
    marginTop: 24,
  },
  keepEndpointsDescription: {
    fontSize: RFValue(11),
    marginTop: 8,
    opacity: 0.8,
  },
  buttonContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
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
  showKeepEndpointsOption = false,
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const textInputRef = useRef<TextInputType>(null);
  const textRef = useRef(defaultName);
  const [isEmpty, setIsEmpty] = useState(false);
  const [keepEndpoints, setKeepEndpoints] = useState(true);

  useEffect(() => {
    if (visible) {
      textRef.current = defaultName;
      setIsEmpty(!defaultName.trim());
      // 表示のたびに既定(オン)へ戻し、前回の選択を持ち越さない
      setKeepEndpoints(true);
    }
  }, [visible, defaultName]);

  const handleChangeText = useCallback((text: string) => {
    textRef.current = text;
    setIsEmpty(!text.trim());
  }, []);

  const handleToggleKeepEndpoints = useCallback(
    () => setKeepEndpoints((prev) => !prev),
    []
  );

  const handleSubmit = useCallback(() => {
    const name = textRef.current.trim();
    if (!name) return;
    onSubmit(name, keepEndpoints);
  }, [onSubmit, keepEndpoints]);

  const handleShow = useCallback(() => {
    if (Platform.OS === 'ios') {
      textInputRef.current?.focus();
    }
  }, []);

  const textColor = isLEDTheme ? '#fff' : '#000';

  return (
    <CustomModal
      visible={visible}
      onClose={onClose}
      onShow={handleShow}
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
        <Heading>{translate('savePresetTitle')}</Heading>

        <Typography style={[styles.inputLabel, { color: textColor }]}>
          {translate('presetNameLabel')}
        </Typography>

        <TextInput
          ref={textInputRef}
          autoFocus={Platform.OS !== 'ios'}
          defaultValue={defaultName}
          onChangeText={handleChangeText}
          style={[
            styles.textInput,
            {
              color: textColor,
              fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
            },
          ]}
          placeholder={translate('presetNamePlaceholder')}
          placeholderTextColor={isLEDTheme ? 'rgba(255,255,255,0.5)' : '#999'}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        {showKeepEndpointsOption ? (
          <View style={styles.keepEndpointsContainer}>
            <Checkbox
              checked={keepEndpoints}
              onPress={handleToggleKeepEndpoints}
            >
              {translate('presetKeepEndpointsLabel')}
            </Checkbox>
            <Typography
              style={[styles.keepEndpointsDescription, { color: textColor }]}
            >
              {translate('presetKeepEndpointsDescription')}
            </Typography>
          </View>
        ) : null}

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
