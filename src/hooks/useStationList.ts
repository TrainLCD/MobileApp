import { useCallback, useState } from 'react';
import { useSetRecoilState } from 'recoil';
import { GetStationByLineIdRequest } from '../gen/stationapi_pb';
import stationState from '../store/atoms/station';
import grpcClient from '../utils/grpc';
import useConnectivity from './useConnectivity';

const useStationList = (): [
  (lineId: number) => void,
  boolean,
  Error | undefined
] => {
  const setStation = useSetRecoilState(stationState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error>();

  const isInternetAvailable = useConnectivity();

  const fetchStationListWithTrainTypes = useCallback(
    async (lineId: number) => {
      if (!isInternetAvailable) {
        return;
      }

      setLoading(true);
      try {
        const req = new GetStationByLineIdRequest();
        req.setLineId(lineId);
        const resp = (await grpcClient.getStationsByLineId(req, {})).toObject();

        if (resp?.stationsList?.length) {
          setStation((prev) => ({
            ...prev,
            stations: resp.stationsList,
            // 再帰的にTrainTypesは取れないのでバックアップしておく
            stationsWithTrainTypes: resp.stationsList,
          }));
        }
      } catch (err) {
        setError(err as Error);
      }
      setLoading(false);
    },
    [isInternetAvailable, setStation]
  );

  return [fetchStationListWithTrainTypes, loading, error];
};

export default useStationList;
