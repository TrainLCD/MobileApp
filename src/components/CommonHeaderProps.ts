import { StationResponse } from '../gen/stationapi_pb';

interface CommonHeaderProps {
  station: StationResponse.AsObject;
  nextStation?: StationResponse.AsObject;
  isLast: boolean;
}

export default CommonHeaderProps;
