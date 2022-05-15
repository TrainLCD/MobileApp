import React from 'react';
import { MarkShape } from '../constants/numbering';
import NumberingIconHalfSquare from './NumberingIconHalfSquare';
import NumberingIconReversedRound from './NumberingIconReversedRound';
import NumberingIconReversedSquare from './NumberingIconReversedSquare';
import NumberingIconReversedSquareWest from './NumberingIconReversedSquareWest';
import NumberingIconRound from './NumberingIconRound';
import NumberingIconSquare from './NumberingIconSquare';

type Props = {
  shape: MarkShape;
  lineColor: string;
  fullStationNumber: string;
};

const NumberingIcon: React.FC<Props> = ({
  shape,
  lineColor,
  fullStationNumber,
}: Props) => {
  switch (shape) {
    case MarkShape.round:
      return (
        <NumberingIconRound
          lineColor={lineColor}
          fullStationNumber={fullStationNumber}
        />
      );
    case MarkShape.reversedRound:
      return (
        <NumberingIconReversedRound
          lineColor={lineColor}
          fullStationNumber={fullStationNumber}
        />
      );
    case MarkShape.reversedSquare:
      return (
        <NumberingIconReversedSquare
          lineColor={lineColor}
          fullStationNumber={fullStationNumber}
        />
      );
    case MarkShape.reversedSquareWest:
      return (
        <NumberingIconReversedSquareWest
          lineColor={lineColor}
          fullStationNumber={fullStationNumber}
        />
      );
    case MarkShape.square:
      return (
        <NumberingIconSquare
          lineColor={lineColor}
          fullStationNumber={fullStationNumber}
        />
      );
    case MarkShape.halfSquare:
    case MarkShape.halfSquareWithoutRound:
      return (
        <NumberingIconHalfSquare
          lineColor={lineColor}
          fullStationNumber={fullStationNumber}
          withRadius={shape === MarkShape.halfSquare}
        />
      );
    default:
      return null;
  }
};

export default NumberingIcon;
