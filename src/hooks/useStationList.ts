import { useCallback, useState } from 'react';
import gql from 'graphql-tag';
import { GraphQLError } from 'graphql';
import { useSetRecoilState } from 'recoil';
import client from '../api/apollo';
import { StationsByLineIdData } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

const useStationList = (
  withTrainType?: boolean
): [(lineId: number) => Promise<void>, readonly GraphQLError[]] => {
  const setNavigation = useSetRecoilState(navigationState);
  const setStation = useSetRecoilState(stationState);
  const [errors, setErrors] = useState<readonly GraphQLError[]>([]);

  const fetchStationListWithTrainTypes = useCallback(
    async (lineId: number) => {
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
                trainTypes {
                  id
                  groupId
                  name
                  nameR
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
        setNavigation((prev) => ({
          ...prev,
          stationsWithTrainTypes: data.stationsByLineId,
        }));
      } catch (e) {
        setErrors([e]);
      }
    },
    [setNavigation]
  );

  const fetchStationListWithoutTrainTypes = useCallback(
    async (lineId: number) => {
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
    },
    [setStation]
  );
  return [
    withTrainType
      ? fetchStationListWithTrainTypes
      : fetchStationListWithoutTrainTypes,
    errors,
  ];
};

export default useStationList;
