import type { Station } from '~/@types/graphql';

const getCurrentStationIndex = (
  stations: Station[],
  nearestStation: Station | undefined
): number => {
  const index = stations.findIndex((s) => s.id === nearestStation?.id);
  if (index !== -1) {
    return index;
  }
  return stations.findIndex((s) => s.groupId === nearestStation?.groupId);
};

export default getCurrentStationIndex;
