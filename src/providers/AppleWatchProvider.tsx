import React, { useCallback, useEffect, useMemo } from 'react';
import { Platform, PlatformIOSStatic } from 'react-native';
import { sendMessage, watchEvents } from 'react-native-watch-connectivity';
import { useRecoilValue } from 'recoil';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { translate } from '../translation';

const { isPad } = Platform as PlatformIOSStatic;

type Props = {
  children: React.ReactNode;
};

const AppleWatchProvider: React.FC<Props> = ({ children }: Props) => {
  const { station } = useRecoilValue(stationState);
  const { headerState, leftStations } = useRecoilValue(navigationState);

  const localizedHeaderState = useMemo(() => {
    switch (headerState) {
      case 'ARRIVING':
      case 'ARRIVING_EN':
      case 'ARRIVING_KANA':
        return translate('arrivingAt');
      case 'CURRENT':
      case 'CURRENT_EN':
      case 'CURRENT_KANA':
        return translate('nowStoppingAt');
      case 'NEXT':
      case 'NEXT_EN':
      case 'NEXT_KANA':
        return translate('next');
      default:
        return '';
    }
  }, [headerState]);

  const nextStation = leftStations[1];

  const switchedStation = useMemo(() => {
    switch (headerState) {
      case 'CURRENT':
      case 'CURRENT_EN':
      case 'CURRENT_KANA':
        return station;
      default:
        return nextStation;
    }
  }, [headerState, nextStation, station]);

  const sendToWatch = useCallback(async (): Promise<void> => {
    if (station) {
      sendMessage({
        state: localizedHeaderState,
        station: switchedStation,
      });
    }
  }, [localizedHeaderState, station, switchedStation]);

  useEffect(() => {
    if (Platform.OS === 'android' || isPad) {
      return (): void => {
        // nothing to do.
      };
    }
    sendToWatch();
    const unsubscribeReachabilitySub = watchEvents.addListener(
      'reachability',
      () => {
        sendToWatch();
      }
    );

    return (): void => {
      unsubscribeReachabilitySub();
    };
  }, [sendToWatch]);

  return <>{children}</>;
};

export default AppleWatchProvider;
