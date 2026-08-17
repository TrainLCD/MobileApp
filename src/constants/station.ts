export const YAMANOTE_LINE_MAJOR_STATIONS_ID = [
  1130229, // 品川
  1130205, // 渋谷
  1130208, // 新宿
  1130212, // 池袋
  1130220, // 上野
  1130224, // 東京
];

export const OSAKA_LOOP_LINE_MAJOR_STATIONS_ID = [
  1162310, // 大阪
  1162307, // 西九条
  1162313, // 京橋
  1162317, // 鶴橋
  1162301, // 天王寺
  1162302, // 新今宮
  1162306, // 弁天町
];

export const MEIJO_LINE_MAJOR_STATIONS_ID = [
  9951409, // 栄
  9951402, // 大曽根
  9951407, // 名古屋城
  9951413, // 金山
  9951419, // 新瑞橋
];

// ディズニーリゾートラインは 4 駅のみのため全駅を主要駅として扱う。
// 反時計回り (リゾートゲートウェイ → ディズニーランド → ベイサイド → ディズニーシー → リゾートゲートウェイ) の
// 一方向運行で、outboundStationsForLoopLine 側だけで参照する想定。
// 駅 ID は StationAPI 側の並び順 (ディズニーランド → ベイサイド → ディズニーシー → リゾートゲートウェイ) に従う。
export const DISNEY_RESORT_LINE_MAJOR_STATIONS_ID = [
  1134501, // 東京ディズニーランド・ステーション
  1134502, // ベイサイド・ステーション
  1134503, // 東京ディズニーシー・ステーション
  1134504, // リゾートゲートウェイ・ステーション
];

export const TOEI_OEDO_LINE_MAJOR_STATIONS_ID = [
  9930101, // 都庁前`
  9930107, // 飯田橋
  9930113, // 両国
  9930121, // 大門
  9930124, // 六本木
  9930138, // 光が丘
];

export const TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_OUTER = 9930100;
export const TOEI_OEDO_LINE_TOCHOMAE_STATION_ID_INNER = 9930101;
export const TOEI_OEDO_LINE_HIKARIGAOKA_STATION_ID = 9930138;
export const TOEI_OEDO_LINE_TSUKIJISHIJO_STATION_ID = 9930119;
export const TOEI_OEDO_LINE_RYOGOKU_STATION_ID = 9930113;
