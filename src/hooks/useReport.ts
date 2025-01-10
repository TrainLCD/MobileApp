import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import remoteConfig from "@react-native-firebase/remote-config";
import storage from "@react-native-firebase/storage";
import * as Application from "expo-application";
import * as Device from "expo-device";
import * as Localization from "expo-localization";
import { useCallback, useEffect, useState } from "react";
import { REMOTE_CONFIG_KEYS, REMOTE_CONFIG_PLACEHOLDERS } from "../constants";
import { Report, ReportType } from "../models/Report";
import { isJapanese } from "../translation";

const {
	brand,
	manufacturer,
	modelName,
	modelId,
	designName,
	productName,
	deviceYearClass,
	totalMemory,
	supportedCpuArchitectures,
	osName,
	osVersion,
	osBuildId,
	osInternalBuildId,
	osBuildFingerprint,
	platformApiLevel,
} = Device;

const useReport = (
	user: FirebaseAuthTypes.User | null,
): {
	sendReport: ({
		reportType,
		description,
		screenShotBase64,
		stacktrace,
	}: {
		reportType: ReportType;
		description: string;
		screenShotBase64?: string;
		stacktrace?: string;
	}) => Promise<void>;
	descriptionLowerLimit: number;
} => {
	const [descriptionLowerLimit, setDescriptionLowerLimit] = useState(
		REMOTE_CONFIG_PLACEHOLDERS.REPORT_LETTERS_LOWER_LIMIT,
	);

	useEffect(() => {
		setDescriptionLowerLimit(
			remoteConfig().getNumber(REMOTE_CONFIG_KEYS.REPORT_LETTERS_LOWER_LIMIT),
		);
	}, []);

	const sendReport = useCallback(
		async ({
			reportType,
			description,
			screenShotBase64,
			stacktrace,
		}: {
			reportType: ReportType;
			description: string;
			screenShotBase64?: string;
			stacktrace?: string;
		}) => {
			if (!description.trim().length || !user) {
				return;
			}

			const reportsCollection = firestore().collection("reports");
			const [locale] = Localization.getLocales();

			const report: Report = {
				reportType,
				description: description.trim(),
				stacktrace: stacktrace ?? "",
				resolved: false,
				reporterUid: user.uid,
				language: isJapanese ? "ja-JP" : "en-US",
				appVersion: `${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`,
				deviceInfo: Device.isDevice
					? {
							brand,
							manufacturer,
							modelName,
							modelId,
							designName,
							productName,
							deviceYearClass,
							totalMemory,
							supportedCpuArchitectures,
							osName,
							osVersion,
							osBuildId,
							osInternalBuildId,
							osBuildFingerprint,
							platformApiLevel,
							locale: locale.languageTag,
						}
					: null,
				createdAt: firestore.FieldValue.serverTimestamp(),
				updatedAt: firestore.FieldValue.serverTimestamp(),
			};

			const reportRef = await reportsCollection.add(report);

			if (screenShotBase64) {
				const storageRef = storage().ref(`reports/${reportRef.id}.png`);
				await storageRef.putString(screenShotBase64, "base64", {
					contentType: "image/png",
				});
			}
		},
		[user],
	);

	return {
		sendReport,
		descriptionLowerLimit,
	};
};

export default useReport;
