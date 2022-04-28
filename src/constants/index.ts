import { RFValue } from 'react-native-responsive-fontsize';

export const HEADER_CONTENT_TRANSITION_INTERVAL = 2000; // ms
export const HEADER_CONTENT_TRANSITION_DELAY = 400; // ms
export const BOTTOM_CONTENT_TRANSITION_INTERVAL = 8000; // ms
export const YAMANOTE_LINE_BOARD_FILL_DURATION = 2000;
export const YAMANOTE_CHEVRON_SCALE_DURATION = 500;
export const YAMANOTE_CHEVRON_MOVE_DURATION = 750;
export const MANY_LINES_THRESHOLD = 7;

export const OMIT_JR_THRESHOLD = 2; // これ以上JR線があったら「JR線」で省略しよう
export const JR_LINE_MAX_ID = 6;

export const PREFS_JA = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
];

export const PREFS_EN = [
  'Hokkaido',
  'Aomori',
  'Iwate',
  'Miyagi',
  'Akita',
  'Yamagata',
  'Fukushima',
  'Ibaraki',
  'Tochigi',
  'Gunma',
  'Saitama',
  'Chiba',
  'Tokyo',
  'Kanagawa',
  'Nigata',
  'Toyama',
  'Ishikawa',
  'Fukui',
  'Yamanashi',
  'Nagano',
  'Gifu',
  'Shizuoka',
  'Aichi',
  'Mie',
  'Shiga',
  'Kyoto',
  'Osaka',
  'Hyogo',
  'Nara',
  'Wakayama',
  'Tottori',
  'Shimane',
  'Okayama',
  'Hiroshima',
  'Yamaguchi',
  'Tokushima',
  'Kagawa',
  'Ehime',
  'Kochi',
  'Fukuoka',
  'Saga',
  'Nagasaki',
  'Kumamoto',
  'Oita',
  'Miyazaki',
  'Kagoshima',
  'Okinawa',
];

export const LOCATION_TASK_NAME = 'trainlcd-background-location-task';

export const RUNNING_DURATION = 15000;
export const STOPPING_DURATION = RUNNING_DURATION + 1000;
export const WHOLE_DURATION = RUNNING_DURATION + STOPPING_DURATION;

// ポーリング判断を何msごとに行うか
export const MS_POLLING_INTERVAL = 1000 * 30;
// 長期間停車閾値
export const MS_LONG_DURATION_THRESHOLD = 1000 * 60;

export const STATION_NAME_FONT_SIZE = RFValue(45);
