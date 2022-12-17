import { Station, STOP_CONDITION } from '../models/StationAPI';
import isHoliday from './isHoliday';

const getIsPass = (station: Station | null | undefined): boolean => {
  if (!station) {
    return false;
  }

  switch (station.stopCondition) {
    case STOP_CONDITION.ALL:
    case STOP_CONDITION.PARTIAL_STOP: // 一部停車は一旦停車扱い
    case STOP_CONDITION.PARTIAL: // 一部通過は停車扱い
      return false;
    case STOP_CONDITION.NOT:
      return true;
    case STOP_CONDITION.WEEKDAY:
      // 若干分かりづらい感じはするけど休日に飛ばすという意味
      return isHoliday;
    case STOP_CONDITION.HOLIDAY:
      return !isHoliday;
    default:
      return false;
  }
};

export default getIsPass;
