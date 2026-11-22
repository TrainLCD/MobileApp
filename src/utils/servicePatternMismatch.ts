import type { LocationObject } from 'expo-location';
import getDistance from 'geolib/es/getDistance';
import getDistanceFromLine from 'geolib/es/getDistanceFromLine';
import { type Station, StopCondition } from '~/@types/graphql';
import { getIsPassFromStopCondition } from './isPass';

export type PatternStation = Pick<
  Station,
  'groupId' | 'latitude' | 'longitude' | 'name' | 'nameRoman' | 'stopCondition'
>;

export type ServicePatternMismatch = {
  kind: 'rail-pass' | 'rail-stop' | 'bus-stop';
  station: PatternStation;
};

type Coordinates = { latitude: number; longitude: number };
type LocatedStation = PatternStation & Coordinates & { groupId: number };
type Sample = Coordinates & {
  timestamp: number;
  accuracy: number;
  speed: number;
};

// Android can deliver ride fixes 10 seconds apart. Longer gaps could hide a stop.
const MAX_SAMPLE_GAP_MS = 12_000;
const MAX_ACCURACY_M = 30;
const MIN_PASS_SPEED_MPS = 9;
const RAIL_PASS_RADIUS_M = 70;
// 駅の代表座標と実際の停車位置にはずれがあるため、座標をまたいだ直後は確定しない。
const MIN_PASS_SIDE_DISTANCE_M = 40;
const MAX_STOP_SPEED_MPS = 1.5;
const MIN_STOP_DURATION_MS = 6_000;
const MAX_STOP_APPROACH_MS = 45_000;

const hasCoordinates = (station: PatternStation): station is LocatedStation =>
  station.groupId != null &&
  station.latitude != null &&
  station.longitude != null &&
  Number.isFinite(station.latitude) &&
  Number.isFinite(station.longitude);

const expectedPass = (station: PatternStation): boolean | null => {
  const condition = station.stopCondition;
  if (
    condition == null ||
    condition === StopCondition.Partial ||
    condition === StopCondition.PartialStop
  ) {
    return null;
  }
  return getIsPassFromStopCondition(condition);
};

const asSample = (location: LocationObject, now: number): Sample | null => {
  const { latitude, longitude, accuracy, speed } = location.coords;
  const { timestamp } = location;
  if (
    accuracy == null ||
    accuracy <= 0 ||
    accuracy > MAX_ACCURACY_M ||
    speed == null ||
    speed < 0 ||
    ![latitude, longitude, accuracy, speed, timestamp].every(Number.isFinite) ||
    now - timestamp > MAX_SAMPLE_GAP_MS ||
    timestamp > now
  ) {
    return null;
  }

  return { latitude, longitude, accuracy, speed, timestamp };
};

const findStop = (
  stations: LocatedStation[],
  sample: Sample,
  radius: number
) => {
  let nearest: LocatedStation | undefined;
  let nearestDistance = radius - sample.accuracy;
  for (const station of stations) {
    const distance = getDistance(sample, station);
    if (distance < nearestDistance) {
      nearest = station;
      nearestDistance = distance;
    }
  }

  // A fix must distinguish this stop from nearby platforms or adjacent stops.
  if (!nearest) return undefined;
  const groupId = nearest.groupId;
  const ambiguous = stations.some(
    (station) =>
      station.groupId !== groupId &&
      getDistance(sample, station) <= nearestDistance + 2 * sample.accuracy
  );
  return ambiguous ? undefined : nearest;
};

