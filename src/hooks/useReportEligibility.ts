import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'
import firestore from '@react-native-firebase/firestore'
import remoteConfig from '@react-native-firebase/remote-config'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { REMOTE_CONFIG_KEYS, REMOTE_CONFIG_PLACEHOLDERS } from '../constants'
import EligibilityDocData, {
  EligibilityType,
} from '../models/FeedbackEligibility'
import { Report } from '../models/Report'
import useCachedInitAnonymousUser from './useCachedAnonymousUser'

const useReportEligibility = (): EligibilityType | undefined => {
  const [maximumDailyFeedbackCount, setMaximumDailyFeedbackCount] = useState(
    REMOTE_CONFIG_PLACEHOLDERS.MAXIMUM_DAILY_FEEDBACK_COUNT
  )
  const [eligibility, setEligibility] = useState<EligibilityType>()

  const user = useCachedInitAnonymousUser()

  useEffect(() => {
    setMaximumDailyFeedbackCount(
      remoteConfig().getNumber(REMOTE_CONFIG_KEYS.MAXIMUM_DAILY_FEEDBACK_COUNT)
    )
  }, [])

  const getEligibility = useCallback(async (): Promise<EligibilityType> => {
    if (!user) {
      return 'eligible'
    }
    const reportsCollection = firestore().collection('reports')
    const sameReporterReportSnapshot = await reportsCollection
      .where('reporterUid', '==', user.uid)
      .get()
    const limitExceeded =
      sameReporterReportSnapshot.docs
        .map((d) => d.data() as Report)
        .filter((r) =>
          dayjs().isSame(
            (r.createdAt as FirebaseFirestoreTypes.Timestamp).toDate(),
            'day'
          )
        ).length >= maximumDailyFeedbackCount

    if (limitExceeded) {
      return 'limitExceeded'
    }

    const eligibilitiesDoc = await firestore()
      .collection('eligibilities')
      .doc(user.uid)
      .get()

    if (!eligibilitiesDoc.exists) {
      return 'eligible'
    }

    const eligibilityDocData = eligibilitiesDoc.data() as
      | EligibilityDocData
      | undefined
    return eligibilityDocData?.eligibilityType ?? 'eligible'
  }, [maximumDailyFeedbackCount, user])

  useEffect(() => {
    const updateStateAsync = async () => {
      setEligibility(await getEligibility())
    }
    updateStateAsync()
  }, [getEligibility])

  return eligibility
}

export default useReportEligibility
