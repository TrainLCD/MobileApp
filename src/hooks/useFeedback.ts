import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import { isClip } from 'react-native-app-clip';
import { autoModeEnabledAtom } from '~/store/atoms/navigation';
import { FEEDBACK_DESCRIPTION_LOWER_LIMIT } from '../constants';
import { getSessionToken } from '../lib/session';
import { workerUrl } from '../lib/workerApi';
import type { Report, ReportType } from '../models/Report';
import type { AppUser } from '../store/atoms/auth';
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
  user: AppUser | null
): {
  sendReport: ({
    reportType,
    description,
    screenShotBase64,
    stacktrace,
    sentryEventId,
  }: {
    reportType: ReportType;
    description: string;
    screenShotBase64?: string;
    stacktrace?: string;
    sentryEventId?: string;
  }) => Promise<void>;
  descriptionLowerLimit: number;
} => {
  const autoModeEnabled = useAtomValue(autoModeEnabledAtom);

  const sendReport = useCallback(
    async ({
      reportType,
      description,
      screenShotBase64,
      stacktrace,
      sentryEventId,
    }: {
      reportType: ReportType;
      description: string;
      screenShotBase64?: string;
      stacktrace?: string;
      sentryEventId?: string;
    }) => {
      if (
        description.trim().length < FEEDBACK_DESCRIPTION_LOWER_LIMIT ||
        !user
      ) {
        return;
      }

      try {
        const API_URL = workerUrl('/postFeedback');

        const [locale] = Localization.getLocales();

        const feedbackId = Crypto.randomUUID();

        const idToken = await getSessionToken();
        if (!idToken) {
          throw new Error('セッショントークンの取得に失敗しました');
        }

        let imageUrl: string | null = null;
        if (screenShotBase64) {
          const uploadRes = await fetch(workerUrl('/feedback/upload-image'), {
            method: 'POST',
            headers: {
              'content-type': 'application/json; charset=UTF-8',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              data: { feedbackId, imageBase64: screenShotBase64 },
            }),
          });
          if (uploadRes.ok) {
            const uploadJson = (await uploadRes.json()) as {
              result?: { imageUrl?: string };
            };
            imageUrl = uploadJson?.result?.imageUrl ?? null;
          } else {
            console.warn(
              `[useFeedback] image upload failed: ${uploadRes.status}`
            );
          }
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
          sentryEventId,
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
      } catch (err) {
        throw new Error(`フィードバックの送信に失敗しました: ${err}`);
      }
    },
    [user, autoModeEnabled]
  );

  return {
    sendReport,
    descriptionLowerLimit: FEEDBACK_DESCRIPTION_LOWER_LIMIT,
  };
};