const findRailPass = (
  stations: PatternStation[],
  from: Sample,
  to: Sample
): LocatedStation | undefined => {
  const travel = getDistance(from, to);
  const speed = travel / ((to.timestamp - from.timestamp) / 1000);
  const uncertainty = Math.max(from.accuracy, to.accuracy);
  if (
    Math.min(from.speed, to.speed, speed) < MIN_PASS_SPEED_MPS ||
    speed > Math.max(from.speed, to.speed) + 5
  ) {
    return undefined;
  }

  for (let i = 1; i < stations.length - 1; i++) {
    const station = stations[i];
    if (!hasCoordinates(station) || expectedPass(station) !== false) {
      continue;
    }
    const fromDistance = getDistance(from, station);
    const toDistance = getDistance(to, station);
    if (Math.max(fromDistance, toDistance) > travel + RAIL_PASS_RADIUS_M) {
      continue;
    }

    // Project onto the movement segment. Even with GPS error, both samples
    // must straddle the station, and the segment must pass close to it.
    const progress =
      (fromDistance ** 2 + travel ** 2 - toDistance ** 2) / (2 * travel);
    if (
      Math.min(progress, travel - progress) <=
        MIN_PASS_SIDE_DISTANCE_M + uncertainty ||
      getDistanceFromLine(station, from, to) + uncertainty > RAIL_PASS_RADIUS_M
    ) {
      continue;
    }

    const before = stations[i - 1];
    const after = stations[i + 1];
    if (
      hasCoordinates(before) &&
      hasCoordinates(after) &&
      getDistance(to, before) - getDistance(from, before) > uncertainty &&
      getDistance(from, after) - getDistance(to, after) > uncertainty
    ) {
      return station;
    }
  }

  return undefined;
};

/**
 * Receives raw GPS fixes in order. An arrival displayed by the app is based
 * on the selected pattern, so using it here would make the check circular.
 */
export const createServicePatternDetector = (
  orderedStations: PatternStation[],
  otherBusStops: PatternStation[] | null
) => {
  const isBus = otherBusStops !== null;
  const selectedGroups = new Set(
    orderedStations.map((station) => station.groupId)
  );
  const stops = [
    ...orderedStations,
    ...(otherBusStops ?? []).filter(
      (station) => !selectedGroups.has(station.groupId)
    ),
  ].filter(hasCoordinates);
  const contradictoryStops = new Set<number>();
  let previous: Sample | null = null;
  let movingSamples: Sample[] = [];
  let lastMovingAt = Number.NEGATIVE_INFINITY;
  let dwell: { station: LocatedStation; firstSample: Sample } | null = null;

  return (
    location: LocationObject,
    now: number
  ): ServicePatternMismatch | undefined => {
    const sample = asSample(location, now);
    const last = previous;
    if (sample && last && sample.timestamp <= last.timestamp) {
      return undefined;
    }
    previous = sample;

    if (
      !sample ||
      !last ||
      sample.timestamp - last.timestamp > MAX_SAMPLE_GAP_MS
    ) {
      dwell = null;
      movingSamples = [];
      lastMovingAt = Number.NEGATIVE_INFINITY;
    }
    if (!sample) {
      return undefined;
    }

    if (sample.speed >= (isBus ? 4 : 5)) {
      lastMovingAt = sample.timestamp;
    }

    if (!isBus && sample.speed >= MIN_PASS_SPEED_MPS) {
      movingSamples = movingSamples.filter(
        (start) => sample.timestamp - start.timestamp <= MAX_SAMPLE_GAP_MS
      );
      const start = movingSamples[0];
      movingSamples.push(sample);
      // At 1 Hz, adjacent fixes often move less than twice the GPS error.
      const passed = start && findRailPass(orderedStations, start, sample);
      if (passed) {
        return { kind: 'rail-pass', station: passed };
      }
    } else {
      movingSamples = [];
    }

    const station =
      sample.speed <= MAX_STOP_SPEED_MPS
        ? findStop(stops, sample, isBus ? 45 : 85)
        : undefined;
    if (!station || sample.timestamp - lastMovingAt > MAX_STOP_APPROACH_MS) {
      dwell = null;
      return undefined;
    }

    if (
      !dwell ||
      dwell.station.groupId !== station.groupId ||
      getDistance(dwell.firstSample, sample) > (isBus ? 15 : 25)
    ) {
      dwell = { station, firstSample: sample };
      return undefined;
    }
    if (sample.timestamp - dwell.firstSample.timestamp < MIN_STOP_DURATION_MS) {
      return undefined;
    }

    const contradicts = isBus
      ? !selectedGroups.has(station.groupId)
      : expectedPass(station) === true;
    if (contradicts) {
      // One dwell can be a signal or traffic stop. Require two distinct stops.
      contradictoryStops.add(station.groupId);
      if (contradictoryStops.size >= 2) {
        return { kind: isBus ? 'bus-stop' : 'rail-stop', station };
      }
    }
    return undefined;
  };
};
