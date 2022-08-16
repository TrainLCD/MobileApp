import { Station, StopCondition } from '../models/StationAPI';
import isHoliday from './isHoliday';

const getIsPass = (station: Station | null | undefined): boolean => {
  if (!station) {
    return false;
  }

  switch (station.stopCondition) {
    case StopCondition.ALL:
      return false;
    case StopCondition.NOT:
      return true;
    case StopCondition.PARTIAL_STOP: // 一部停車は一旦停車扱い
    case StopCondition.PARTIAL: // 一部通過は停車扱い
      return false;
    case StopCondition.WEEKDAY:
      // 若干分かりづらい感じはするけど休日に飛ばすという意味
      return isHoliday;
    case StopCondition.HOLIDAY:
      return !isHoliday;
    default:
      return false;
  }
};

export default getIsPass;
