import getTranslatedText from '../utils/translate';

export type LineDirection = 'INBOUND' | 'OUTBOUND';
export const directionToDirectionName = (direction: LineDirection): string =>
  direction === 'INBOUND'
    ? getTranslatedText('inbound')
    : getTranslatedText('outbound');
