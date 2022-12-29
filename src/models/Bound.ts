import { translate } from '../translation';
import { isMeijoLine } from '../utils/loopLine';
import { Line } from './StationAPI';

export type LineDirection = 'INBOUND' | 'OUTBOUND';

const getMeijoDirection = (direction: LineDirection) =>
  direction === 'INBOUND'
    ? translate('inboundMeijo')
    : translate('outboundMeijo');
const getNormalDirection = (direction: LineDirection) =>
  direction === 'INBOUND' ? translate('inbound') : translate('outbound');

export const directionToDirectionName = (
  line: Line | null | undefined,
  direction: LineDirection
): string =>
  line && isMeijoLine(line.id)
    ? getMeijoDirection(direction)
    : getNormalDirection(direction);
