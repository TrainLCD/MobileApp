import { useAtomValue } from 'jotai';
import type React from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { isEnAtom } from '~/store/selectors/isEn';
import isTablet from '~/utils/isTablet';
import Typography from '../../../Typography';

const styles = StyleSheet.create({
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: isTablet ? 21 : 15,
    // 路線色バーの上に重ねて描画されるため、どの路線色でも判読できるよう縁取る
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
});

export type EstimatedMinutesUnitLabelProps = {
  style?: TextStyle;
};

// ETAの残り分数はドット内に数字のみで表示されるため、最後のドットの右隣に
// 単位を添えて数字の意味を示す。表示言語はLineBoard全体の言語切替
// (isEnAtom: 各言語Stateを英語表示か日本語表示かへ集約する) に追従する。
export const EstimatedMinutesUnitLabel: React.FC<
  EstimatedMinutesUnitLabelProps
> = ({ style }) => {
  const isEn = useAtomValue(isEnAtom);

  return (
    <Typography style={[styles.text, style]} numberOfLines={1}>
      {isEn ? 'min.' : '分'}
    </Typography>
  );
};
