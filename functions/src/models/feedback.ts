import type { firestore } from 'firebase-admin';

type FeedbackDeviceInfo = {
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  modelId: string;
  designName: string | null;
  productName: string | null;
  deviceYearClass: number | null;
  totalMemory: number | null;
  supportedCpuArchitectures: string[] | null;
  osName: string | null;
  osVersion: string | null;
  osBuildId: string | null;
  osInternalBuildId: string | null;
  osBuildFingerprint: string | null;
  platformApiLevel: number | null;
  locale: string;
};

export type Report = {
  description: string;
  resolved: boolean;
  resolvedReason: string;
  language: 'ja-JP' | 'en-US';
  appVersion: string;
  deviceInfo: FeedbackDeviceInfo;
  resolverUid: string;
  createdAt: firestore.Timestamp;
  updatedAt: firestore.Timestamp;
  reporterUid: string;
};
