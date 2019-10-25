import React from 'react';
import { View } from 'react-native';

import LineBoard from '../../components/LineBoard';
import { BottomTransitionState } from '../../models/BottomTransitionState';
import { ILine, IStation } from '../../models/StationAPI';

interface IProps {
  line: ILine;
  leftStations: IStation[];
  state: BottomTransitionState;
}

const Main = (props: IProps) => {
  const { state, leftStations, line } = props;

  const presentBoard = () => {
    switch (state) {
      case 'LINE':
        return <LineBoard line={line} stations={leftStations} />;
    }
  };

  return <>{presentBoard()}</>;
};

export default Main;
