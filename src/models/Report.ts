import type FeedbackDeviceInfo from './FeedbackDeviceInfo';

export type ReportType = 'feedback' | 'crash';

export type Report = {
  id: string;
  reportType: ReportType;
  stacktrace?: string;
  description: string;
  resolved: boolean;
  reporterUid: string;
  language: 'en-US' | 'ja-JP';
  appVersion: string;
  deviceInfo: FeedbackDeviceInfo | null;
  imageUrl: string | null;
  appEdition: 'canary' | 'production';
  appClip: boolean;
  createdAt: number;
  updatedAt: number;
  autoModeEnabled: boolean;
  enableLegacyAutoMode: boolean;
  sentryEventId?: string;
};
