import gql from 'graphql-tag';
import { useCallback, useState } from 'react';
import { GraphQLError } from 'graphql';
import { LocationObject } from 'expo-location';
import { useSetRecoilState } from 'recoil';
import client from '../api/apollo';
import { StationByCoordsData } from '../models/StationAPI';
import stationState from '../store/atoms/station';

type PickedLocation = Pick<LocationObject, 'coords'>;

const useStation = (): [
  (location: PickedLocation) => Promise<void>,
  readonly GraphQLError[]
] => {
  const setStation = useSetRecoilState(stationState);
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
        setStation((prev) => ({
          ...prev,
          station: data.stationByCoords,
        }));
      } catch (e) {
        setErrors([e]);
      }
    },
    [setStation]
  );
  return [fetchStation, errors];
};

export default useStation;
