import { useCallback, useState } from 'react';
import gql from 'graphql-tag';
import { GraphQLError } from 'graphql';
import { useSetRecoilState } from 'recoil';
import client from '../api/apollo';
import { StationsByLineIdData } from '../models/StationAPI';
import stationState from '../store/atoms/station';

const useStationList = (
  lineId: number
): [() => Promise<void>, readonly GraphQLError[]] => {
  const setStation = useSetRecoilState(stationState);
  const [errors, setErrors] = useState<readonly GraphQLError[]>([]);

  const fetchStationList = useCallback(async () => {
    try {
      const result = await client.query({
        query: gql`
          {
            stationsByLineId(lineId: ${lineId}) {
              id
              groupId
              name
              nameK
              nameR
              address
              latitude
              longitude
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
        `,
      });
      if (result.errors) {
        setErrors(result.errors);
        return;
      }
      const data = result.data as StationsByLineIdData;
      setErrors([]);
      setStation((prev) => ({
        ...prev,
        stations: data.stationsByLineId,
      }));
    } catch (e) {
      setErrors([e]);
    }
  }, [lineId, setStation]);
  return [fetchStationList, errors];
};

export default useStationList;
