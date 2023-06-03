import { ApolloError, useLazyQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { useCallback } from 'react'
import { useSetRecoilState } from 'recoil'
import { StationsByLineIdData } from '../models/StationAPI'
import stationState from '../store/atoms/station'
import useConnectivity from './useConnectivity'

const useStationList = (): [
  (lineId: number) => void,
  boolean,
  ApolloError | undefined
] => {
  const setStation = useSetRecoilState(stationState)

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
              lineSymbolShape
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
                lineSymbolShape
              }
            }
          }
        }
      }
    }
  `

  const [getStations, { loading, error }] = useLazyQuery<StationsByLineIdData>(
    STATIONS_BY_LINE_ID_TYPE
  )

  const isInternetAvailable = useConnectivity()

  const fetchStationListWithTrainTypes = useCallback(
    async (lineId: number) => {
      if (!isInternetAvailable) {
        return
      }

      const { data } = await getStations({
        variables: {
          lineId,
        },
      })
      if (data?.stationsByLineId?.length) {
        setStation((prev) => ({
          ...prev,
          stations: data.stationsByLineId,
          // 再帰的にTrainTypesは取れないのでバックアップしておく
          stationsWithTrainTypes: data.stationsByLineId,
        }))
      }
    },
    [getStations, isInternetAvailable, setStation]
  )

  return [fetchStationListWithTrainTypes, loading, error]
}

export default useStationList
