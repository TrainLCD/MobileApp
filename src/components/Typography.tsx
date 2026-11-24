import { useAtomValue } from 'jotai';
import React, { forwardRef, type LegacyRef, useMemo } from 'react';
import type { TextInstance } from 'react-native';
import {
  type StyleProp,
  Text,
  type TextProps,
  type TextStyle,
} from 'react-native';
import { FONTS } from '../constants';
import { useAppColors } from '../providers/AppColorsProvider';
import { isLEDThemeAtom } from '../store/atoms/theme';

const Typography = forwardRef(
  (props: TextProps, ref: LegacyRef<TextInstance>) => {
    const isLEDTheme = useAtomValue(isLEDThemeAtom);
    // 操作系画面の外(走行画面)ではライトの配色が返るため、既定の文字色は従来どおり
    const colors = useAppColors();

    const style = useMemo<StyleProp<TextStyle>>(
      () => [
        {
          color: isLEDTheme ? '#fff' : colors.text,
          textAlignVertical: 'center',
        },
        isLEDTheme && { fontFamily: FONTS.JFDotJiskan24h },
        props.style,
        // NOTE: LEDテーマ用フォントはファイルサイズが大きいのでボールドの方を廃止した
        isLEDTheme && { fontWeight: 'normal' },
      ],
      [colors.text, isLEDTheme, props.style]
    );
    return <Text {...props} ref={ref} allowFontScaling={false} style={style} />;
  }
);

Typography.displayName = 'Typography';

export default React.memo(Typography);
