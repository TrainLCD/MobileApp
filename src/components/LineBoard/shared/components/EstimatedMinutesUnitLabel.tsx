import { atom, useAtomValue } from 'jotai';
import type React from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { headerStateAtom } from '~/store/atoms/navigation';
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

// ヘッダーの言語Stateごとの単位表記。headerStateAtomは数秒ごとに
// ローテーションするため、算出済み文字列のderived atomを購読することで
// 単位が実際に変わったときだけ再レンダーされるようにする。
const estimatedMinutesUnitAtom = atom((get) => {
  const langState = get(headerStateAtom).split('_')[1] ?? 'JA';
  switch (langState) {
    case 'EN':
      return 'min.';
    case 'ZH':
      return '分钟';
    case 'KO':
      return '분';
    // JA・KANA
    default:
      return '分';
  }
});

export type EstimatedMinutesUnitLabelProps = {
  style?: TextStyle;
};

// ETAの残り分数はドット内に数字のみで表示されるため、最後のドットの右隣に
// 単位を添えて数字の意味を示す。
export const EstimatedMinutesUnitLabel: React.FC<
  EstimatedMinutesUnitLabelProps
> = ({ style }) => {
  const unit = useAtomValue(estimatedMinutesUnitAtom);

  return (
    <Typography style={[styles.text, style]} numberOfLines={1}>
      {unit}
    </Typography>
  );
};
