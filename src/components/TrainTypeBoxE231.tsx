import { useAtomValue } from 'jotai';
import { getLuminance } from 'polished';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
import { getIsLocal } from '~/utils/trainTypeString';
import truncateTrainType from '~/utils/truncateTrainType';
import Typography from './Typography';

type Props = {
  trainType: TrainType | null;
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'visible',
  },
  outerContainer: {
    height: Math.round(RFValue(28) * 1.1) * 2,
    justifyContent: 'center',
    overflow: 'visible',
  },
  enOverrideContainer: {
    alignItems: 'center',
  },
  textBase: {
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: RFValue(36),
    letterSpacing: 0,
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

type EnOverride = {
  heading: string;
  body: string;
  headingFontSize?: number;
  bodyFontSize?: number;
};

const SHORT_NAME_EN: Record<string, EnOverride> = {
  中央特快: { heading: 'Chūō', body: 'Special Rapid' },
  青梅特快: { heading: 'Ōme', body: 'Special Rapid' },
  通勤特快: {
    heading: 'Commuter',
    body: 'Special Rapid',
    headingFontSize: 21,
    bodyFontSize: 16,
  },
  通勤快速: {
    heading: 'Commuter',
    body: 'Rapid',
    headingFontSize: 21,
    bodyFontSize: 21,
  },
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
    return trainType?.color ?? '#FFD400';
  }, [trainType]);

  const strokeColor = useMemo(() => {
    try {
      return getLuminance(trainTypeColor) > 0.4 ? '#555' : '#fff';
    } catch {
      return '#fff';
    }
  }, [trainTypeColor]);

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
      case 'EN': {
        const enOverride = trainTypeNameJa
          ? SHORT_NAME_EN[trainTypeNameJa]
          : null;
        if (enOverride) {
          return `${enOverride.heading}\n${enOverride.body}`;
        }
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
      }
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

  const isEn = headerLangState === 'EN';

  const enOverride = useMemo(() => {
    if (!isEn || !trainTypeNameJa) {
      return null;
    }
    return SHORT_NAME_EN[trainTypeNameJa] ?? null;
  }, [isEn, trainTypeNameJa]);

  const letterSpacing = useMemo(() => {
    if (trainTypeName?.length === 2 && isEn) {
      return 8;
    }
    return 0;
  }, [trainTypeName?.length, isEn]);

  const paddingLeft = useMemo(() => {
    if (trainTypeName?.length === 2 && isEn && Platform.OS === 'ios') {
      return 8;
    }
    return 0;
  }, [trainTypeName?.length, isEn]);

  if (!trainTypeName) {
    return null;
  }

  const rawLength = trainTypeName.replace('\n', '').length;
  const fontSize =
    headerLangState === 'EN' || rawLength <= 2 ? RFValue(36) : RFValue(28);
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

  const renderStrokedText = (
    text: string,
    size: number,
    color: string,
    lines: number,
    align: 'left' | 'center' = 'left'
  ) => {
    const lh = Math.round(size * 1.1);
    const skew = isEn ? [{ skewX: '-7.5deg' }] : [];
    return (
      <View style={styles.container}>
        {strokeOffsets.map((offset) => (
          <Typography
            key={`${offset.width}_${offset.height}`}
            numberOfLines={lines}
            style={[
              styles.strokeBase,
              {
                fontSize: size,
                lineHeight: lh,
                color: strokeColor,
                paddingLeft: align === 'left' ? paddingLeft : 0,
                letterSpacing: align === 'left' ? letterSpacing : 0,
                textAlign: align,
                transform: [
                  { translateX: offset.width },
                  { translateY: offset.height },
                  ...skew,
                ],
              },
            ]}
          >
            {text}
          </Typography>
        ))}
        <Typography
          numberOfLines={lines}
          style={[
            styles.textBase,
            {
              fontSize: size,
              lineHeight: lh,
              paddingLeft: align === 'left' ? paddingLeft : 0,
              letterSpacing: align === 'left' ? letterSpacing : 0,
              color,
              textAlign: align,
              transform: skew,
            },
          ]}
        >
          {text}
        </Typography>
      </View>
    );
  };

  if (enOverride) {
    return (
      <View style={styles.outerContainer}>
        <View style={styles.enOverrideContainer}>
          {renderStrokedText(
            enOverride.heading,
            RFValue(enOverride.headingFontSize ?? 24),
            trainTypeColor,
            1
          )}
          {renderStrokedText(
            enOverride.body,
            RFValue(enOverride.bodyFontSize ?? 16),
            trainTypeColor,
            1
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      {renderStrokedText(
        trainTypeName,
        fontSize,
        trainTypeColor,
        numberOfLines
      )}
    </View>
  );
};

export default React.memo(TrainTypeBoxE231);
