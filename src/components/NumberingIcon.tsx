import React from 'react';
import { MarkShape, NumberingIconSize } from '../constants/numbering';
import NumberingIconHalfSquare from './NumberingIconHalfSquare';
import NumberingIconKeio from './NumberingIconKeio';
import NumberingIconOdakyu from './NumberingIconOdakyu';
import NumberingIconReversedRound from './NumberingIconReversedRound';
import NumberingIconReversedSquare from './NumberingIconReversedSquare';
import NumberingIconReversedSquareWest from './NumberingIconReversedSquareWest';
import NumberingIconRound from './NumberingIconRound';
import NumberingIconSapporo from './NumberingIconSapporo';
import NumberingIconSquare from './NumberingIconSquare';

type Props = {
  shape: MarkShape;
  lineColor: string;
  stationNumber: string;
  threeLetterCode?: string;
  size?: NumberingIconSize;
};

const NumberingIcon: React.FC<Props> = ({
  shape,
  lineColor,
  stationNumber,
  threeLetterCode,
  size,
}: Props) => {
  // 01=札幌駅
  if (stationNumber === '01') {
    return <NumberingIconSapporo />;
  }

  switch (shape) {
    case MarkShape.round:
      return (
        <NumberingIconRound
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.reversedRound:
      return (
        <NumberingIconReversedRound
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.reversedSquare:
      return (
        <NumberingIconReversedSquare
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.reversedSquareWest:
      return (
        <NumberingIconReversedSquareWest
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.jrUnion:
      return (
        <NumberingIconReversedSquare
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.square:
      return (
        <NumberingIconSquare
          lineColor={lineColor}
          stationNumber={stationNumber}
          threeLetterCode={threeLetterCode}
        />
      );
    case MarkShape.halfSquare:
    case MarkShape.halfSquareWithoutRound:
      return (
        <NumberingIconHalfSquare
          lineColor={lineColor}
          stationNumber={stationNumber}
          withRadius={shape === MarkShape.halfSquare}
          size={size}
        />
      );
    case MarkShape.odakyu:
      return (
        <NumberingIconOdakyu
          lineColor={lineColor}
          stationNumber={stationNumber}
        />
      );
    case MarkShape.keio:
      return (
        <NumberingIconKeio
          lineColor={lineColor}
          stationNumber={stationNumber}
        />
      );
    default:
      return null;
  }
};

NumberingIcon.defaultProps = {
  threeLetterCode: undefined,
  size: 'default',
};

export default NumberingIcon;
