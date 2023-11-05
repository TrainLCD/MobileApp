import { useEffect, useState } from 'react'
import firestore from '../vendor/firebase/firestore'

type MaintenanceDoc = {
  underMaintenance: boolean
}

export const useUnderMaintenance = () => {
  const [underMaintenance, setUnderMaintenance] = useState<boolean>()
  useEffect(() => {
    const fetchUnderMaintenanceAsync = async () => {
      const snapshot = await firestore()
        .collection('appConfig')
        .doc('maintenance')
        .get()
      const data = snapshot.data()
      if (data) {
        setUnderMaintenance((data as MaintenanceDoc).underMaintenance)
      }
    }
    fetchUnderMaintenanceAsync()
  }, [])

  return underMaintenance
}
