import * as firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import { useCallback } from 'react';
import FeedbackDeviceInfo from '../models/FeedbackDeviceInfo';
import { isJapanese } from '../translation';
import useAnonymousUser from './useAnonymousUser';

type Args = {
  description: string;
  screenShotBase64: string;
};

type Result = {
  sendReport: () => Promise<void>;
};

type Report = {
  description: string;
  resolved: boolean;
  reporterUid: string;
  language: 'en-US' | 'ja-JP';
  appVersion: string;
  deviceInfo: FeedbackDeviceInfo | null;
  createdAt: firestore.FirebaseFirestoreTypes.FieldValue;
  updatedAt: firestore.FirebaseFirestoreTypes.FieldValue;
};

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

const useFeedback = ({ description, screenShotBase64 }: Args): Result => {
  const anonUser = useAnonymousUser();

  const sendReport = useCallback(async () => {
    if (!description.trim().length || !anonUser) {
      return;
    }
    const reportsCollection = firestore.default().collection('reports');
    const { locale } = await Localization.getLocalizationAsync();

    const report: Report = {
      description: description.trim(),
      resolved: false,
      reporterUid: anonUser.uid,
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
            locale,
          }
        : null,
      createdAt: firestore.default.FieldValue.serverTimestamp(),
      updatedAt: firestore.default.FieldValue.serverTimestamp(),
    };

    const reportRef = await reportsCollection.add(report);

    const storageRef = storage().ref(`reports/${reportRef.id}.png`);
    await storageRef.putString(screenShotBase64, 'base64', {
      contentType: 'image/png',
    });
  }, [anonUser, description, screenShotBase64]);

  return {
    sendReport,
  };
};

export default useFeedback;
