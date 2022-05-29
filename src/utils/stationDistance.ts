import * as geolib from 'geolib';
import { Station } from '../models/StationAPI';

// 駅配列から平均駅間距離（直線距離）を求める
// eslint-disable-next-line import/prefer-default-export
export const getAvgStationBetweenDistances = (stations: Station[]): number =>
  !stations.length
    ? 0
    : stations.reduce((acc, cur, idx, arr) => {
        const prev = arr[idx - 1];
        if (!prev) {
          return acc;
        }
        const { latitude, longitude } = cur;
        const { latitude: prevLatitude, longitude: prevLongitude } = prev;
        const distance = geolib.getDistance(
          { latitude, longitude },
          { latitude: prevLatitude, longitude: prevLongitude }
        );
        return acc + distance;
      }, 0) / stations.length;
