import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
} from '@react-native-firebase/firestore';
import { Effect, pipe } from 'effect';
import { useEffect, useState } from 'react';

type MaintenanceDoc = {
  underMaintenance: boolean;
};

export const useUnderMaintenance = () => {
  const [underMaintenance, setUnderMaintenance] = useState<boolean>();
  useEffect(() => {
    const db = getFirestore();
    pipe(
      Effect.promise(() =>
        getDocs(query(collection(db, 'appConfig'), doc(db, 'maintenance')))
      ),
      Effect.andThen(({ docs }) => {
        const data = docs[0]?.data() as MaintenanceDoc | undefined;
        if (data) {
          setUnderMaintenance(data.underMaintenance);
        }
      }),
      Effect.runPromise
    );
  }, []);

  return underMaintenance;
};
