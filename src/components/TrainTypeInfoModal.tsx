import type { ConnectError } from '@connectrpc/connect';
import type React from 'react';
import { Modal } from 'react-native';
import type { Station, TrainType } from '~/gen/proto/stationapi_pb';
import { TrainTypeInfoPage } from './TrainTypeInfoPage';

type Props = {
  visible: boolean;
  trainType: TrainType | null;
  stations: Station[];
  loading: boolean;
  disabled?: boolean;
  error: ConnectError | null;
  onClose: () => void;
  onConfirmed: (trainType: TrainType | undefined) => void;
};

export const TrainTypeInfoModal: React.FC<Props> = (props: Props) => {
  const { visible, onClose } = props;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <TrainTypeInfoPage {...props} />
    </Modal>
  );
};
