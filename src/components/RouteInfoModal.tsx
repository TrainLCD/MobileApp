import type { ConnectError } from '@connectrpc/connect';
import { Modal } from 'react-native';
import type { Station, TrainType } from '~/gen/proto/stationapi_pb';
import { isJapanese } from '~/translation';
import { RouteInfo } from './RouteInfo';
import { useAtomValue } from 'jotai';
import stationState from '~/store/atoms/station';

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
  const { station } = useAtomValue(stationState);
  const { visible, routeName, trainType, onClose } = props;
  const lineName = isJapanese
    ? (station?.line?.nameShort ?? trainType?.line?.nameShort ?? '')
    : (station?.line?.nameRoman ?? trainType?.line?.nameRoman ?? '');
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
