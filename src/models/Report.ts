import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'
import FeedbackDeviceInfo from './FeedbackDeviceInfo'

export type ReportType = 'feedback' | 'crash'

export type Report = {
  reportType: ReportType
  stacktrace?: string
  description: string
  resolved: boolean
  reporterUid: string
  language: 'en-US' | 'ja-JP'
  appVersion: string
  deviceInfo: FeedbackDeviceInfo | null
  createdAt:
    | FirebaseFirestoreTypes.FieldValue
    | FirebaseFirestoreTypes.Timestamp
  updatedAt:
    | FirebaseFirestoreTypes.FieldValue
    | FirebaseFirestoreTypes.Timestamp
}
