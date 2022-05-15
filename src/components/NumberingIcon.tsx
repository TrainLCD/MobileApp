import React from 'react';
import { MarkShape } from '../constants/numbering';
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
  fullStationNumber: string;
};

const NumberingIcon: React.FC<Props> = ({
  shape,
  lineColor,
  fullStationNumber,
}: Props) => {
  // 01=札幌駅
  if (fullStationNumber === '01') {
    return <NumberingIconSapporo />;
  }

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
    case MarkShape.odakyu:
      return (
        <NumberingIconOdakyu
          lineColor={lineColor}
          fullStationNumber={fullStationNumber}
        />
      );
    case MarkShape.keio:
      return (
        <NumberingIconKeio
          lineColor={lineColor}
          fullStationNumber={fullStationNumber}
        />
      );
    default:
      return null;
  }
};

export default NumberingIcon;
