import React, { useCallback } from 'react'
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from 'react-native'
import { hasNotch } from 'react-native-device-info'
import { MIRRORING_SHARE_DEEPLINK_URL } from 'react-native-dotenv'
import { RFValue } from 'react-native-responsive-fontsize'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Share from 'react-native-share'
import { useRecoilValue } from 'recoil'
import useMirroringShare from '../hooks/useMirroringShare'
import mirroringShareState from '../store/atoms/mirroringShare'
import { translate } from '../translation'
import isTablet from '../utils/isTablet'
import Button from './Button'
import Heading from './Heading'
import Typography from './Typography'
import QRCode from 'react-native-qrcode-svg'
import { isDevApp } from '../utils/isDevApp'
import { useIsLEDTheme } from '../hooks/useIsLEDTheme'
import { LED_THEME_BG_COLOR } from '../constants'

type Props = {
  visible: boolean
  onClose: () => void
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
    height: '100%',
  },
  modalView: {
    flex: 1,
    paddingVertical: 32,
    width: '100%',
    alignItems: 'center',
  },
  settingsItemHeading: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  switchContainer: {
    marginTop: 32,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  buttons: {
    flexDirection: 'row',
  },
  button: { marginHorizontal: 8 },
  yourShareIdText: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 16,
  },
  qrContainer: {
    marginBottom: 16,
  },
})

const MirroringShareModal: React.FC<Props> = ({ visible, onClose }: Props) => {
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets()
  const { startPublishing, stopPublishing, loading } = useMirroringShare(true)
  const { token, publishing } = useRecoilValue(mirroringShareState)
  const isLEDTheme = useIsLEDTheme()

  const handleShare = useCallback(async () => {
    const options = {
      title: 'TrainLCD',
      message: `${translate('publishShareText')} ID: ${token}`,
      url: `${MIRRORING_SHARE_DEEPLINK_URL}${token}`,
    }
    await Share.open(options)
  }, [token])

  const togglePublishing = useCallback(() => {
    if (publishing) {
      stopPublishing()
    } else {
      startPublishing()
    }
  }, [publishing, startPublishing, stopPublishing])

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
                  flex: 0.8,
                  shadowOpacity: 0.25,
                  shadowColor: '#000',
                  shadowRadius: 1,
                  borderRadius: 16,
                }
              : undefined,
          ]}
        >
          <Heading>{translate('msFeatureTitle')}</Heading>
          <View style={styles.switchContainer}>
            <Switch
              style={{ marginRight: 8 }}
              value={publishing}
              onChange={togglePublishing}
              disabled={loading}
            />

            <Typography
              style={{
                ...styles.settingsItemHeading,
                color: isLEDTheme ? '#fff' : '#555',
              }}
            >
              {translate('useMSFeatureTitle')}
            </Typography>
          </View>

          <Typography style={styles.yourShareIdText}>
            {token ? `${translate('yourShareKey')}: ${token}` : null}
          </Typography>
          {token ? (
            <View style={styles.qrContainer}>
              <QRCode
                value={
                  isDevApp
                    ? `trainlcd-canary://ms/${token}`
                    : `trainlcd://ms/${token}`
                }
              />
            </View>
          ) : null}
          <View style={styles.buttons}>
            {token ? (
              <Button style={styles.button} onPress={handleShare}>
                {translate('share')}
              </Button>
            ) : null}
            <Button style={styles.button} onPress={onClose}>
              {translate('cancel')}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export default MirroringShareModal
