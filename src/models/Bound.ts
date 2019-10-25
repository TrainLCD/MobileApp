export type LoopLineDirection = 'INBOUND' | 'OUTBOUND';
export const directionToDirectionName = (direction: LoopLineDirection) => direction === 'INBOUND' ? '内回り' : '外回り';
