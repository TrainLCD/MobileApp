import { ApolloError, useLazyQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import { TrainTypeData } from '../models/StationAPI'
import stationState from '../store/atoms/station'
import useConnectivity from './useConnectivity'

const useStationListByTrainType = (): [
  (typeId: number) => void,
  boolean,
  ApolloError | undefined
] => {
  const setStation = useSetRecoilState(stationState)

  const TRAIN_TYPE = gql`
    query TrainType($id: ID!) {
      trainType(id: $id) {
        id
        groupId
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
            lineSymbolShape
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
              lineSymbolShape
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
              lineSymbolShape
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
                lineSymbolShape
              }
            }
          }
        }
      }
    }
  `
  const [getTrainType, { loading, error }] =
    useLazyQuery<TrainTypeData>(TRAIN_TYPE)

  const isInternetAvailable = useConnectivity()

  const fetchStation = useCallback(
    async (typeId: number) => {
      if (!isInternetAvailable) {
        return
      }

      const { data } = await getTrainType({
        variables: { id: typeId },
      })

      if (data?.trainType) {
        setStation((prev) => ({
          ...prev,
          stations: data.trainType.stations,
        }))
      }
    },
    [getTrainType, isInternetAvailable, setStation]
  )

  return [fetchStation, loading, error]
}

export default useStationListByTrainType
