import { ApolloError, useLazyQuery } from '@apollo/client';
import gql from 'graphql-tag';
import { useCallback, useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { TrainTypeData } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import dropEitherJunctionStation from '../utils/dropJunctionStation';
import useConnectivity from './useConnectivity';

const useStationListByTrainType = (): [
  (typeId: number) => void,
  boolean,
  ApolloError | undefined
] => {
  const setStation = useSetRecoilState(stationState);
  const { selectedDirection } = useRecoilValue(stationState);

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
          stopCondition
          stationNumbers {
            lineSymbolColor
            stationNumber
          }
          threeLetterCode
          currentLine {
            id
            companyId
            lineColorC
            name
            nameR
            nameK
            nameZh
            nameKo
            lineType
            company {
              nameR
              nameEn
            }
          }
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
            company {
              nameR
              nameEn
            }
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
    { notifyOnNetworkStatusChange: true }
  );

  const isInternetAvailable = useConnectivity();

  const fetchStation = useCallback(
    (typeId: number) => {
      if (!isInternetAvailable) {
        return;
      }

      setStation((prev) => ({
        ...prev,
        stations: [],
      }));

      getTrainType({
        variables: { id: typeId },
      });
    },
    [getTrainType, isInternetAvailable, setStation]
  );

  useEffect(() => {
    if (data?.trainType) {
      setStation((prev) => ({
        ...prev,
        stations: dropEitherJunctionStation(
          data.trainType.stations,
          selectedDirection || 'INBOUND'
        ),
        rawStations: data.trainType.stations,
      }));
    }
  }, [data, selectedDirection, setStation]);
  return [fetchStation, loading, error];
};

export default useStationListByTrainType;
