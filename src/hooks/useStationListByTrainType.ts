import gql from 'graphql-tag';
import { useCallback, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { ApolloError, useLazyQuery } from '@apollo/client';
import stationState from '../store/atoms/station';
import { TrainTypeData } from '../models/StationAPI';

const useStationListByTrainType = (): [
  (typeId: number) => Promise<void>,
  boolean,
  ApolloError
] => {
  const setStation = useSetRecoilState(stationState);
  const TRAIN_TYPE = gql`
    query TrainType($id: ID!) {
      trainType(id: $id) {
        color
        stations {
          id
          groupId
          name
          nameK
          nameR
          address
          distance
          latitude
          longitude
          pass
          lines {
            id
            companyId
            lineColorC
            name
            nameR
            lineType
          }
        }
      }
    }
  `;
  const [getTrainType, { loading, error, data }] = useLazyQuery<TrainTypeData>(
    TRAIN_TYPE,
    {
      // FIXME: 外したい
      fetchPolicy: 'network-only',
    }
  );

  const fetchStation = useCallback(
    async (typeId: number) => {
      getTrainType({
        variables: { id: typeId },
      });
    },
    [getTrainType]
  );

  useEffect(() => {
    if (data?.trainType) {
      // ２路線の接続駅は前の路線の最後の駅データを捨てる
      const cleanedStations = data.trainType.stations.filter(
        (s, i, arr): boolean => {
          const prv = arr[i - 1];
          if (prv && prv.groupId === s.groupId) {
            return !prv;
          }
          return true;
        }
      );
      setStation((prev) => ({
        ...prev,
        stations: cleanedStations,
      }));
    }
  }, [data, setStation]);
  return [fetchStation, loading, error];
};

export default useStationListByTrainType;
