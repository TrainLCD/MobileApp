import { type Station, StopCondition } from '../../gen/proto/stationapi_pb';
import { getIsHoliday } from './isHoliday';

const getIsPass = (
  station: Station | null,
  ignoreDayCondition?: boolean
): boolean =>
  getIsPassFromStopCondition(station?.stopCondition, ignoreDayCondition);

export const getIsPassFromStopCondition = (
  stopCondition: StopCondition | undefined,
  ignoreDayCondition?: boolean
) => {
  switch (stopCondition) {
    case StopCondition.All:
    case StopCondition.PartialStop: // 一部停車は一旦停車扱い
    case StopCondition.Partial: // 一部通過は停車扱い
      return false;
    case StopCondition.Not:
      return true;
    case StopCondition.Weekday:
      // 若干分かりづらい感じはするけど休日に飛ばすという意味
      return ignoreDayCondition || getIsHoliday();
    case StopCondition.Holiday:
      return ignoreDayCondition || !getIsHoliday();
    default:
      return false;
  }
};

export default getIsPass;
