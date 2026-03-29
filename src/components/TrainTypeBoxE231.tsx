import { useAtomValue } from 'jotai';
import { getLuminance } from 'polished';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { TrainType } from '~/@types/graphql';
import { TrainTypeKind } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import { useCurrentLine } from '~/hooks';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import navigationState from '~/store/atoms/navigation';
import { translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { isBusLine } from '~/utils/line';
import { RFValue } from '~/utils/rfValue';
import { getIsLocal, getIsRapid } from '~/utils/trainTypeString';
import truncateTrainType from '~/utils/truncateTrainType';

type Props = {
  trainType: TrainType | null;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  textBase: {
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: RFValue(36),
  },
  strokeBase: {
    position: 'absolute',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: RFValue(36),
    color: '#fff',
  },
});

const SHORT_NAME_JA: Record<string, string> = {
  [TrainTypeKind.Default]: '各駅\n停車',
  [TrainTypeKind.Branch]: '各駅\n停車',
  [TrainTypeKind.Rapid]: '快速',
  [TrainTypeKind.HighSpeedRapid]: '特快',
  [TrainTypeKind.Express]: '急行',
  [TrainTypeKind.LimitedExpress]: '特急',
};

const SHORT_NAME_ZH: Record<string, string> = {
  [TrainTypeKind.Default]: '各站\n停车',
  [TrainTypeKind.Branch]: '各站\n停车',
  [TrainTypeKind.Rapid]: '快速',
  [TrainTypeKind.HighSpeedRapid]: '特快',
  [TrainTypeKind.Express]: '急行',
  [TrainTypeKind.LimitedExpress]: '特急',
};

const SHORT_NAME_KO: Record<string, string> = {
  [TrainTypeKind.Default]: '각역\n정차',
  [TrainTypeKind.Branch]: '각역\n정차',
  [TrainTypeKind.Rapid]: '쾌속',
  [TrainTypeKind.HighSpeedRapid]: '특쾌',
  [TrainTypeKind.Express]: '급행',
  [TrainTypeKind.LimitedExpress]: '특급',
};

const formatCjk = (
  name: string | undefined | null,
  kind: TrainTypeKind | null | undefined,
  lang: 'JA' | 'ZH' | 'KO'
): string | null => {
  if (!name) {
    return null;
  }
  if (name.length <= 4) {
    if (name.length === 4) {
      return `${name.slice(0, 2)}\n${name.slice(2)}`;
    }
    return name;
  }
  // 4文字超の場合、kindから短縮名にフォールバック
  const map =
    lang === 'KO'
      ? SHORT_NAME_KO
      : lang === 'ZH'
        ? SHORT_NAME_ZH
        : SHORT_NAME_JA;
  const shortName = kind ? map[kind] : null;
  return shortName ?? null;
};

const TrainTypeBoxE231: React.FC<Props> = ({ trainType }: Props) => {
  const { headerState } = useAtomValue(navigationState);
  const currentLine = useCurrentLine();

  const isBus = isBusLine(currentLine);

  const trainTypeColor = useMemo(() => {
    if (getIsLocal(trainType)) {
      return '#FFD400';
    }
    if (getIsRapid(trainType)) {
      return '#f15a22';
    }
    return trainType?.color ?? '#FFD400';
  }, [trainType]);

  const strokeColor = useMemo(
    () => (getLuminance(trainTypeColor) > 0.4 ? '#555' : '#fff'),
    [trainTypeColor]
  );

  const headerLangState = useMemo((): HeaderLangState => {
    return headerState.split('_')[1] as HeaderLangState;
  }, [headerState]);

  const localTypeText = useMemo(() => {
    switch (headerLangState) {
      case 'EN':
        return translate('localEn');
      case 'ZH':
        return translate('localZh');
      case 'KO':
        return translate('localKo');
      default:
        return translate('local');
    }
  }, [headerLangState]);

  const trainTypeNameJa = (trainType?.name || localTypeText)?.replace(
    parenthesisRegexp,
    ''
  );

  const trainTypeNameR =
    truncateTrainType(trainType?.nameRoman || translate('localEn')) ?? '';

  const trainTypeNameZh = truncateTrainType(
    trainType?.nameChinese || translate('localZh')
  );
  const trainTypeNameKo = truncateTrainType(
    trainType?.nameKorean || translate('localKo')
  );

  const lineNameJa = currentLine?.nameShort?.replace(parenthesisRegexp, '');

  const trainTypeName = useMemo(() => {
    if (isBus) {
      return lineNameJa;
    }
    switch (headerLangState) {
      case 'EN':
        if (
          trainType?.kind === TrainTypeKind.Express ||
          trainType?.kind === TrainTypeKind.LimitedExpress
        ) {
          return 'Exp.';
        }
        if (
          trainType?.kind === TrainTypeKind.Rapid ||
          trainType?.kind === TrainTypeKind.HighSpeedRapid
        ) {
          return 'Rapid';
        }
        return trainTypeNameR;
      case 'ZH':
        return formatCjk(trainTypeNameZh, trainType?.kind, 'ZH');
      case 'KO':
        return formatCjk(trainTypeNameKo, trainType?.kind, 'KO');
      default:
        return formatCjk(trainTypeNameJa, trainType?.kind, 'JA');
    }
  }, [
    isBus,
    headerLangState,
    lineNameJa,
    trainTypeNameJa,
    trainTypeNameKo,
    trainTypeNameR,
    trainTypeNameZh,
    trainType?.kind,
  ]);

  const letterSpacing = useMemo(() => {
    if (trainTypeName?.length === 2) {
      return 8;
    }
    return 0;
  }, [trainTypeName?.length]);

  const paddingLeft = useMemo(() => {
    if (trainTypeName?.length === 2 && Platform.OS === 'ios') {
      return 8;
    }
    return 0;
  }, [trainTypeName?.length]);

  if (!trainTypeName) {
    return null;
  }

  const rawLength = trainTypeName.replace('\n', '').length;
  const fontSize =
    headerLangState === 'EN' || rawLength <= 2 ? RFValue(36) : RFValue(28);
  const lineHeight = Math.round(fontSize * 1.05);
  const numberOfLines = trainTypeName.includes('\n') ? 2 : 1;
  const strokeWidth = isTablet ? 3 : 2;
  const strokeOffsets = [
    { width: strokeWidth, height: 0 },
    { width: -strokeWidth, height: 0 },
    { width: 0, height: strokeWidth },
    { width: 0, height: -strokeWidth },
    { width: strokeWidth, height: strokeWidth },
    { width: -strokeWidth, height: -strokeWidth },
    { width: strokeWidth, height: -strokeWidth },
    { width: -strokeWidth, height: strokeWidth },
  ];

  return (
    <View style={styles.container}>
      {strokeOffsets.map((offset) => (
        <Text
          key={`${offset.width}_${offset.height}`}
          numberOfLines={numberOfLines}
          style={[
            styles.strokeBase,
            {
              fontSize,
              lineHeight,
              color: strokeColor,
              paddingLeft,
              letterSpacing,
              transform: [
                { translateX: offset.width },
                { translateY: offset.height },
              ],
            },
          ]}
        >
          {trainTypeName}
        </Text>
      ))}
      <Text
        numberOfLines={numberOfLines}
        style={[
          styles.textBase,
          {
            fontSize,
            lineHeight,
            paddingLeft,
            letterSpacing,
            color: trainTypeColor,
          },
        ]}
      >
        {trainTypeName}
      </Text>
    </View>
  );
};

export default React.memo(TrainTypeBoxE231);
