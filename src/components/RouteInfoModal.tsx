import type { ConnectError } from '@connectrpc/connect';
import { Modal } from 'react-native';
import type { Station, TrainType } from '~/gen/proto/stationapi_pb';
import { isJapanese } from '~/translation';
import { RouteInfo } from './RouteInfo';

type Props = {
  visible: boolean;
  trainType: TrainType | null;
  stations: Station[];
  loading: boolean;
  disabled?: boolean;
  error: ConnectError | null;
  routeName?: string;
  onClose: () => void;
};

export const RouteInfoModal: React.FC<Props> = (props: Props) => {
  const { visible, routeName, trainType, onClose } = props;
  const lineName = isJapanese
    ? trainType?.line?.nameShort
    : trainType?.line?.nameRoman;
  const trainTypeName = isJapanese ? trainType?.name : trainType?.nameRoman;
  const displayRouteName = routeName
    ? routeName
    : `${lineName} ${trainTypeName ?? ''}`;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <RouteInfo {...props} routeName={displayRouteName} />
    </Modal>
  );
};
