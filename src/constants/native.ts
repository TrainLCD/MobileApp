import { Platform } from "react-native";

export const IS_LIVE_ACTIVITIES_ELIGIBLE_PLATFORM =
	Platform.OS === "ios" && parseFloat(Platform.Version) >= 16.1;
