import React from 'react';
import { View } from 'react-native';

import LineBoard from '../../components/LineBoard';
import { BottomTransitionState } from '../../models/BottomTransitionState';
import { IStation } from '../../models/StationAPI';

interface IProps {
  leftStations: IStation[];
  state: BottomTransitionState;
}

const Main = (props: IProps) => {
  const { state, leftStations } = props;

  const presentBoard = () => {
    switch (state) {
      case 'LINE':
        return <LineBoard stations={leftStations} />;
    }
  };

  return <View>{presentBoard()}</View>;
};

export default Main;
