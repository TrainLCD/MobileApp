import { LineType } from './models/StationAPI';

export const HEADER_CONTENT_TRANSITION_INTERVAL = 3000; // ms
export const HEADER_CONTENT_TRANSITION_DELAY = 250; // ms
export const BOTTOM_CONTENT_TRANSITION_INTERVAL =
  HEADER_CONTENT_TRANSITION_INTERVAL * 2; // ms

// すべてメートル
// 普通電車
const NORMAL_APPROACHING_THRESHOLD = 800;
const NORMAL_ARRIVED_THRESHOLD = 200;
// 新幹線 接近表示は普通電車の３倍、到着表示は普通電車の２倍
const BT_APPROACHING_THRESHOLD = NORMAL_APPROACHING_THRESHOLD * 3;
const BT_ARRIVED_THRESHOLD = NORMAL_ARRIVED_THRESHOLD * 2;
// 地下鉄 電波が入りづらいため判定に対する広さを普通電車の1.5倍にする
const SUBWAY_APPROACHING_THRESHOLD = NORMAL_APPROACHING_THRESHOLD * 1.5;
const SUBWAY_ARRIVED_THRESHOLD = NORMAL_ARRIVED_THRESHOLD * 1.5;

export const getApproachingThreshold = (lineType: LineType) => {
  switch (lineType) {
    case LineType.BulletTrain:
      return BT_APPROACHING_THRESHOLD;
    case LineType.Subway:
      return SUBWAY_APPROACHING_THRESHOLD;
    default:
      return NORMAL_APPROACHING_THRESHOLD;
  }
};

export const getArrivedThreshold = (lineType: LineType) => {
  switch (lineType) {
    case LineType.BulletTrain:
      return BT_ARRIVED_THRESHOLD;
    case LineType.Subway:
      return SUBWAY_ARRIVED_THRESHOLD;
    default:
      return NORMAL_ARRIVED_THRESHOLD;
  }
};

export const BAD_ACCURACY_THRESHOLD = 1000; // m
// export const OMIT_JR_THRESHOLD = 3; // これ以上JR線があったら「JR線」で省略しよう
export const JR_LINE_MAX_ID = 6;

export const SHAKEN_THRESHOLD = 3;
