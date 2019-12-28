import { LineType } from './models/StationAPI';

export const HEADER_CONTENT_TRANSITION_INTERVAL = 3000; // ms
export const HEADER_CONTENT_TRANSITION_DELAY = 250; // ms
export const BOTTOM_CONTENT_TRANSITION_INTERVAL =
  HEADER_CONTENT_TRANSITION_INTERVAL * 2; // ms

// すべてメートル
// 普通電車
const BASE_APPROACHING_THRESHOLD = 600;
const BASE_ARRIVED_THRESHOLD = 250;
// 新幹線 接近表示は普通電車の4倍、到着表示は普通電車の2倍
const BT_APPROACHING_THRESHOLD = BASE_APPROACHING_THRESHOLD * 4;
const BT_ARRIVED_THRESHOLD = BASE_ARRIVED_THRESHOLD * 2;

export const getApproachingThreshold = (lineType: string) => {
  const numberLineType = parseInt(lineType, 10);
  switch (numberLineType) {
    case LineType.BulletTrain:
      return BT_APPROACHING_THRESHOLD;
    default:
      return BASE_APPROACHING_THRESHOLD;
  }
};

export const getArrivedThreshold = (lineType: string) => {
  const numberLineType = parseInt(lineType, 10);
  switch (numberLineType) {
    case LineType.BulletTrain:
      return BT_ARRIVED_THRESHOLD;
    default:
      return BASE_ARRIVED_THRESHOLD;
  }
};

export const SHAKEN_THRESHOLD = 3;
