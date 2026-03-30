import { useAtomValue } from 'jotai';
import { getLuminance } from 'polished';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Text as SvgText } from 'react-native-svg';
import type { TrainType } from '~/@types/graphql';
import { TrainTypeKind } from '~/@types/graphql';
import { FONTS, parenthesisRegexp } from '~/constants';
import { useCurrentLine } from '~/hooks';
import type { HeaderLangState } from '~/models/HeaderTransitionState';
import navigationState from '~/store/atoms/navigation';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { translate } from '~/translation';
import isTablet from '~/utils/isTablet';
import { isBusLine } from '~/utils/line';
import { RFValue } from '~/utils/rfValue';
import { getIsLocal } from '~/utils/trainTypeString';
import truncateTrainType from '~/utils/truncateTrainType';

type Props = {
  trainType: TrainType | null;
};

const CONTAINER_HEIGHT = Math.round(RFValue(28) * 1.1) * 2;
const SVG_STROKE_WIDTH = (isTablet ? 3 : 2) * 2;
const STROKE_PAD = SVG_STROKE_WIDTH;
// skewX(-7.5)はSVG原点基準で適用されるため、y座標に比例して左にズレる。その分translateで補正する
const SKEW_SHIFT = Math.ceil(
  (CONTAINER_HEIGHT + STROKE_PAD * 2) * Math.tan((7.5 * Math.PI) / 180)
);

// CJK文字はほぼ正方形、Latin文字は約0.62倍幅で推定
const estimateLineWidth = (
  text: string,
  size: number,
  spacing: number
): number => {
  let w = 0;
  for (const ch of text) {
    w += ch.charCodeAt(0) > 0x2e80 ? size : size * 0.62;
  }
  const charCount = [...text].length;
  return w + spacing * Math.max(0, charCount - 1) + SVG_STROKE_WIDTH;
};

const styles = StyleSheet.create({
  outerContainer: {
    height: CONTAINER_HEIGHT,
    justifyContent: 'center',
  },
  svg: {
    marginTop: -STROKE_PAD,
    marginLeft: -STROKE_PAD,
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
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

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

  const fontFamily = useMemo(() => {
    if (isLEDTheme) {
      return FONTS.JFDotJiskan24h;
    }
    return FONTS.RobotoBold;
  }, [isLEDTheme]);

  const fontWeight = isLEDTheme ? ('normal' as const) : ('bold' as const);

  if (!trainTypeName) {
    return null;
  }

  const rawLength = trainTypeName.replace('\n', '').length;
  const fontSize =
    headerLangState === 'EN' || rawLength <= 2 ? RFValue(36) : RFValue(28);

  const SKEW_TRANSFORM = `translate(${SKEW_SHIFT}, 0) skewX(-7.5)`;

  const renderLines = (
    lines: { text: string; size: number }[],
    fillColor: string,
    textAnchor: 'start' | 'middle' = 'start',
    x: number | string = STROKE_PAD
  ) => {
    const lineHeights = lines.map(({ size }) => Math.round(size * 1.1));
    const totalH = lineHeights.reduce((sum, lh) => sum + lh, 0);
    const topY = (CONTAINER_HEIGHT - totalH) / 2 + STROKE_PAD;

    let accY = topY;
    const positions = lines.map(({ size }, i) => {
      // dominantBaselineが型にないため、baselineからの補正で垂直中央を再現
      const baselineY = accY + size * 0.78;
      accY += lineHeights[i];
      return baselineY;
    });

    return (
      <>
        {lines.map(({ text, size }, i) => (
          <SvgText
            key={`s_${text}`}
            x={x}
            y={positions[i]}
            fontSize={size}
            fontFamily={fontFamily}
            fontWeight={fontWeight}
            textAnchor={textAnchor}
            fill="none"
            stroke={strokeColor}
            strokeWidth={SVG_STROKE_WIDTH}
            strokeLinejoin="round"
            strokeLinecap="round"
            letterSpacing={textAnchor === 'start' ? letterSpacing : 0}
          >
            {text}
          </SvgText>
        ))}
        {lines.map(({ text, size }, i) => (
          <SvgText
            key={`f_${text}`}
            x={x}
            y={positions[i]}
            fontSize={size}
            fontFamily={fontFamily}
            fontWeight={fontWeight}
            textAnchor={textAnchor}
            fill={fillColor}
            letterSpacing={textAnchor === 'start' ? letterSpacing : 0}
          >
            {text}
          </SvgText>
        ))}
      </>
    );
  };

  if (enOverride) {
    const headingSize = RFValue(enOverride.headingFontSize ?? 24);
    const bodySize = RFValue(enOverride.bodyFontSize ?? 16);
    const svgWidth = Math.max(
      estimateLineWidth(enOverride.heading, headingSize, 0),
      estimateLineWidth(enOverride.body, bodySize, 0)
    );

    return (
      <View style={styles.outerContainer}>
        <Svg
          width={svgWidth + STROKE_PAD * 2 + SKEW_SHIFT}
          height={CONTAINER_HEIGHT + STROKE_PAD * 2}
          style={styles.svg}
        >
          <G transform={SKEW_TRANSFORM}>
            {renderLines(
              [
                { text: enOverride.heading, size: headingSize },
                { text: enOverride.body, size: bodySize },
              ],
              trainTypeColor,
              'middle',
              svgWidth / 2
            )}
          </G>
        </Svg>
      </View>
    );
  }

  const textLines = trainTypeName.split('\n');
  const svgWidth = Math.max(
    ...textLines.map((text) => estimateLineWidth(text, fontSize, letterSpacing))
  );

  return (
    <View style={styles.outerContainer}>
      <Svg
        width={svgWidth + STROKE_PAD * 2 + (isEn ? SKEW_SHIFT : 0)}
        height={CONTAINER_HEIGHT + STROKE_PAD * 2}
        style={styles.svg}
      >
        {isEn ? (
          <G transform={SKEW_TRANSFORM}>
            {renderLines(
              textLines.map((text) => ({ text, size: fontSize })),
              trainTypeColor
            )}
          </G>
        ) : (
          renderLines(
            textLines.map((text) => ({ text, size: fontSize })),
            trainTypeColor
          )
        )}
      </Svg>
    </View>
  );
};

export default React.memo(TrainTypeBoxE231);
