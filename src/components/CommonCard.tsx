import { useAtomValue } from 'jotai';
import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { Path, Svg } from 'react-native-svg';
import type { Line, Station } from '~/@types/graphql';
import isTablet from '~/utils/isTablet';
import { getLocalizedLineName, isBusLine } from '~/utils/line';
import { MARK_SHAPE, NUMBERING_ICON_SIZE } from '../constants';
import { useBounds, useGetLineMark } from '../hooks';
import { isLEDThemeAtom } from '../store/atoms/theme';
import { isJapanese } from '../translation';
import { CardChevron } from './CardChevron';
import TransferLineMark from './TransferLineMark';
import Typography from './Typography';

type Props = {
  line: Line;
  targetStation?: Station;
  stations?: Station[];
  title?: string;
  /** カッコ内の文字を小さく表示する際、カッコ自体を非表示にする */
  hideParens?: boolean;
  subtitle?: string;
  subtitleNumberOfLines?: number;
  /** 右端のシェブロンを非表示にする */
  hideChevron?: boolean;
  /** 右端にチェックマークを表示する */
  checked?: boolean;
  disabled?: boolean;
  testID?: string;
  loading?: boolean;
  onPress?: () => void;
  /** アコーディオンとして展開されるコンテンツ */
  expandableContent?: React.ReactNode;
  /** アコーディオンの展開状態（外部制御用） */
  expanded?: boolean;
  /** アコーディオンの展開状態が変わった時のコールバック */
  onExpandedChange?: (expanded: boolean) => void;
};

const styles = StyleSheet.create({
  root: {
    minHeight: 72,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardShadow: {
    shadowColor: '#333',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  cardBorder: {
    borderColor: '#fff',
    borderWidth: 1,
  },
  mark: {
    width: isTablet ? 52.5 : 35,
    height: isTablet ? 52.5 : 35,
    marginRight: 12,
  },
  withoutMark: {
    width: isTablet ? 52.5 : 35,
    height: isTablet ? 52.5 : 35,
    marginRight: 12,
    transform: [{ scale: 0.5 }],
  },
  numberingIconContainer: {
    flex: 1,
    alignItems: 'center',
    transformOrigin: 'top',
    transform: [
      {
        scale: 0.5,
      },
    ],
  },
  markPlaceholder: {
    width: isTablet ? 52.5 : 35,
    height: isTablet ? 52.5 : 35,
    marginRight: 12,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#fff',
  },
  titleParens: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    opacity: 0.9,
    // Android のベースライン差異を吸収
    includeFontPadding: false,
  },
  subtitleContainer: {
    justifyContent: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  chevron: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    marginHorizontal: 6,
    alignSelf: 'center',
  },
  expandableWrapper: {
    overflow: 'hidden',
  },
  expandableMeasure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  fullHeightColorBar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    zIndex: 1,
  },
  expandableContent: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
});

type SubtitleProps = {
  inboundText: string;
  outboundText: string;
  numberOfLines?: number;
  loading?: boolean;
};

const Subtitle = memo(
  ({ inboundText, outboundText, numberOfLines, loading }: SubtitleProps) => {
    if (loading) {
      return (
        <View style={styles.subtitleContainer}>
          <SkeletonPlaceholder borderRadius={1} speed={1500}>
            <SkeletonPlaceholder.Item opacity={0.9} width={60} height={12} />
          </SkeletonPlaceholder>
        </View>
      );
    }

    return (
      <View style={styles.subtitleContainer}>
        {inboundText ? (
          <Typography style={styles.subtitle} numberOfLines={numberOfLines}>
            {inboundText}
          </Typography>
        ) : null}
        {inboundText && outboundText ? (
          <Svg width={16} height={16} viewBox="0 0 24 24" style={styles.arrow}>
            <Path
              d="M5 12h14M5 12l3-3M5 12l3 3M19 12l-3-3M19 12l-3 3"
              fill="none"
              stroke="#fff"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        ) : null}
        {outboundText ? (
          <Typography style={styles.subtitle}>{outboundText}</Typography>
        ) : null}
      </View>
    );
  }
);

const AnimatedCardChevron = Animated.createAnimatedComponent(View);

