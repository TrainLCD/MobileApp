import { HeaderTransitionState } from '../../models/HeaderTransitionState';
import { Station, Line } from '../../models/StationAPI';
import { LineDirection } from '../../models/Bound';
import AppTheme from '../../models/Theme';

export interface CommonHeaderProps {
  state: HeaderTransitionState;
  station: Station;
  nextStation?: Station;
  boundStation?: Station;
  lineDirection?: LineDirection;
  line?: Line;
  stations: Station[];
  theme?: AppTheme;
}
