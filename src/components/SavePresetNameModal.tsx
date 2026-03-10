import { useAtomValue } from 'jotai';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  type TextInput as TextInputType,
  View,
} from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { FONTS, LED_THEME_BG_COLOR } from '~/constants';
import type { LineDirection } from '~/models/Bound';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import { RFValue } from '~/utils/rfValue';
import { getStationName } from '~/utils/station';
import Button from './Button';
import { CommonCard } from './CommonCard';
import { CustomModal } from './CustomModal';
import { Heading } from './Heading';
import Typography from './Typography';

export type DirectionOption = {
  direction: LineDirection;
  fromStation: Station;
  toStation: Station;
  line: Line;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, direction: LineDirection | null) => void;
  defaultName: string;
  directionOptions?: DirectionOption[];
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
  directionSectionTitle: {
    fontSize: RFValue(13),
    fontWeight: 'bold',
    marginTop: 32,
    marginBottom: 16,
  },
  directionCardContainer: {
    marginBottom: 16,
  },
});

export const SavePresetNameModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  defaultName,
  directionOptions,
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const textInputRef = useRef<TextInputType>(null);
  const textRef = useRef(defaultName);
  const [isEmpty, setIsEmpty] = useState(false);
  const [selectedDirection, setSelectedDirection] =
    useState<LineDirection | null>(null);
  const inboundOpacity = useRef(new Animated.Value(1)).current;
  const outboundOpacity = useRef(new Animated.Value(1)).current;

  const hasDirectionOptions =
    directionOptions != null && directionOptions.length > 0;

  useEffect(() => {
    if (visible) {
      textRef.current = defaultName;
      setIsEmpty(!defaultName.trim());
      setSelectedDirection(
        directionOptions?.length === 1 ? directionOptions[0].direction : null
      );
      inboundOpacity.setValue(1);
      outboundOpacity.setValue(1);

      if (Platform.OS === 'ios') {
        const timer = setTimeout(() => {
          textInputRef.current?.focus();
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [visible, defaultName, directionOptions, inboundOpacity, outboundOpacity]);

  useEffect(() => {
    const duration = 200;
    if (selectedDirection === null) {
      Animated.parallel([
        Animated.timing(inboundOpacity, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(outboundOpacity, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(inboundOpacity, {
          toValue: selectedDirection === 'INBOUND' ? 1 : 0.4,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(outboundOpacity, {
          toValue: selectedDirection === 'OUTBOUND' ? 1 : 0.4,
          duration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedDirection, inboundOpacity, outboundOpacity]);

  const handleChangeText = useCallback((text: string) => {
    textRef.current = text;
    setIsEmpty(!text.trim());
  }, []);

  const handleSubmit = useCallback(() => {
    const name = textRef.current.trim();
    if (!name) return;
    if (hasDirectionOptions && !selectedDirection) return;
    onSubmit(name, selectedDirection);
  }, [onSubmit, selectedDirection, hasDirectionOptions]);

  const canSubmit =
    !isEmpty && (!hasDirectionOptions || selectedDirection !== null);
  const textColor = isLEDTheme ? '#fff' : '#000';

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

        {hasDirectionOptions && directionOptions.length > 1 && (
          <>
            <Typography
              style={[styles.directionSectionTitle, { color: textColor }]}
            >
              {translate('selectStartStationTitle')}
            </Typography>
            {directionOptions.map((opt) => {
              const fromName = getStationName(opt.fromStation);
              const toName = getStationName(opt.toStation);
              const title = `${fromName}(${translate('departure')})`;
              const subtitle = `${fromName} → ${toName}`;
              const animatedOpacity =
                opt.direction === 'INBOUND' ? inboundOpacity : outboundOpacity;
              return (
                <Animated.View
                  key={opt.direction}
                  style={[
                    styles.directionCardContainer,
                    { opacity: animatedOpacity },
                  ]}
                >
                  <CommonCard
                    line={opt.line}
                    title={title}
                    hideParens
                    hideChevron
                    checked={selectedDirection === opt.direction}
                    subtitle={subtitle}
                    targetStation={opt.fromStation}
                    onPress={() => setSelectedDirection(opt.direction)}
                  />
                </Animated.View>
              );
            })}
          </>
        )}

        <View style={styles.buttonContainer}>
          <Button onPress={onClose} outline>
            {translate('cancel')}
          </Button>
          <Button
            style={styles.saveButton}
            disabled={!canSubmit}
            onPress={handleSubmit}
          >
            {translate('save')}
          </Button>
        </View>
      </Pressable>
    </CustomModal>
  );
};
