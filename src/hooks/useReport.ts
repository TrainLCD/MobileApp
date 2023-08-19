import type { FirebaseAuthTypes } from '@react-native-firebase/auth'

import * as Application from 'expo-application'
import * as Device from 'expo-device'
import * as Localization from 'expo-localization'
import { useCallback } from 'react'
import { Report, ReportType } from '../models/Report'
import { isJapanese } from '../translation'
import firestore from '../vendor/firebase/firestore'
import storage from '../vendor/firebase/storage'

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
} = Device

const useReport = (
  user: FirebaseAuthTypes.User | undefined
): {
  sendReport: ({
    reportType,
    description,
    screenShotBase64,
    stacktrace,
  }: {
    reportType: ReportType
    description: string
    screenShotBase64?: string
    stacktrace?: string
  }) => Promise<void>
} => {
  const sendReport = useCallback(
    async ({
      reportType,
      description,
      screenShotBase64,
      stacktrace,
    }: {
      reportType: ReportType
      description: string
      screenShotBase64?: string
      stacktrace?: string
    }) => {
      if (!description.trim().length || !user || __DEV__) {
        return
      }

      const reportsCollection = firestore().collection('reports')
      const { locale } = await Localization.getLocalizationAsync()

      const report: Report = {
        reportType,
        description: description.trim(),
        stacktrace,
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
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      }

      const reportRef = await reportsCollection.add(report)

      if (screenShotBase64) {
        const storageRef = storage().ref(`reports/${reportRef.id}.png`)
        await storageRef.putString(screenShotBase64, 'base64', {
          contentType: 'image/png',
        })
      }
    },
    [user]
  )

  return {
    sendReport,
  }
}

export default useReport
