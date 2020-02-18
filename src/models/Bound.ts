import i18n from 'i18n-js';

export type LineDirection = 'INBOUND' | 'OUTBOUND';
export const directionToDirectionName =
  (direction: LineDirection) =>
    direction === 'INBOUND' ? i18n.t('inbound') : i18n.t('outbound');
