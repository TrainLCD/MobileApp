import { Line } from '../gen/stationapi_pb'
import { translate } from '../translation'
import { getIsMeijoLine } from '../utils/loopLine'

export type LineDirection = 'INBOUND' | 'OUTBOUND'

const getMeijoDirection = (direction: LineDirection) =>
  direction === 'INBOUND'
    ? translate('inboundMeijo')
    : translate('outboundMeijo')
const getNormalDirection = (direction: LineDirection) =>
  direction === 'INBOUND' ? translate('inbound') : translate('outbound')

export const directionToDirectionName = (
  line: Line.AsObject | null | undefined,
  direction: LineDirection
): string =>
  line && getIsMeijoLine(line.id)
    ? getMeijoDirection(direction)
    : getNormalDirection(direction)
