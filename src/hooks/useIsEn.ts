import { useRecoilValue } from 'recoil';
import navigationState from '../store/atoms/navigation';

const useIsEn = (): boolean => {
  const { headerState } = useRecoilValue(navigationState);
  return headerState.endsWith('_EN') || headerState.endsWith('_ZH');
};

export default useIsEn;
