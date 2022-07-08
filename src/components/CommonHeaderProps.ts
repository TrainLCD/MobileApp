import { Line, Station } from '../models/StationAPI';

interface CommonHeaderProps {
  station: Station;
  nextStation?: Station;
  line?: Line | null;
  isLast: boolean;
}

export default CommonHeaderProps;
