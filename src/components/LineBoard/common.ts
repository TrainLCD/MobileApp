import { Line, Station } from '../../models/StationAPI';
import AppTheme from '../../models/Theme';

export interface CommonLineBoardProps {
  arrived: boolean;
  line: Line;
  stations: Station[];
  theme?: AppTheme;
}
