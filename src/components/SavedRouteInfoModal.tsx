import type { ConnectError } from '@connectrpc/connect';
import { Modal } from 'react-native';
import type { Station, TrainType } from '~/gen/proto/stationapi_pb';
import { SavedRouteInfo } from './SavedRouteInfo';

type Props = {
  visible: boolean;
  trainType: TrainType | null;
  stations: Station[];
  loading: boolean;
  disabled?: boolean;
  error: ConnectError | null;
  routeName: string;
  onClose: () => void;
  onConfirmed: (trainType: TrainType | undefined, asTerminus?: boolean) => void;
};

export const SavedRouteInfoModal: React.FC<Props> = (props: Props) => {
  const { visible, onClose } = props;

  return (
    <Modal
      animationType="none"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <SavedRouteInfo {...props} fromRouteListModal={false} />
    </Modal>
  );
};
