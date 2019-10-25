import { createAppContainer } from 'react-navigation';

import RootNavigator from './navigators/Root';

const AppNavigator = createAppContainer(RootNavigator);

export default AppNavigator;
