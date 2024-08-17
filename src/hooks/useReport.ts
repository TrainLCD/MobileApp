import * as Device from 'expo-device'
import { useCallback } from 'react'
import { ReportType } from '../models/Report'

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
  user: null
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
  descriptionLowerLimit: number
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
      return
    },
    []
  )

  return {
    sendReport,
    descriptionLowerLimit: 0,
  }
}

export default useReport
