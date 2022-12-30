import React from 'react';
import {
  MarkShape,
  MARK_SHAPE,
  NumberingIconSize,
  NUMBERING_ICON_SIZE,
} from '../constants/numbering';
import NumberingIconHalfSquare from './NumberingIconHalfSquare';
import NumberingIconHankyu from './NumberingIconHankyu';
import NumberingIconHanshin from './NumberingIconHanshin';
import NumberingIconKeihan from './NumberingIconKeihan';
import NumberingIconKeikyu from './NumberingIconKeikyu';
import NumberingIconKeio from './NumberingIconKeio';
import NumberingIconKeisei from './NumberingIconKeisei';
import NumberingIconKintetsu from './NumberingIconKintetsu';
import NumberingIconNankai from './NumberingIconNankai';
import NumberingIconNewShuttle from './NumberingIconNewShuttle';
import NumberingIconNumberOnly from './NumberingIconNumberOnly';
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
  allowScaling?: boolean;
};

const NumberingIcon: React.FC<Props> = ({
  shape,
  lineColor,
  stationNumber,
  threeLetterCode,
  size,
  allowScaling,
}: Props) => {
  // 01=札幌駅
  if (stationNumber === '01') {
    return <NumberingIconSapporo />;
  }

  switch (shape) {
    case MARK_SHAPE.ROUND:
      return (
        <NumberingIconRound
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MARK_SHAPE.HANKYU:
      return (
        <NumberingIconHankyu
          lineColor={lineColor}
          stationNumber={stationNumber}
        />
      );
    case MARK_SHAPE.HANSHIN:
      return (
        <NumberingIconHanshin
          lineColor={lineColor}
          stationNumber={stationNumber}
        />
      );
    case MARK_SHAPE.SANYO:
      return (
        <NumberingIconSanyo
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MARK_SHAPE.REVERSED_ROUND:
      return (
        <NumberingIconReversedRound
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MARK_SHAPE.REVERSED_ROUND_HORIZONTAL:
      return (
        <NumberingIconReversedRoundHorizontal
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MARK_SHAPE.KEIKYU:
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
        />
      );
    case MARK_SHAPE.KINTETSU:
      return (
        <NumberingIconKintetsu
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MARK_SHAPE.NANKAI:
      return (
        <NumberingIconNankai
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MARK_SHAPE.KEIHAN:
      return (
        <NumberingIconKeihan
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MARK_SHAPE.REVERSED_SQUARE:
    case MARK_SHAPE.REVERSED_SQUARE_DARK_TEXT:
      return (
        <NumberingIconReversedSquare
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          darkText={shape === MARK_SHAPE.REVERSED_SQUARE_DARK_TEXT}
        />
      );
    case MARK_SHAPE.REVERSED_SQUARE_WEST:
    case MARK_SHAPE.REVERSED_SQUARE_WEST_DARK_TEXT:
      return (
        <NumberingIconReversedSquareWest
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          darkText={shape === MARK_SHAPE.REVERSED_SQUARE_WEST_DARK_TEXT}
        />
      );
    case MARK_SHAPE.JR_UNION:
      return (
        <NumberingIconReversedSquare
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MARK_SHAPE.SQUARE:
      return (
        <NumberingIconSquare
          lineColor={lineColor}
          stationNumber={stationNumber}
          threeLetterCode={threeLetterCode}
          allowScaling={allowScaling ?? true}
        />
      );
    case MARK_SHAPE.HALF_SQUARE:
    case MARK_SHAPE.HALF_SQUARE_WITHOUT_ROUND:
    case MARK_SHAPE.HALF_SQUARE_DARK_TEXT:
      return (
        <NumberingIconHalfSquare
          lineColor={lineColor}
          stationNumber={stationNumber}
          withRadius={
            shape === MARK_SHAPE.HALF_SQUARE ||
            shape === MARK_SHAPE.HALF_SQUARE_DARK_TEXT
          }
          size={size}
          darkText={shape === MARK_SHAPE.HALF_SQUARE_DARK_TEXT}
        />
      );
    case MARK_SHAPE.ODAKYU:
    case MARK_SHAPE.HAKONE:
      return (
        <NumberingIconOdakyu
          stationNumber={stationNumber}
          hakone={shape === MARK_SHAPE.HAKONE}
        />
      );
    case MARK_SHAPE.KEIO:
      return (
        <NumberingIconKeio
          lineColor={lineColor}
          stationNumber={stationNumber}
        />
      );
    case MARK_SHAPE.TWR:
      return (
        <NumberingIconTWR lineColor={lineColor} stationNumber={stationNumber} />
      );
    case MARK_SHAPE.NEW_SHUTTLE:
      return (
        <NumberingIconNewShuttle
          lineColor={lineColor}
          stationNumber={stationNumber}
        />
      );
    case MARK_SHAPE.NUMBER_ONLY:
      return (
        <NumberingIconNumberOnly
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    case MARK_SHAPE.KEISEI:
      return (
        <NumberingIconKeisei
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
        />
      );
    default:
      return null;
  }
};

NumberingIcon.defaultProps = {
  threeLetterCode: undefined,
  size: NUMBERING_ICON_SIZE.DEFAULT,
  allowScaling: true,
};

export default NumberingIcon;
