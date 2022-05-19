import React from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { hasNotch } from 'react-native-device-info';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { translate } from '../translation';
import isTablet from '../utils/isTablet';
import { widthScale } from '../utils/scale';
import Button from './Button';
import Heading from './Heading';

const { height: windowHeight } = Dimensions.get('window');

type Props = {
  visible: boolean;
  sending: boolean;
  onClose: () => void;
  onSubmit: () => void;
  description: string;
  onDescriptionChange: (text: string) => void;
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
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#aaa',
    padding: 12,
    width: '100%',
    marginBottom: 24,
    color: 'black',
    fontSize: RFValue(14),
    flex: 1,
    marginVertical: 16,
    textAlignVertical: 'top',
    minHeight: windowHeight * 0.25,
  },
  caution: {
    fontSize: RFValue(14),
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
  },
  button: {
    marginHorizontal: 8,
    width: widthScale(64),
  },
  fill: {
    flex: 1,
  },
});

const NewReportModal: React.FC<Props> = ({
  visible,
  sending,
  onClose,
  onSubmit,
  description,
  onDescriptionChange,
}: Props) => {
  const { left: safeAreaLeft, right: safeAreaRight } = useSafeAreaInsets();

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
          <Heading>{translate('report')}</Heading>
          <KeyboardAvoidingView
            style={styles.fill}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TextInput
              autoFocus
              value={description}
              onChangeText={onDescriptionChange}
              multiline
              style={styles.textInput}
              placeholder={translate('reportPlaceholder')}
            />
            <Text style={styles.caution}>{translate('reportCaution')}</Text>
            <View style={styles.buttonContainer}>
              <Button
                style={styles.button}
                disabled={!description.trim().length || sending}
                color="#008ffe"
                onPress={onSubmit}
              >
                {sending
                  ? translate('reportSendInProgress')
                  : translate('reportSend')}
              </Button>
              <Button
                disabled={sending}
                style={styles.button}
                onPress={onClose}
              >
                {translate('cancel')}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default NewReportModal;
