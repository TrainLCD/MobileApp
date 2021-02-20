import gql from 'graphql-tag';
import { useCallback, useState } from 'react';
import { GraphQLError } from 'graphql';
import { useSetRecoilState } from 'recoil';
import client from '../api/apollo';
import { TrainTypeData } from '../models/StationAPI';
import stationState from '../store/atoms/station';

const useStationListByTrainType = (): [
  (typeId: number) => Promise<void>,
  boolean,
  readonly GraphQLError[]
] => {
  const setStation = useSetRecoilState(stationState);
  const [errors, setErrors] = useState<readonly GraphQLError[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStation = useCallback(
    async (typeId: number) => {
      setLoading(true);
      try {
        const result = await client.query({
          query: gql`
          {
            trainType(id: ${typeId}) {
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
        `,
        });
        if (result.errors) {
          setErrors(result.errors);
          return;
        }
        const data = result.data as TrainTypeData;
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
        setErrors([]);
        setStation((prev) => ({
          ...prev,
          stations: cleanedStations,
        }));
      } catch (e) {
        setErrors([e]);
      } finally {
        setLoading(false);
      }
    },
    [setStation]
  );
  return [fetchStation, loading, errors];
};

export default useStationListByTrainType;
