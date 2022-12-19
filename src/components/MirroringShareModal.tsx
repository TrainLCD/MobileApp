import React, { useCallback } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { hasNotch } from 'react-native-device-info';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Share from 'react-native-share';
import { useRecoilValue } from 'recoil';
import useMirroringShare from '../hooks/useMirroringShare';
import mirroringShareState from '../store/atoms/mirroringShare';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import Button from './Button';
import Heading from './Heading';

type Props = {
  visible: boolean;
  onClose: () => void;
};

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
    backgroundColor: 'white',
    paddingVertical: 32,
    width: '100%',
    alignItems: 'center',
  },
  settingsItemHeading: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    color: '#555',
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
});

const MirroringShareModal: React.FC<Props> = ({ visible, onClose }: Props) => {
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets();
  const { togglePublishing } = useMirroringShare(true);
  const { token, publishing } = useRecoilValue(mirroringShareState);

  const handleShare = useCallback(async () => {
    const options = {
      title: 'TrainLCD',
      message: `${translate('publishShareText')} ID: ${token}`,
      url: `${process.env.MIRRORING_SHARE_DEEPLINK_URL}${token}`,
    };
    await Share.open(options);
  }, [token]);

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
              onValueChange={togglePublishing}
            />

            <Text style={styles.settingsItemHeading}>
              {translate('useMSFeatureTitle')}
            </Text>
          </View>

          <Text style={styles.yourShareIdText}>
            {token ? `${translate('yourShareKey')}: ${token}` : null}
          </Text>
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
  );
};

export default MirroringShareModal;
