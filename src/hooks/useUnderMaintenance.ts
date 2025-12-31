import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
} from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';

type MaintenanceDoc = {
  underMaintenance: boolean;
};

export const useUnderMaintenance = () => {
  const [underMaintenance, setUnderMaintenance] = useState<boolean>();
  useEffect(() => {
    const fetchMaintenance = async () => {
      const db = getFirestore();
      const { docs } = await getDocs(
        query(collection(db, 'appConfig'), doc(db, 'maintenance'))
      );
      const data = docs[0]?.data() as MaintenanceDoc | undefined;
      if (data) {
        setUnderMaintenance(data.underMaintenance);
      }
    };
    fetchMaintenance();
  }, []);

  return underMaintenance;
};
