import * as ScreenOrientation from 'expo-screen-orientation';
import { useAtomValue } from 'jotai';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import reportModalVisibleAtom from '~/store/atoms/reportModal';

export const useLockLandscapeOnActive = () => {
  const isReportModalVisible = useAtomValue(reportModalVisibleAtom);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !isReportModalVisible) {
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        ).catch(console.warn);
      }
    });

    return () => sub.remove();
  }, [isReportModalVisible]);
};
