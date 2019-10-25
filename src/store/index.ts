import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import thunk from 'redux-thunk';

import locationReducer from './reducers/location';
import navigationReducer from './reducers/navigation';
import stationReducer from './reducers/station';
import { LocationActionTypes } from './types/location';
import { NavigationActionTypes } from './types/navigation';
import { StationActionTypes } from './types/station';

const middlewares = [thunk];

const rootReducer = combineReducers({
  location: locationReducer,
  station: stationReducer,
  navigation: navigationReducer,
});

export type ActionTypes = LocationActionTypes | StationActionTypes | NavigationActionTypes;

export type AppState = ReturnType<typeof rootReducer>;

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default createStore(
  rootReducer,
  composeEnhancers(
    applyMiddleware(...middlewares),
  ),
);
