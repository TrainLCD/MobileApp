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
  id: string;
  reportType: 'feedback' | 'crash';
  description: string;
  stacktrace: string | undefined;
  resolved: boolean;
  resolvedReason: string;
  language: 'ja-JP' | 'en-US';
  appVersion: string;
  deviceInfo: FeedbackDeviceInfo | null;
  resolverUid: string;
  createdAt: number;
  updatedAt: number;
  reporterUid: string;
  imageUrl: string | null;
  appEdition: 'canary' | 'production';
  appClip: boolean;
  autoModeEnabled: boolean;
  enableLegacyAutoMode: boolean;
  sentryEventId?: string;
};

export type FeedbackMessage = {
  id: string;
  receivedAt: string;
  report: Report;
  version: number;
};
