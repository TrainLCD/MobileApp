import firestore from '@react-native-firebase/firestore';
import remoteConfig from '@react-native-firebase/remote-config';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import { useCallback, useMemo } from 'react';
import { REMOTE_CONFIG_KEYS } from '../constants';
import type { Report, ReportType } from '../models/Report';
import { isJapanese } from '../translation';

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

export const useFeedback = (
  uid: string | undefined
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
  const descriptionLowerLimit = useMemo(
    () =>
      remoteConfig().getNumber(REMOTE_CONFIG_KEYS.REPORT_LETTERS_LOWER_LIMIT),
    []
  );

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
      if (description.trim().length < descriptionLowerLimit || !uid) {
        return;
      }
      const [locale] = Localization.getLocales();
      const report: Report = {
        reportType,
        description: description.trim(),
        stacktrace: stacktrace ?? '',
        resolved: false,
        reporterUid: uid,
        language: isJapanese ? 'ja-JP' : 'en-US',
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
    },
    [uid, descriptionLowerLimit]
  );

  return {
    sendReport,
    descriptionLowerLimit,
  };
};
