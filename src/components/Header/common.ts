import { LineDirection } from '../../models/Bound';
import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Line, Station } from '../../models/StationAPI';
import AppTheme from '../../models/Theme';

export interface CommonHeaderProps {
  state: HeaderTransitionState;
  station: Station;
  nextStation?: Station;
  boundStation?: Station | null;
  lineDirection?: LineDirection | null;
  line?: Line | null;
  stations: Station[];
  theme?: AppTheme;
  connectedNextLines?: Line[];
}
