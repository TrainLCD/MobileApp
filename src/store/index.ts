import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import thunk from 'redux-thunk';

import locationReducer from './reducers/location';
import stationReducer from './reducers/station';
import { LocationActionTypes } from './types/location';
import { StationActionTypes } from './types/station';

const middlewares = [thunk];

const rootReducer = combineReducers({
  location: locationReducer,
  station: stationReducer,
});

export type ActionTypes = LocationActionTypes | StationActionTypes;

export type AppState = ReturnType<typeof rootReducer>;

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

export default createStore(
  rootReducer,
  composeEnhancers(
    applyMiddleware(...middlewares),
  ),
);
