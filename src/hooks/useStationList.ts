import { useCallback, Dispatch, useState } from 'react';
import { useDispatch } from 'react-redux';
import gql from 'graphql-tag';
import { GraphQLError } from 'graphql';
import { StationActionTypes } from '../store/types/station';
import client from '../api/apollo';
import { StationsByLineIdData } from '../models/StationAPI';
import { fetchStationListSuccess } from '../store/actions/station';

const useStationList = (
  lineId: number
): [() => Promise<void>, readonly GraphQLError[]] => {
  const dispatch = useDispatch<Dispatch<StationActionTypes>>();
  const [errors, setErrors] = useState<readonly GraphQLError[]>();

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
      dispatch(fetchStationListSuccess(data.stationsByLineId));
    } catch (e) {
      setErrors(e);
    }
  }, [dispatch, lineId]);
  return [fetchStationList, errors];
};

export default useStationList;
