import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

type MaintenanceDoc = {
  underMaintenance: boolean;
};

export const useUnderMaintenance = () => {
  const [underMaintenance, setUnderMaintenance] = useState<boolean>();
  useEffect(() => {
    const fetchMaintenance = async () => {
      const db = getFirestore();
      const docSnap = await getDoc(doc(db, 'appConfig', 'maintenance'));
      const data = docSnap.data() as MaintenanceDoc | undefined;
      if (data) {
        setUnderMaintenance(data.underMaintenance);
      }
    };
    fetchMaintenance();
  }, []);

  return underMaintenance;
};
