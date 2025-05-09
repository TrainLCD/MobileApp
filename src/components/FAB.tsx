import { Ionicons } from "@expo/vector-icons";
import type React from "react";
import { useMemo } from "react";
import {
	type GestureResponderEvent,
	StyleSheet,
	TouchableOpacity,
} from "react-native";
import type { GlyphNames } from "../@types/ionicons";
import { useThemeStore } from "../hooks/useThemeStore";
import { APP_THEME } from "../models/Theme";

interface Props {
	icon: GlyphNames;
	disabled?: boolean;
	secondary?: boolean;
	onPress: (event: GestureResponderEvent) => void;
}

const styles = StyleSheet.create({
	fab: {
		position: "absolute",
		right: 32,
		bottom: 32,
		width: 64,
		height: 64,
		justifyContent: "center",
		alignItems: "center",
		borderRadius: 50,
		shadowOpacity: 0.25,
		shadowOffset: {
			width: 1,
			height: 1,
		},
		shadowRadius: 2,
		elevation: 4,
	},
});

const FAB: React.FC<Props> = ({
	onPress,
	disabled,
	icon,
	secondary,
}: Props) => {
	const isLedTheme = useThemeStore((state) => state === APP_THEME.LED);
	const bgColor = useMemo(() => {
		if (isLedTheme) {
			return "#212121";
		}
		if (secondary) {
			return "#fff";
		}

		return "#008ffe";
	}, [isLedTheme, secondary]);
	const fgColor = useMemo(() => {
		if (isLedTheme) {
			return "#fff";
		}
		if (secondary) {
			return "#008ffe";
		}

		return "#fff";
	}, [isLedTheme, secondary]);
	const shadowColor = useMemo(() => {
		if (isLedTheme) {
			return "transparent";
		}

		return "#000";
	}, [isLedTheme]);
	const borderColor = useMemo(() => {
		if (secondary) {
			return fgColor;
		}

		return bgColor;
	}, [bgColor, fgColor, secondary]);

	return (
		<TouchableOpacity
			onPress={onPress}
			style={[
				styles.fab,
				{
					shadowColor,
					borderColor,
					backgroundColor: bgColor,
					borderWidth: isLedTheme ? 2 : 1,
					opacity: disabled ? 0.5 : 1,
				},
				secondary && { right: 32, bottom: 112 },
			]}
			disabled={disabled}
		>
			<Ionicons style={{ color: fgColor }} name={icon} size={32} />
		</TouchableOpacity>
	);
};

export default FAB;
