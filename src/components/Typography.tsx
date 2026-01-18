import { useAtomValue } from 'jotai';
import React, { forwardRef, type LegacyRef, useMemo } from 'react';
import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { FONTS } from '../constants';
import { isLEDThemeAtom } from '../store/atoms/theme';

const Typography = forwardRef((props: TextProps, ref: LegacyRef<Text>) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);

  const fontFamily = useMemo(() => {
    if (isLEDTheme) {
      return FONTS.JFDotJiskan24h;
    }
    const weight = StyleSheet.flatten(props.style)?.fontWeight;
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
