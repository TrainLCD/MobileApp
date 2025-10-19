import memoize from 'lodash/memoize';
import { type Station, StopCondition } from '~/@types/graphql';
import { getIsHoliday } from './isHoliday';

const getIsPass = memoize((station: Station | null): boolean =>
  getIsPassFromStopCondition(station?.stopCondition)
);

export const getIsPassFromStopCondition = (
  stopCondition: StopCondition | undefined | null
) => {
  const isHoliday = getIsHoliday(new Date());

  switch (stopCondition) {
    case StopCondition.All:
    case StopCondition.PartialStop: // 一部停車は一旦停車扱い
    case StopCondition.Partial: // 一部通過は停車扱い
      return false;
    case StopCondition.Not:
      return true;
    case StopCondition.Weekday:
      // 若干分かりづらい感じはするけど休日に飛ばすという意味
      return isHoliday;
    case StopCondition.Holiday:
      return !isHoliday;
    default:
      return false;
  }
};

export default getIsPass;
