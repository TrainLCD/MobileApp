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
    // Yogaはwidth未指定の絶対配置子を親の幅を上限に測るため、幅の狭い
    // ドットに載せると最長表記の「min.」が途中で切り詰められてしまう。
    // 最長表記が縁取り込みで収まる固有幅を明示して親幅の影響を断つ
    width: isTablet ? 56 : 40,
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
// 単位を添えて数字の意味を示す。表記は駅名表示と同じ言語切替(isEnAtom)に
// 追従した「分/min.」の二択で、中国語・韓国語の専用表記は持たない
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
