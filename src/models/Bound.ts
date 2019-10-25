export type LineDirection = 'INBOUND' | 'OUTBOUND';
export const directionToDirectionName = (direction: LineDirection) => direction === 'INBOUND' ? '内回り' : '外回り';
