import { LatLon } from '../models/LatLon';

const calcHubenyDistance = (from: LatLon, to: LatLon): number => {
  const { latitude: fromLatitude, longitude: fromLongitude } = from;
  const { latitude: toLatitude, longitude: toLongitude } = to;
  if (!fromLatitude || !fromLongitude || !toLatitude || !toLongitude) {
    return 0;
  }
  const rad = (deg: number): number => {
    return (deg * Math.PI) / 180;
  };
  const radFromLat = rad(fromLatitude);
  const radFromLon = rad(fromLongitude);
  const radToLat = rad(toLatitude);
  const radToLon = rad(toLongitude);

  const latDiff = radFromLat - radToLat;
  const lngDiff = radFromLon - radToLon;
  const latAvg = (radFromLat + radToLat) / 2.0;
  const a = 6378137.0;
  const e2 = 0.00669438002301188;
  const a1e2 = 6335439.32708317;

  const sinLat = Math.sin(latAvg);
  const W2 = 1.0 - e2 * (sinLat * sinLat);

  const M = a1e2 / (Math.sqrt(W2) * W2);
  const N = a / Math.sqrt(W2);

  const t1 = M * latDiff;
  const t2 = N * Math.cos(latAvg) * lngDiff;
  return Math.sqrt(t1 * t1 + t2 * t2);
};

export default calcHubenyDistance;
