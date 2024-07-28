import React, { useMemo } from 'react'
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { hasNotch } from 'react-native-device-info'
import { RFValue } from 'react-native-responsive-fontsize'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FONTS, LED_THEME_BG_COLOR } from '../constants'
import { useStore } from '../hooks/useStore'
import { APP_THEME } from '../models/Theme'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import { widthScale } from '../utils/scale'
import Button from './Button'
import Heading from './Heading'
import Typography from './Typography'

const { height: windowHeight } = Dimensions.get('window')

type Props = {
  visible: boolean
  sending: boolean
  onClose: () => void
  onSubmit: () => void
  description: string
  onDescriptionChange: (text: string) => void
  descriptionLowerLimit: number
}

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
    minHeight: windowHeight * 0.25,
  },
  caution: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  buttonContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    marginTop: 16,
  },
  button: {
    marginHorizontal: 8,
    width: widthScale(64),
  },
  charCount: {
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#555555',
  },
})

const NewReportModal: React.FC<Props> = ({
  visible,
  sending,
  onClose,
  onSubmit,
  description,
  onDescriptionChange,
  descriptionLowerLimit,
}: Props) => {
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets()
  const isLEDTheme = useStore((state) => state.theme === APP_THEME.LED)

  const needsLeftCount = useMemo(
    () => description.trim().length - descriptionLowerLimit,
    [description, descriptionLowerLimit]
  )

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['landscape']}
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
                  shadowColor: '#000',
                  borderRadius: 16,
                }
              : {
                  borderRadius: 8,
                },
          ]}
        >
          <KeyboardAvoidingView behavior="position">
            <Heading>{translate('report')}</Heading>

            <TextInput
              autoFocus
              value={description}
              onChangeText={onDescriptionChange}
              multiline
              style={{
                ...styles.textInput,
                color: isLEDTheme ? '#fff' : '#000',
                fontFamily: isLEDTheme ? FONTS.JFDotJiskan24h : undefined,
              }}
              placeholder={translate('reportPlaceholder', {
                lowerLimit: descriptionLowerLimit,
              })}
            />

            {needsLeftCount < 0 ? (
              <Typography style={styles.charCount}>
                あと{Math.abs(needsLeftCount)}文字必要です
              </Typography>
            ) : (
              <Typography style={styles.charCount}>送信可能です</Typography>
            )}
          </KeyboardAvoidingView>
          <Typography
            style={{
              ...styles.caution,
              color: isLEDTheme ? '#fff' : '#555',
              lineHeight: Platform.select({ ios: RFValue(18) }),
            }}
          >
            {translate('reportCaution')}
          </Typography>
          <View style={styles.buttonContainer}>
            <Button
              style={styles.button}
              disabled={
                description.trim().length < descriptionLowerLimit || sending
              }
              color={isLEDTheme ? undefined : '#008ffe'}
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
  )
}

export default React.memo(NewReportModal)
