import { useAtomValue } from 'jotai';
import React, { forwardRef, type LegacyRef, useMemo } from 'react';
import {
  type StyleProp,
  Text,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { FONTS } from '../constants';
import { isLEDThemeAtom } from '../store/atoms/theme';

const isAnimatedStyleObject = (style: unknown): boolean => {
  if (!style || typeof style !== 'object') {
    return false;
  }
  return (
    Object.hasOwn(style, 'viewDescriptors') ||
    Object.hasOwn(style, 'initial') ||
    Object.hasOwn(style, 'jestAnimatedValues')
  );
};

const getFontWeight = (style: unknown): TextStyle['fontWeight'] => {
  if (!style) {
    return undefined;
  }
  if (Array.isArray(style)) {
    for (let i = style.length - 1; i >= 0; i--) {
      const weight = getFontWeight(style[i]);
      if (weight) {
        return weight;
      }
    }
    return undefined;
  }
  if (typeof style === 'number') {
    return undefined;
  }
  // Reanimated の animated style オブジェクトは参照のみ行い、通常styleとしては扱わない
  if (isAnimatedStyleObject(style)) {
    return undefined;
  }
  if (
    typeof style === 'object' &&
    style !== null &&
    Object.hasOwn(style, 'fontWeight')
  ) {
    return (style as TextStyle).fontWeight;
  }
  return undefined;
};

const Typography = forwardRef((props: TextProps, ref: LegacyRef<Text>) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const fontFamily = useMemo(() => {
    if (isLEDTheme) {
      return FONTS.JFDotJiskan24h;
    }
    const weight = getFontWeight(props.style);
    const isBold =
      weight === 'bold' ||
      weight === '700' ||
      weight === '800' ||
      weight === '900';
    return isBold ? FONTS.RobotoBold : FONTS.RobotoRegular;
  }, [isLEDTheme, props.style]);

  const style = useMemo<StyleProp<TextStyle>>(
    () => [
      {
        fontFamily,
        color: isLEDTheme ? '#fff' : '#333',
        textAlignVertical: 'center',
      },
      props.style,
      // NOTE: LEDテーマ用フォントはファイルサイズが大きいのでボールドの方を廃止した
      isLEDTheme && { fontWeight: 'normal' },
    ],
    [fontFamily, isLEDTheme, props.style]
  );
  return <Text {...props} ref={ref} allowFontScaling={false} style={style} />;
});

Typography.displayName = 'Typography';

export default React.memo(Typography);
