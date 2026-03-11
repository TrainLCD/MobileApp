import type { Station } from '~/@types/graphql';

export const findNearestByCoord = (
  lat: number | null | undefined,
  lon: number | null | undefined,
  candidates: Station[]
): Station | undefined => {
  if (lat == null || lon == null) return undefined;
  let nearest: Station | undefined;
  let minDist = Number.POSITIVE_INFINITY;
  for (const s of candidates) {
    if (s.latitude != null && s.longitude != null) {
      const dist = (s.latitude - lat) ** 2 + (s.longitude - lon) ** 2;
      if (dist < minDist) {
        minDist = dist;
        nearest = s;
      }
    }
  }
  return nearest;
};
