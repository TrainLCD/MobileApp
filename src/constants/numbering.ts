export enum MarkShape {
  round,
  roundThin,
  reversedRound,
  reversedRoundHorizontal,
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
  kintetsu,
  nankai,
  keihan,
  jrUnion,
  bulletTrainUnion,
}

// default: ヘッダーに使う
// small: 乗り換え案内に使う
// tiny: タブレット用LineBoardに使う
export type NumberingIconSize = 'default' | 'small' | 'tiny';
