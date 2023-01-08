import { ApolloError, useLazyQuery } from '@apollo/client';
import gql from 'graphql-tag';
import { useCallback, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { StationsByLineIdData } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import useConnectivity from './useConnectivity';

const useStationList = (): [
  (lineId: number) => void,
  boolean,
  ApolloError | undefined
] => {
  const setStation = useSetRecoilState(stationState);

  const STATIONS_BY_LINE_ID_TYPE = gql`
    query StationsByLineId($lineId: ID!) {
      stationsByLineId(lineId: $lineId) {
        id
        groupId
        name
        nameK
        nameR
        nameZh
        nameKo
        address
        latitude
        longitude
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
        trainTypes {
          id
          typeId
          groupId
          name
          nameR
          nameZh
          nameKo
          color
          lines {
            id
            name
            nameR
            nameK
            lineColorC
            companyId
            lineSymbols {
              lineSymbol
            }
            company {
              nameR
              nameEn
            }
          }
          allTrainTypes {
            id
            groupId
            typeId
            name
            nameK
            nameR
            nameZh
            nameKo
            color
            line {
              id
              name
              nameR
              lineColorC
              lineSymbols {
                lineSymbol
              }
            }
          }
        }
      }
    }
  `;

  const [getStations, { loading, error, data }] =
    useLazyQuery<StationsByLineIdData>(STATIONS_BY_LINE_ID_TYPE, {
      notifyOnNetworkStatusChange: true,
    });

  const isInternetAvailable = useConnectivity();

  const fetchStationListWithTrainTypes = useCallback(
    (lineId: number) => {
      if (!isInternetAvailable) {
        return;
      }

      getStations({
        variables: {
          lineId,
        },
      });
    },
    [getStations, isInternetAvailable]
  );

  useEffect(() => {
    if (data?.stationsByLineId?.length) {
      setStation((prev) => ({
        ...prev,
        stations: prev.stations.length ? prev.stations : data.stationsByLineId,
        // 再帰的にTrainTypesは取れないのでバックアップしておく
        stationsWithTrainTypes: prev.stationsWithTrainTypes.length
          ? prev.stationsWithTrainTypes
          : data.stationsByLineId,
      }));
    }
  }, [data, setStation]);

  return [fetchStationListWithTrainTypes, loading, error];
};

export default useStationList;
