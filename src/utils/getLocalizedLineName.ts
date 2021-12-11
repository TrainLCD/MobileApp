import { parenthesisRegexp } from '../constants/regexp';
import { Line } from '../models/StationAPI';
import { isJapanese } from '../translation';

const getLocalizedLineName = (l: Line | undefined): string | undefined => {
  if (isJapanese) {
    return l?.name.replace(parenthesisRegexp, '');
  }
  return l?.nameR.replace(parenthesisRegexp, '');
};

export default getLocalizedLineName;
