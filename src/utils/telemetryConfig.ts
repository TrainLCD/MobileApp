import { ENABLE_EXPERIMENTAL_TELEMETRY } from "react-native-dotenv";
import { isDevApp } from "./isDevApp";

// NOTE: ユニットテストのモック用に切り出している
export const isTelemetryEnabled =
	isDevApp && ENABLE_EXPERIMENTAL_TELEMETRY === "true";
