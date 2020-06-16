import { Line, Station } from '../../models/StationAPI';
import { AppTheme } from '../../store/types/theme';

export interface CommonLineBoardProps {
  arrived: boolean;
  line: Line;
  stations: Station[];
  theme?: AppTheme;
}
