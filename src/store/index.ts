import {
  applyMiddleware,
  combineReducers,
  compose,
  createStore,
  StoreEnhancer,
} from 'redux';

import lineReducer from './reducers/line';
import locationReducer from './reducers/location';
import navigationReducer from './reducers/navigation';
import stationReducer from './reducers/station';
import { LineActionTypes } from './types/line';
import { LocationActionTypes } from './types/location';
import { NavigationActionTypes } from './types/navigation';
import { StationActionTypes } from './types/station';
import { ThemeActionTypes } from './types/theme';
import themeReducer from './reducers/theme';

const rootReducer = combineReducers({
  location: locationReducer,
  station: stationReducer,
  navigation: navigationReducer,
  line: lineReducer,
  theme: themeReducer,
});

export type ActionTypes =
  | LocationActionTypes
  | StationActionTypes
  | NavigationActionTypes
  | LineActionTypes
  | ThemeActionTypes;

export type TrainLCDAppState = ReturnType<typeof rootReducer>;

const composeEnhancers =
  ((window as unknown) as {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: (
      enhancer: StoreEnhancer
    ) => StoreEnhancer;
  }).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default createStore(rootReducer, composeEnhancers(applyMiddleware()));
