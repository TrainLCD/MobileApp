import {
  ADD_NOTIFY_STATION_ID,
  REMOVE_NOTIFY_STATION_ID,
  NotifyActionTypes,
} from '../types/notify';

export const addNotifyStationId = (id: string): NotifyActionTypes => ({
  type: ADD_NOTIFY_STATION_ID,
  payload: {
    id,
  },
});

export const removeNotifyStationId = (id: string): NotifyActionTypes => ({
  type: REMOVE_NOTIFY_STATION_ID,
  payload: {
    id,
  },
});
