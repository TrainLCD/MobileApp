import { ApolloError, useLazyQuery } from '@apollo/client';
import gql from 'graphql-tag';
import { useCallback, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { TrainTypeData } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import useConnectivity from './useConnectivity';

const useStationListByTrainType = (): [
  (typeId: number) => void,
  boolean,
  ApolloError | undefined,
  () => Promise<any[]>
] => {
  const setStation = useSetRecoilState(stationState);

  const TRAIN_TYPE = gql`
    query TrainType($id: ID!) {
      trainType(id: $id) {
        id
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
            lineSymbol
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
            lineSymbols {
              lineSymbol
            }
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
            lineSymbols {
              lineSymbol
            }
            company {
              nameR
              nameEn
            }

            transferStation {
              id
              name
              nameK
              nameR
              nameZh
              nameKo
              stationNumbers {
                lineSymbolColor
                stationNumber
                lineSymbol
              }
            }
          }
        }
      }
    }
  `;
  const [getTrainType, { loading, error, data, client }] =
    useLazyQuery<TrainTypeData>(TRAIN_TYPE, {
      notifyOnNetworkStatusChange: true,
    });

  const isInternetAvailable = useConnectivity();

  const fetchStation = useCallback(
    (typeId: number) => {
      if (!isInternetAvailable) {
        return;
      }

      getTrainType({
        variables: { id: typeId },
      });
    },
    [getTrainType, isInternetAvailable]
  );

  useEffect(() => {
    if (data?.trainType) {
      setStation((prev) => ({
        ...prev,
        stations: data.trainType.stations,
      }));
    }
  }, [data, setStation]);

  const clearCache = useCallback(() => client.clearStore(), [client]);

  return [fetchStation, loading, error, clearCache];
};

export default useStationListByTrainType;
