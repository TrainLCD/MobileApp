import React, { useEffect, useState } from 'react';
import { BackHandler, NativeEventSubscription } from 'react-native';

import LineBoard from '../../components/LineBoard';
import Transfers from '../../components/Transfers';
import { BottomTransitionState } from '../../models/BottomTransitionState';
import { ILine, IStation } from '../../models/StationAPI';
import {
    getCurrentStationLinesWithoutCurrentLine, getNextStationLinesWithoutCurrentLine,
} from '../../utils/jr';

interface IProps {
  line: ILine;
  leftStations: IStation[];
  state: BottomTransitionState;
  arrived: boolean;
  onBackButtonPress: () => void;
}

const getTransferLines = (isArrived: boolean, leftStations: IStation[], selectedLine: ILine) => {
  // 到着時は現在の駅の乗換情報を表示する
  if (isArrived) {
    return getCurrentStationLinesWithoutCurrentLine(leftStations, selectedLine);
  }
  return getNextStationLinesWithoutCurrentLine(leftStations, selectedLine);
};

const Main = (props: IProps) => {
  const { arrived, state, leftStations, line, onBackButtonPress } = props;
  const [backHandler, setBackHandler] = useState<NativeEventSubscription>(null);

  useEffect(() => {
    setBackHandler(BackHandler.addEventListener('hardwareBackPress', () => {
      onBackButtonPress();
      return () => {
        backHandler.remove();
      };
    }));
  });

  const transferLines = getTransferLines(arrived, leftStations, line);

  switch (state) {
    case 'LINE':
      return <LineBoard arrived={arrived} line={line} stations={leftStations} />;
    case 'TRANSFER':
      return <Transfers lines={transferLines} />;
  }
};

export default Main;
