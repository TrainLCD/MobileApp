import type { Line } from '~/@types/graphql';
import { MEIJO_LINE_ID } from '../constants';
import { translate } from '../translation';
export type LineDirection = 'INBOUND' | 'OUTBOUND';

const getMeijoLineDirection = (direction: LineDirection) =>
  direction === 'INBOUND'
    ? translate('inboundMeijo')
    : translate('outboundMeijo');
const getLoopLineDirection = (direction: LineDirection) =>
  direction === 'INBOUND' ? translate('inbound') : translate('outbound');

export const directionToDirectionName = (
  line: Line | null | undefined,
  direction: LineDirection
): string =>
  line && line.id === MEIJO_LINE_ID
    ? getMeijoLineDirection(direction)
    : getLoopLineDirection(direction);
