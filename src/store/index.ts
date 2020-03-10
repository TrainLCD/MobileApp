import {applyMiddleware, combineReducers, compose, createStore} from 'redux';
import thunk from 'redux-thunk';

import lineReducer from './reducers/line';
import locationReducer from './reducers/location';
import navigationReducer from './reducers/navigation';
import stationReducer from './reducers/station';
import {LineActionTypes} from './types/line';
import {LocationActionTypes} from './types/location';
import {NavigationActionTypes} from './types/navigation';
import {StationActionTypes} from './types/station';

const middlewares = [thunk];

const rootReducer = combineReducers({
  location: locationReducer,
  station: stationReducer,
  navigation: navigationReducer,
  line: lineReducer,
});

export type ActionTypes =
  | LocationActionTypes
  | StationActionTypes
  | NavigationActionTypes
  | LineActionTypes;

export type TrainLCDAppState = ReturnType<typeof rootReducer>;

const composeEnhancers =
  (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(...middlewares)),
);
