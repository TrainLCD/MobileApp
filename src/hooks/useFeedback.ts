import * as firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import dayjs from 'dayjs';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Localization from 'expo-localization';
import { useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { MAXIMUM_DAILY_FEEDBACK_LIMIT } from '../constants/feedback';
import FeedbackDeviceInfo from '../models/FeedbackDeviceInfo';
import EligibilityDocData, {
  EligibilityType,
} from '../models/FeedbackEligibility';
import authState from '../store/atoms/auth';
import { isJapanese } from '../translation';

type Args = {
  description: string;
  screenShotBase64: string;
};

type Result = {
  getEligibility: () => Promise<EligibilityType>;
  sendReport: () => Promise<void>;
};

type Report = {
  description: string;
  resolved: boolean;
  reporterUid: string;
  language: 'en-US' | 'ja-JP';
  appVersion: string;
  deviceInfo: FeedbackDeviceInfo | null;
  createdAt:
    | firestore.FirebaseFirestoreTypes.FieldValue
    | firestore.FirebaseFirestoreTypes.Timestamp;
  updatedAt:
    | firestore.FirebaseFirestoreTypes.FieldValue
    | firestore.FirebaseFirestoreTypes.Timestamp;
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
  const { user } = useRecoilValue(authState);

  const getEligibility = async (): Promise<EligibilityType> => {
    if (!user) {
      return 'eligible';
    }
    const reportsCollection = firestore.default().collection('reports');
    const sameReporterReportSnapshot = await reportsCollection
      .where('reporterUid', '==', user.uid)
      .get();
    const limitExceeded =
      sameReporterReportSnapshot.docs
        .map((d) => d.data() as Report)
        .filter((r) =>
          dayjs().isSame(
            (
              r.createdAt as firestore.FirebaseFirestoreTypes.Timestamp
            ).toDate(),
            'day'
          )
        ).length >= MAXIMUM_DAILY_FEEDBACK_LIMIT;

    if (limitExceeded) {
      return 'limitExceeded';
    }

    const eligibilitiesDoc = await firestore
      .default()
      .collection('eligibilities')
      .doc(user.uid)
      .get();

    if (!eligibilitiesDoc.exists) {
      return 'eligible';
    }

    const eligibilityDocData = eligibilitiesDoc.data() as
      | EligibilityDocData
      | undefined;
    return eligibilityDocData?.eligibilityType ?? 'eligible';
  };

  const sendReport = useCallback(async () => {
    if (!description.trim().length || !user) {
      return;
    }
    const reportsCollection = firestore.default().collection('reports');
    const { locale } = await Localization.getLocalizationAsync();

    const report: Report = {
      description: description.trim(),
      resolved: false,
      reporterUid: user.uid,
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
  }, [user, description, screenShotBase64]);

  return {
    getEligibility,
    sendReport,
  };
};

export default useFeedback;
