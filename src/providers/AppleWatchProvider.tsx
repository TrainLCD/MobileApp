import React, { useEffect, useMemo } from 'react';
import { sendMessage } from 'react-native-watch-connectivity';
import { useRecoilValue } from 'recoil';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese, translate } from '../translation';

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
  const stationName = useMemo(() => {
    switch (headerState) {
      case 'CURRENT':
      case 'CURRENT_EN':
      case 'CURRENT_KANA':
        return isJapanese ? station?.name : station?.nameR;
      default:
        return isJapanese ? nextStation?.name : nextStation?.nameR;
    }
  }, [headerState, nextStation, station]);
  const linesNameArray = useMemo(() => {
    switch (headerState) {
      case 'CURRENT':
      case 'CURRENT_EN':
      case 'CURRENT_KANA':
        return isJapanese
          ? station?.lines.map((l) => l.name)
          : station?.lines.map((l) => l.nameR);
      default:
        return isJapanese
          ? nextStation?.lines.map((l) => l.name)
          : nextStation?.lines.map((l) => l.nameR);
    }
  }, [headerState, nextStation, station]);
  const linesColorArray = useMemo(() => {
    switch (headerState) {
      case 'CURRENT':
      case 'CURRENT_EN':
      case 'CURRENT_KANA':
        return station?.lines.map((l) => l.lineColorC);
      default:
        return nextStation?.lines.map((l) => l.lineColorC);
    }
  }, [headerState, nextStation, station]);

  useEffect(() => {
    const sendToWatch = async (): Promise<void> => {
      if (station) {
        sendMessage({
          state: localizedHeaderState,
          stationName,
          lines: linesNameArray.join(','),
          linesColor: linesColorArray.join(','),
        });
      }
    };

    sendToWatch();
  }, [
    linesColorArray,
    linesNameArray,
    localizedHeaderState,
    station,
    stationName,
  ]);

  return <>{children}</>;
};

export default AppleWatchProvider;
