import React from 'react';
import { Modal, View, StyleSheet, Text } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { RFValue } from 'react-native-responsive-fontsize';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { translate } from '../translation';
import { widthScale } from '../utils/scale';
import Button from './Button';
import Heading from './Heading';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSend: () => void;
  description: string;
  onDescriptionChange: (text: string) => void;
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalView: {
    flex: 1,
    backgroundColor: 'white',
    padding: 32,
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
});

const NewReportModal: React.FC<Props> = ({
  visible,
  onClose,
  onSend,
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
      <View style={styles.modalContainer}>
        <View
          style={[
            styles.modalView,
            { paddingLeft: safeAreaLeft, paddingRight: safeAreaRight },
          ]}
        >
          <Heading>{translate('report')}</Heading>
          <TextInput
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
              disabled={!description.length}
              color="#008ffe"
              onPress={onSend}
            >
              {translate('reportSend')}
            </Button>
            <Button style={styles.button} onPress={onClose}>
              {translate('cancel')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default NewReportModal;
