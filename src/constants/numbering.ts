export enum MarkShape {
  round,
  reversedRound,
  square,
  reversedSquare,
  reversedSquareWest,
  halfSquare,
  halfSquareWithoutRound,
  odakyu,
  keio,
  twr,
  newShuttle,
  keikyu,
  jrUnion,
  bulletTrainUnion,
}

// default: ヘッダーに使う
// small: 乗り換え案内に使う
// tiny: タブレット用LineBoardに使う
export type NumberingIconSize = 'default' | 'small' | 'tiny';
