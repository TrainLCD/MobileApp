import type { AnimatedStyle } from 'react-native-reanimated';
import type { Line, Station, StationNumber, TrainType } from '~/@types/graphql';
import type {
  HeaderLangState,
  HeaderTransitionState,
} from '~/models/HeaderTransitionState';

/**
 * Header.tsxで計算され、各子コンポーネントにPropsとして渡される共通データ
 */
export type CommonHeaderProps = {
  // 駅・路線データ
  currentStation: Station;
  currentLine: Line | null;
  nextStation: Station | undefined;

  // グローバル状態
  selectedBound: Station | null;
  arrived: boolean;
  headerState: HeaderTransitionState;
  headerTransitionDelay: number;

  // テキスト
  headerLangState: HeaderLangState;
  stationText: string;
  stateText: string;
  stateTextRight: string;
  boundText: string;

  // ナンバリング
  currentStationNumber: StationNumber | undefined;
  threeLetterCode: string | undefined;
  numberingColor: string;

  // その他
  trainType: TrainType | null;
  isLast: boolean;
  firstStop: boolean;
  connectedLines: Line[];
  connectionText: string;
  isJapaneseState: boolean;
};

/**
 * HeaderE235用Props（isJOを追加）
 */
export type HeaderE235Props = CommonHeaderProps & {
  isJO?: boolean;
};

/**
 * useHeaderAnimationの戻り値型
 */
export type HeaderAnimationState = {
  // 前フレームの値（トランジション用）
  prevStationText: string;
  prevStateText: string;
  prevStateTextRight: string;
  prevBoundText: string;
  prevConnectionText: string;
  prevIsJapaneseState: boolean;

  // アニメーションスタイル
  stateTopAnimatedStyles: AnimatedStyle;
  stateBottomAnimatedStyles: AnimatedStyle;
  topNameAnimatedAnchorStyle: AnimatedStyle;
  bottomNameAnimatedAnchorStyle: AnimatedStyle;
  topNameAnimatedStyles: AnimatedStyle;
  bottomNameAnimatedStyles: AnimatedStyle;
  boundTopAnimatedStyles: AnimatedStyle;
  boundBottomAnimatedStyles: AnimatedStyle;
};
