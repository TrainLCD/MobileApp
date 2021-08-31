import gql from 'graphql-tag';
import { useCallback, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { ApolloError, useLazyQuery } from '@apollo/client';
import stationState from '../store/atoms/station';
import { TrainTypeData } from '../models/StationAPI';

const useStationListByTrainType = (): [
  (typeId: number) => void,
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
          nameZh
          nameKo
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
            nameK
            nameZh
            nameKo
            lineType
          }
        }
        lines {
          id
          name
          nameR
          nameK
          lineColorC
          companyId
          company {
            nameR
            nameEn
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
    (typeId: number) => {
      setStation((prev) => ({
        ...prev,
        stations: [],
      }));

      getTrainType({
        variables: { id: typeId },
      });
    },
    [getTrainType, setStation]
  );

  useEffect(() => {
    if (data?.trainType) {
      // ２路線の接続駅は前の路線の最後の駅データを捨てる
      const cleanedStations = data.trainType.stations.filter(
        (s, i, arr): boolean => {
          const prv = arr[i - 1];
          if (prv && prv.name === s.name) {
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
