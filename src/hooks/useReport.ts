import { useCallback, useEffect } from 'react';
import ViewShot from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import * as firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import useAnonymousAuth from './useAnonymousAuth';

type Args = {
  description: string;
  viewRef: React.MutableRefObject<ViewShot>;
};

type Result = {
  sendReport: () => Promise<void>;
};

type Report = {
  description: string;
  createdAt: firestore.FirebaseFirestoreTypes.FieldValue;
};

const useReport = ({ description, viewRef }: Args): Result => {
  const { signInAnonymously, user } = useAnonymousAuth();

  useEffect(() => {
    if (!user) {
      signInAnonymously();
    }
  }, [signInAnonymously, user]);

  const sendReport = useCallback(async () => {
    const reportsCollection = firestore.default().collection('reports');

    const uri = await viewRef.current.capture();
    const res = await RNFS.readFile(uri, 'base64');

    const report: Report = {
      description,
      createdAt: firestore.default.FieldValue.serverTimestamp(),
    };
    const reportRef = await reportsCollection.add(report);

    const storageRef = storage().ref(reportRef.id);
    await storageRef.putString(res, 'base64');
  }, [description, viewRef]);

  return {
    sendReport,
  };
};

export default useReport;
