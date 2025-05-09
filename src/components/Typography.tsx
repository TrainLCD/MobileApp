import React, { type LegacyRef, forwardRef, useMemo } from "react";
import {
	type StyleProp,
	StyleSheet,
	Text,
	type TextProps,
	type TextStyle,
} from "react-native";
import { FONTS } from "../constants";
import { useThemeStore } from "../hooks/useThemeStore";
import { APP_THEME } from "../models/Theme";

const Typography = forwardRef((props: TextProps, ref: LegacyRef<Text>) => {
	const isLedTheme = useThemeStore((state) => state === APP_THEME.LED);

	const fontFamily = useMemo(() => {
		if (isLedTheme) {
			return FONTS.JFDotJiskan24h;
		}
		return StyleSheet.flatten(props.style)?.fontWeight === "bold"
			? FONTS.RobotoBold
			: FONTS.RobotoRegular;
	}, [isLedTheme, props.style]);

	const style = useMemo<StyleProp<TextStyle>>(
		() => [
			{
				fontFamily,
				color: isLedTheme ? "#fff" : "#333",
				textAlignVertical: "center",
			},
			props.style,
			// NOTE: LEDテーマ用フォントはファイルサイズが大きいのでボールドの方を廃止した
			isLedTheme && { fontWeight: "normal" },
		],
		[fontFamily, isLedTheme, props.style],
	);
	return <Text {...props} ref={ref} allowFontScaling={false} style={style} />;
});

Typography.displayName = "Typography";

export default React.memo(Typography);
