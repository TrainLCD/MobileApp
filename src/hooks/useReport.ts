import * as firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useCallback } from 'react';
import useAnonymousUser from './useAnonymousUser';

type Args = {
  description: string;
  screenShotBase64: string;
};

type Result = {
  sendReport: () => Promise<void>;
};

type Report = {
  description: string;
  resolved: boolean;
  createdAt: firestore.FirebaseFirestoreTypes.FieldValue;
  updatedAt: firestore.FirebaseFirestoreTypes.FieldValue;
};

const useReport = ({ description, screenShotBase64 }: Args): Result => {
  useAnonymousUser();

  const sendReport = useCallback(async () => {
    if (!description.trim().length) {
      return;
    }
    const reportsCollection = firestore.default().collection('reports');

    const report: Report = {
      description,
      resolved: false,
      createdAt: firestore.default.FieldValue.serverTimestamp(),
      updatedAt: firestore.default.FieldValue.serverTimestamp(),
    };

    const reportRef = await reportsCollection.add(report);

    const storageRef = storage().ref(`reports/${reportRef.id}.png`);
    await storageRef.putString(screenShotBase64, 'base64', {
      contentType: 'image/png',
    });
  }, [description, screenShotBase64]);

  return {
    sendReport,
  };
};

export default useReport;
