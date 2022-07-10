import React from 'react';
import { MarkShape, NumberingIconSize } from '../constants/numbering';
import NumberingIconHalfSquare from './NumberingIconHalfSquare';
import NumberingIconHankyu from './NumberingIconHankyu';
import NumberingIconHanshin from './NumberingIconHanshin';
import NumberingIconKeihan from './NumberingIconKeihan';
import NumberingIconKeikyu from './NumberingIconKeikyu';
import NumberingIconKeio from './NumberingIconKeio';
import NumberingIconKintetsu from './NumberingIconKintetsu';
import NumberingIconNankai from './NumberingIconNankai';
import NumberingIconNewShuttle from './NumberingIconNewShuttle';
import NumberingIconOdakyu from './NumberingIconOdakyu';
import NumberingIconReversedRound from './NumberingIconReversedRound';
import NumberingIconReversedRoundHorizontal from './NumberingIconReversedRoundHorizontal';
import NumberingIconReversedSquare from './NumberingIconReversedSquare';
import NumberingIconReversedSquareWest from './NumberingIconReversedSquareWest';
import NumberingIconRound from './NumberingIconRound';
import NumberingIconSanyo from './NumberingIconSanyo';
import NumberingIconSapporo from './NumberingIconSapporo';
import NumberingIconSquare from './NumberingIconSquare';
import NumberingIconTWR from './NumberingIconTWR';

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
    case MarkShape.hankyu:
      return (
        <NumberingIconHankyu
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.hanshin:
      return (
        <NumberingIconHanshin
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.sanyo:
      return (
        <NumberingIconSanyo
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
    case MarkShape.reversedRoundHorizontal:
      return (
        <NumberingIconReversedRoundHorizontal
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.keikyu:
      // 都営浅草線直通用
      if (stationNumber.split('-')[0] !== 'KK') {
        return (
          <NumberingIconRound
            lineColor={lineColor}
            stationNumber={stationNumber}
            size={size}
          />
        );
      }
      return (
        <NumberingIconKeikyu
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.kintetsu:
      return (
        <NumberingIconKintetsu
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.nankai:
      return (
        <NumberingIconNankai
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MarkShape.keihan:
      return (
        <NumberingIconKeihan
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
    case MarkShape.twr:
      return (
        <NumberingIconTWR lineColor={lineColor} stationNumber={stationNumber} />
      );
    case MarkShape.newShuttle:
      return (
        <NumberingIconNewShuttle
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
