import { useCallback, useEffect, useState } from 'react'
import { EligibilityType } from '../models/FeedbackEligibility'

const useReportEligibility = (): EligibilityType | undefined => {
  const [eligibility, setEligibility] = useState<EligibilityType>()

  const getEligibility = useCallback(async (): Promise<EligibilityType> => {
    return 'banned'
  }, [])

  useEffect(() => {
    const updateStateAsync = async () => {
      setEligibility(await getEligibility())
    }
    updateStateAsync()
  }, [getEligibility])

  return eligibility
}

export default useReportEligibility
