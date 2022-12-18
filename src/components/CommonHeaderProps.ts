import { Station } from '../models/StationAPI';

interface CommonHeaderProps {
  station: Station;
  nextStation?: Station;
  isLast: boolean;
}

export default CommonHeaderProps;
