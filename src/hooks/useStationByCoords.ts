import gql from 'graphql-tag';
import { useCallback, useState } from 'react';
import { GraphQLError } from 'graphql';
import { LocationObject } from 'expo-location';
import { useSetRecoilState } from 'recoil';
import client from '../api/apollo';
import { StationByCoordsData } from '../models/StationAPI';
import stationState from '../store/atoms/station';
import navigationState from '../store/atoms/navigation';

type PickedLocation = Pick<LocationObject, 'coords'>;

const useStationByCoords = (): [
  (location: PickedLocation) => Promise<void>,
  boolean,
  readonly GraphQLError[]
] => {
  const setStation = useSetRecoilState(stationState);
  const setNavigation = useSetRecoilState(navigationState);
  const [errors, setErrors] = useState<readonly GraphQLError[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStation = useCallback(
    async (location: PickedLocation) => {
      setLoading(true);
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
        setNavigation((prev) => ({
          ...prev,
          stationForHeader: data.stationByCoords,
        }));
      } catch (e) {
        setErrors([e]);
      } finally {
        setLoading(false);
      }
    },
    [setNavigation, setStation]
  );
  return [fetchStation, loading, errors];
};

export default useStationByCoords;
