import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TrainType } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import { useCurrentLine } from '~/hooks';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import { translate } from '~/translation';
import katakanaToHiragana from '~/utils/kanaToHiragana';
import { isBusLine } from '~/utils/line';
import truncateTrainType from '~/utils/truncateTrainType';
import Typography from './Typography';

type Props = {
  trainType: TrainType | null;
  // 2段目の補足表記の言語。1段目は常に日本語
  subLangState: HeaderLangState;
  width: number;
  height: number;
};

// 種別の情報が無いときに上の段へ出す translate('local') の読み
const LOCAL_KANA = 'かくえきていしゃ';

// 種別色を持たない列車の箱の色
const FALLBACK_COLOR = '#555';

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderColor: '#E6E6E6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: '#fff',
    includeFontPadding: false,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

const TrainTypeBoxSanyo: React.FC<Props> = ({
  trainType,
  subLangState,
  width,
  height,
}: Props) => {
  const currentLine = useCurrentLine();
  const isBus = isBusLine(currentLine);

  const mainText = useMemo(() => {
    if (isBus) {
      return currentLine?.nameShort?.replace(parenthesisRegexp, '') ?? '';
    }
    return (trainType?.name || translate('local')).replace(
      parenthesisRegexp,
      ''
    );
  }, [currentLine?.nameShort, isBus, trainType?.name]);

  const subText = useMemo(() => {
    if (isBus) {
      return '';
    }
    switch (subLangState) {
      case 'EN':
        return truncateTrainType(trainType?.nameRoman || translate('localEn'));
      case 'ZH':
        return truncateTrainType(
          trainType?.nameChinese || translate('localZh')
        );
      case 'KO':
        return truncateTrainType(trainType?.nameKorean || translate('localKo'));
      default:
        // 実物は日本語の表示中、種別名の読みをひらがなで添える
        if (!trainType?.name) {
          return LOCAL_KANA;
        }
        return katakanaToHiragana(trainType.nameKatakana);
    }
  }, [
    isBus,
    subLangState,
    trainType?.name,
    trainType?.nameChinese,
    trainType?.nameKatakana,
    trainType?.nameKorean,
    trainType?.nameRoman,
  ]);

  const backgroundColor =
    (isBus ? currentLine?.color : trainType?.color) ?? FALLBACK_COLOR;

  return (
    <View
      style={[
        styles.box,
        {
          width,
          height,
          backgroundColor,
          borderRadius: height * 0.12,
        },
      ]}
      testID="trainTypeBoxSanyo"
    >
      <Typography
        style={[
          styles.text,
          // 行の高さを字の大きさに近づけ、下の行との間を詰める
          { fontSize: height * 0.46, lineHeight: height * 0.5 },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {mainText}
      </Typography>
      {subText ? (
        <Typography
          style={[
            styles.text,
            { fontSize: height * 0.24, lineHeight: height * 0.27 },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {subText}
        </Typography>
      ) : null}
    </View>
  );
};

export default React.memo(TrainTypeBoxSanyo);