export const CommonCard: React.FC<Props> = ({
  line,
  targetStation,
  stations = [],
  title,
  hideParens,
  subtitle,
  subtitleNumberOfLines,
  hideChevron,
  checked,
  disabled,
  testID,
  loading,
  onPress,
  expandableContent,
  expanded,
  onExpandedChange,
}) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const getLineMark = useGetLineMark();
  const mark = useMemo(
    () => getLineMark({ line, stationNumbers: targetStation?.stationNumbers }),
    [getLineMark, line, targetStation?.stationNumbers]
  );
  const { bounds } = useBounds(stations);

  const isBus = isBusLine(line);

  const hasAccordion = expandableContent != null;
  const animValue = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [expanded, animValue]);

  const handlePress = useCallback(() => {
    if (hasAccordion) {
      onExpandedChange?.(!expanded);
      return;
    }
    onPress?.();
  }, [hasAccordion, expanded, onExpandedChange, onPress]);

  const animatedHeight = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  const chevronRotation = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const [inboundText, outboundText] = useMemo(() => {
    if (!stations?.length) {
      // フォールバックは何も表示しない
      return ['', ''];
    }
    const format = (arr: Station[]): string => {
      const ja = arr
        .slice(0, 2)
        .map((s) => s.name)
        .filter(Boolean)
        .join('・');
      const en = arr
        .slice(0, 2)
        .map((s) => s.nameRoman || s.name)
        .filter(Boolean)
        .join(' & ');
      if (isJapanese) return ja ? `${ja}方面` : '';
      return en ? `for ${en}` : '';
    };

    const [inbound, outbound] = bounds;
    return [format(inbound), format(outbound)];
  }, [bounds, stations]);

  const titleOrLineName = useMemo(() => {
    return title ?? getLocalizedLineName(line, isJapanese);
  }, [title, line]);

  const targetStationNumber = targetStation?.stationNumbers?.[0]?.stationNumber;
  const targetStationColor =
    targetStation?.stationNumbers?.[0]?.lineSymbolColor;
  const targetStationThreeLetterCode = targetStation?.threeLetterCode;

  const titleParts = useMemo(
    () => titleOrLineName.split(/(\([^)]*\))/),
    [titleOrLineName]
  );

  const additionalRootStyle = useMemo(
    () => ({
      backgroundColor: line.color ?? '#333',
      opacity: disabled ? 0.5 : 1,
    }),
    [disabled, line.color]
  );

  const cardRadius = isLEDTheme ? 0 : 8;
  const wrapperRadiusStyle = useMemo(
    () => ({
      borderRadius: cardRadius,
      backgroundColor: line.color ?? '#333',
      overflow: 'hidden' as const,
    }),
    [cardRadius, line.color]
  );
  const headerRadiusStyle = useMemo(() => {
    if (!hasAccordion) {
      return {
        borderRadius: cardRadius,
      };
    }

    if (!expanded) {
      return undefined;
    }

    return {
      borderTopLeftRadius: cardRadius,
      borderTopRightRadius: cardRadius,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    };
  }, [cardRadius, expanded, hasAccordion]);
  const colorBarRadiusStyle = useMemo(
    () => ({
      backgroundColor: line.color ?? '#333',
      borderTopLeftRadius: cardRadius,
      borderBottomLeftRadius: cardRadius,
    }),
    [cardRadius, line.color]
  );
  const rootShadowStyle = hasAccordion ? undefined : styles.cardShadow;
  const rootBorderStyle = hasAccordion ? undefined : styles.cardBorder;
  const accordionWrapperStyle = hasAccordion
    ? [styles.cardShadow, styles.cardBorder, wrapperRadiusStyle]
    : undefined;

  return (
    <View style={accordionWrapperStyle}>
      {hasAccordion && (
        <View
          style={[styles.fullHeightColorBar, colorBarRadiusStyle]}
          pointerEvents="none"
        />
      )}
      <TouchableOpacity
        onPress={disabled ? undefined : handlePress}
        activeOpacity={1}
        disabled={disabled}
        testID={testID}
        style={[
          styles.root,
          rootShadowStyle,
          rootBorderStyle,
          headerRadiusStyle,
          additionalRootStyle,
        ]}
      >
        {mark ? (
          <View
            style={[
              styles.mark,
              !mark.signPath || targetStationNumber
                ? {
                    transform: [{ scale: 0.5 }],
                  }
                : null,
            ]}
          >
            <TransferLineMark
              line={line}
              mark={mark}
              size={NUMBERING_ICON_SIZE.LARGE}
              withOutline
              withDarkTheme={isLEDTheme}
              stationNumber={targetStationNumber ?? undefined}
              color={targetStationColor ?? line.color ?? undefined}
              threeLetterCode={targetStationThreeLetterCode}
            />
          </View>
        ) : (
          <View style={styles.withoutMark}>
            <TransferLineMark
              line={line}
              mark={{
                sign: '',
                signShape: MARK_SHAPE.ROUND,
              }}
              size={NUMBERING_ICON_SIZE.LARGE}
              withOutline
              withDarkTheme={isLEDTheme}
              stationNumber={
                isBus ? (line.nameShort ?? '') : (targetStationNumber ?? '')
              }
              color={targetStationColor ?? line.color ?? undefined}
              threeLetterCode={targetStationThreeLetterCode}
            />
          </View>
        )}
        <View style={styles.texts}>
          <Typography style={styles.title} numberOfLines={1}>
            {titleParts.map((part, index) =>
              /^\(.*\)$/.test(part) ? (
                <Typography key={`${index}-${part}`} style={styles.titleParens}>
                  {index > 0 && !/\s$/.test(titleParts[index - 1] ?? '')
                    ? ' '
                    : ''}
                  {hideParens ? part.slice(1, -1) : part}
                </Typography>
              ) : (
                part
              )
            )}
          </Typography>
          {subtitle && (
            <Subtitle
              inboundText={subtitle}
              outboundText=""
              numberOfLines={subtitleNumberOfLines}
              loading={loading}
            />
          )}
          {!subtitle && (!!inboundText || !!outboundText) && (
            <Subtitle
              inboundText={inboundText}
              outboundText={outboundText}
              numberOfLines={subtitleNumberOfLines}
              loading={loading}
            />
          )}
        </View>
        <View style={styles.chevron}>
          {!hideChevron && hasAccordion && (
            <AnimatedCardChevron
              style={{ transform: [{ rotate: chevronRotation }] }}
            >
              <CardChevron />
            </AnimatedCardChevron>
          )}
          {!hideChevron && !hasAccordion && <CardChevron />}
          {hideChevron && !checked && (
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
                fill="#fff"
                opacity={0.5}
              />
            </Svg>
          )}
          {hideChevron && checked && (
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                fill="#fff"
              />
            </Svg>
          )}
        </View>
      </TouchableOpacity>
      {hasAccordion && (
        <Animated.View
          style={[
            styles.expandableWrapper,
            {
              height: animatedHeight,
              backgroundColor: isLEDTheme ? '#212121' : '#f5f5f5',
            },
          ]}
        >
          <View
            style={[styles.expandableContent, styles.expandableMeasure]}
            onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
          >
            {expandableContent}
          </View>
        </Animated.View>
      )}
    </View>
  );
};
