import { translate } from '../translation';

export type LineDirection = 'INBOUND' | 'OUTBOUND';
export const directionToDirectionName = (direction: LineDirection): string =>
  direction === 'INBOUND' ? translate('inbound') : translate('outbound');
