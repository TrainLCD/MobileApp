import { Dimensions, Platform, StatusBar } from "react-native";

export function RFValue(fontSize: number, standardScreenHeight = 680) {
	const { height, width } = Dimensions.get("screen");
	const standardLength = width > height ? width : height;
	const offset =
		width > height
			? 0
			: Platform.OS === "ios"
				? 78
				: (StatusBar.currentHeight ?? 0);

	const deviceHeight =
		Platform.OS === "android" ? standardLength - offset : standardLength;

	const heightPercent = (fontSize * deviceHeight) / standardScreenHeight;
	return Math.round(heightPercent);
}
