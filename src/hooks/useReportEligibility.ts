import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import EligibilityDocData, {
  EligibilityType,
} from '../models/FeedbackEligibility'
import { Report } from '../models/Report'
import useRemoteConfig from '../utils/useRemoteConfig'
import firestore from '../vendor/firebase/firestore'
import useCachedInitAnonymousUser from './useCachedAnonymousUser'

const useReportEligibility = (): EligibilityType | undefined => {
  const user = useCachedInitAnonymousUser()
  const {
    config: { MAXIMUM_DAILY_FEEDBACK_COUNT = 5 },
  } = useRemoteConfig()

  const [eligibility, setEligibility] = useState<EligibilityType>()

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
        ).length >= MAXIMUM_DAILY_FEEDBACK_COUNT

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
  }, [MAXIMUM_DAILY_FEEDBACK_COUNT, user])

  useEffect(() => {
    const updateStateAsync = async () => {
      setEligibility(await getEligibility())
    }
    updateStateAsync()
  }, [getEligibility])

  return eligibility
}

export default useReportEligibility
