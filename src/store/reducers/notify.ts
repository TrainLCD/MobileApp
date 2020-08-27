import { NotifyActionTypes } from '../types/notify';

export interface NotifyState {
  targetStationIds: string[];
}

const initialState: NotifyState = {
  targetStationIds: [],
};

const notifyReducer = (
  state = initialState,
  action: NotifyActionTypes
): NotifyState => {
  switch (action.type) {
    case 'ADD_NOTIFY_STATION_ID':
      return {
        ...state,
        targetStationIds: [...state.targetStationIds, action.payload.id],
      };
    case 'REMOVE_NOTIFY_STATION_ID':
      return {
        ...state,
        targetStationIds: state.targetStationIds.filter(
          (id) => id !== action.payload.id
        ),
      };
    default:
      return state;
  }
};

export default notifyReducer;
