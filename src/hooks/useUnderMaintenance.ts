import firestore from '@react-native-firebase/firestore';
import { Effect, pipe } from 'effect';
import { useEffect, useState } from 'react';

type MaintenanceDoc = {
  underMaintenance: boolean;
};

export const useUnderMaintenance = () => {
  const [underMaintenance, setUnderMaintenance] = useState<boolean>();
  useEffect(() => {
    pipe(
      Effect.promise(() =>
        firestore().collection('appConfig').doc('maintenance').get()
      ),
      Effect.andThen((snapshot) => {
        const data = snapshot.data();
        if (data) {
          setUnderMaintenance((data as MaintenanceDoc).underMaintenance);
        }
      }),
      Effect.runPromise
    );
  }, []);

  return underMaintenance;
};
