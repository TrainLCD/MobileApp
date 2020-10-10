export const ADD_NOTIFY_STATION_ID = 'ADD_NOTIFY_STATION_ID';
export const REMOVE_NOTIFY_STATION_ID = 'REMOVE_NOTIFY_STATION_ID';

export interface CommonPayload {
  id: string;
}

export interface AddNotifyStationIdAction {
  type: typeof ADD_NOTIFY_STATION_ID;
  payload: CommonPayload;
}

interface RemoveNotifyStationIdAction {
  type: typeof REMOVE_NOTIFY_STATION_ID;
  payload: CommonPayload;
}

export type NotifyActionTypes =
  | AddNotifyStationIdAction
  | RemoveNotifyStationIdAction;
