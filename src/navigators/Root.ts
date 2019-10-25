import { createSwitchNavigator } from 'react-navigation';

import HomeScreen from '../screens/Home';

const RootNavigator = createSwitchNavigator({
  Home: HomeScreen,
});

export default RootNavigator;
