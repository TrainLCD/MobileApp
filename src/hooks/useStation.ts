import gql from 'graphql-tag';
import { useDispatch } from 'react-redux';
import { useCallback, useState, Dispatch } from 'react';
import { GraphQLError } from 'graphql';
import { LocationObject } from 'expo-location';
import client from '../api/apollo';
import { StationByCoordsData } from '../models/StationAPI';
import { StationActionTypes } from '../store/types/station';
import { fetchStationSuccess } from '../store/actions/station';

type PickedLocation = Pick<LocationObject, 'coords'>;

const useStation = (): [
  (location: PickedLocation) => Promise<void>,
  readonly GraphQLError[]
] => {
  const dispatch = useDispatch<Dispatch<StationActionTypes>>();
  const [errors, setErrors] = useState<readonly GraphQLError[]>([]);

  const fetchStation = useCallback(
    async (location: PickedLocation) => {
      const { latitude, longitude } = location.coords;
      try {
        const result = await client.query({
          query: gql`
          {
            stationByCoords(latitude: ${latitude}, longitude: ${longitude}) {
              id
              groupId
              name
              nameK
              nameR
              address
              distance
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
        const data = result.data as StationByCoordsData;
        setErrors([]);
        dispatch(fetchStationSuccess(data.stationByCoords));
      } catch (e) {
        setErrors([e]);
      }
    },
    [dispatch]
  );
  return [fetchStation, errors];
};

export default useStation;
