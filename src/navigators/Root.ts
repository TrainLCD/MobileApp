import { createSwitchNavigator } from 'react-navigation';

import MainScreen from '../screens/Main';
import SelectBoundScreen from '../screens/SelectBound';
import SelectLineScreen from '../screens/SelectLine';

const RootNavigator = createSwitchNavigator({
  SelectLine: SelectLineScreen,
  SelectBound: SelectBoundScreen,
  Main: MainScreen,
});

export default RootNavigator;
