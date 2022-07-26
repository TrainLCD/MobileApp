export enum MarkShape {
  round,
  reversedRound,
  reversedRoundHorizontal,
  square,
  reversedSquare,
  reversedSquareWest,
  reversedSquareWestDarkText,
  halfSquare,
  halfSquareWithoutRound,
  halfSquareDarkText,
  odakyu,
  keio,
  twr,
  newShuttle,
  keikyu,
  kintetsu,
  nankai,
  keihan,
  hankyu,
  hanshin,
  sanyo,
  jrUnion,
  bulletTrainUnion,
  numberOnly,
}

// default: ヘッダーに使う
// small: 乗り換え案内に使う
// tiny: タブレット用LineBoardに使う
export type NumberingIconSize = 'default' | 'small' | 'tiny';
