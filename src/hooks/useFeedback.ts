import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { isClip } from 'react-native-app-clip';
import {
  DEV_FEEDBACK_API_URL,
  PRODUCTION_FEEDBACK_API_URL,
} from 'react-native-dotenv';
import navigationState from '~/store/atoms/navigation';
import { FEEDBACK_DESCRIPTION_LOWER_LIMIT } from '../constants';
import type { Report, ReportType } from '../models/Report';
import { isJapanese } from '../translation';
import { isDevApp } from '../utils/isDevApp';

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
  user: FirebaseAuthTypes.User | null
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
  const { autoModeEnabled, enableLegacyAutoMode } =
    useAtomValue(navigationState);

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
      if (
        description.trim().length < FEEDBACK_DESCRIPTION_LOWER_LIMIT ||
        !user
      ) {
        return;
      }

      const API_URL = isDevApp
        ? DEV_FEEDBACK_API_URL
        : PRODUCTION_FEEDBACK_API_URL;

      const [locale] = Localization.getLocales();

      const feedbackId = Crypto.randomUUID();

      const idToken = await user?.getIdToken();

      let imageUrl: string | null = null;
      if (screenShotBase64) {
        const storageRef = storage().ref(
          `public/report-images/${feedbackId}.png`
        );
        await storageRef.putString(screenShotBase64, 'base64', {
          contentType: 'image/png',
        });
        imageUrl = await storageRef.getDownloadURL();
      }

      const report: Report = {
        id: feedbackId,
        reportType,
        description: description.trim(),
        stacktrace: stacktrace ?? '',
        resolved: false,
        reporterUid: user.uid,
        language: isJapanese ? 'ja-JP' : 'en-US',
        appVersion: `${Application.nativeApplicationVersion}(${Application.nativeBuildVersion})`,
        autoModeEnabled,
        enableLegacyAutoMode,
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
        imageUrl,
        appEdition: isDevApp ? 'canary' : 'production',
        appClip: isClip(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const res = await fetch(API_URL, {
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ data: { report } }),
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error(`フィードバックの送信に失敗しました: ${res.status}`);
      }
    },
    [user, autoModeEnabled, enableLegacyAutoMode]
  );

  return {
    sendReport,
    descriptionLowerLimit: FEEDBACK_DESCRIPTION_LOWER_LIMIT,
  };
};
