import type React from 'react';
import { StyleSheet, View } from 'react-native';
import { MARK_SHAPE, type NumberingIconSize } from '~/constants';
import NumberingIconHalfSquare from './NumberingIconHalfSquare';
import NumberingIconHankyu from './NumberingIconHankyu';
import NumberingIconHanshin from './NumberingIconHanshin';
import NumberingIconIzuhakone from './NumberingIconIzuhakone';
import NumberingIconKeihan from './NumberingIconKeihan';
import NumberingIconKeikyu from './NumberingIconKeikyu';
import NumberingIconKeio from './NumberingIconKeio';
import NumberingIconKeisei from './NumberingIconKeisei';
import NumberingIconKintetsu from './NumberingIconKintetsu';
import NumberingIconMonochromeRound from './NumberingIconMonochromeRound';
import NumberingIconNankai from './NumberingIconNankai';
import NumberingIconNewShuttle from './NumberingIconNewShuttle';
import NumberingIconNTL from './NumberingIconNTL';
import NumberingIconOdakyu from './NumberingIconOdakyu';
import NumberingIconReversedRound from './NumberingIconReversedRound';
import NumberingIconReversedRoundHorizontal from './NumberingIconReversedRoundHorizontal';
import NumberingIconReversedSquare from './NumberingIconReversedSquare';
import NumberingIconReversedSquareHorizontal from './NumberingIconReversedSquareHorizontal';
import NumberingIconReversedSquareWest from './NumberingIconReversedSquareWest';
import NumberingIconRound from './NumberingIconRound';
import NumberingIconRoundHorizontal from './NumberingIconRoundHorizontal';
import NumberingIconSanyo from './NumberingIconSanyo';
import NumberingIconSMR from './NumberingIconSMR';
import NumberingIconSquare from './NumberingIconSquare';
import NumberingIconTWR from './NumberingIconTWR';
import NumberingNishitetsu from './NumberingNishitetsu';

type Props = {
  shape: string;
  lineColor: string;
  stationNumber: string;
  threeLetterCode?: string | null;
  size?: NumberingIconSize;
  allowScaling?: boolean;
  withDarkTheme?: boolean;
  shouldGrayscale?: boolean;
  transformOrigin?: 'top' | 'center' | 'bottom';
  withOutline?: boolean;
};

const styles = StyleSheet.create({ pass: { opacity: 0.25 } });

const NumberingIconOriginal: React.FC<Props> = ({
  shape,
  lineColor,
  stationNumber,
  threeLetterCode,
  size,
  allowScaling,
  withDarkTheme,
  transformOrigin,
  withOutline,
}: Props) => {
  switch (shape) {
    case MARK_SHAPE.ROUND:
      return (
        <NumberingIconRound
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.ROUND_HORIZONTAL:
      return (
        <NumberingIconRoundHorizontal
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.HANKYU:
      return (
        <NumberingIconHankyu
          lineColor={lineColor}
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.HANSHIN:
      return (
        <NumberingIconHanshin
          lineColor={lineColor}
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.SANYO:
      return (
        <NumberingIconSanyo
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.REVERSED_ROUND:
      return (
        <NumberingIconReversedRound
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.REVERSED_ROUND_HORIZONTAL:
      return (
        <NumberingIconReversedRoundHorizontal
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
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
            withOutline={withOutline}
          />
        );
      }
      return (
        <NumberingIconKeikyu
          lineColor={lineColor}
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.KINTETSU:
      return (
        <NumberingIconKintetsu
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.NANKAI:
      return (
        <NumberingIconNankai
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.KEIHAN:
      return (
        <NumberingIconKeihan
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
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
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.REVERSED_SQUARE_WEST:
    case MARK_SHAPE.REVERSED_SQUARE_WEST_DARK_TEXT:
      return (
        <NumberingIconReversedSquareWest
          lineColor={lineColor}
          stationNumber={stationNumber}
          darkText={shape === MARK_SHAPE.REVERSED_SQUARE_WEST_DARK_TEXT}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.REVERSED_SQUARE_HORIZONTAL:
      return (
        <NumberingIconReversedSquareHorizontal
          lineColor={lineColor}
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.JR_UNION:
      return (
        <NumberingIconReversedSquare
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.SQUARE:
      return (
        <NumberingIconSquare
          lineColor={lineColor}
          stationNumber={stationNumber}
          threeLetterCode={threeLetterCode}
          allowScaling={allowScaling ?? true}
          size={size}
          transformOrigin={transformOrigin}
          withOutline={withOutline}
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
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.ODAKYU:
    case MARK_SHAPE.HAKONE:
      return (
        <NumberingIconOdakyu
          stationNumber={stationNumber}
          hakone={shape === MARK_SHAPE.HAKONE}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.KEIO:
      return (
        <NumberingIconKeio
          lineColor={lineColor}
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.TWR:
      return (
        <NumberingIconTWR
          lineColor={lineColor}
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.NEW_SHUTTLE:
      return (
        <NumberingIconNewShuttle
          lineColor={lineColor}
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.KEISEI:
      return (
        <NumberingIconKeisei
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.MONOCHROME_ROUND:
      return (
        <NumberingIconMonochromeRound
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.NTL:
      return (
        <NumberingIconNTL
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.SMR:
      return (
        <NumberingIconSMR
          withDarkTheme={withDarkTheme ?? false}
          size={size}
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.NISHITETSU:
      return (
        <NumberingNishitetsu
          lineColor={lineColor}
          stationNumber={stationNumber}
          size={size}
          withOutline={withOutline}
        />
      );
    case MARK_SHAPE.IZUHAKONE:
      return (
        <NumberingIconIzuhakone
          lineColor={lineColor}
          size={size}
          stationNumber={stationNumber}
          withOutline={withOutline}
        />
      );
    default:
      return null;
  }
};

const NumberingIcon = (props: Props) => {
  const { shouldGrayscale } = props;
  if (!shouldGrayscale) {
    return <NumberingIconOriginal {...props} />;
  }

  return (
    <View style={styles.pass}>
      <NumberingIconOriginal {...props} lineColor="#000" />
    </View>
  );
};

export default NumberingIcon;
