import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo } from 'react';
import RNFS from 'react-native-fs';
import { useRecoilState, useRecoilValue } from 'recoil';
import locationState from '../store/atoms/location';
import recordRouteState from '../store/atoms/record';
import stationState from '../store/atoms/station';
import { buildGPXString } from '../utils/gpxBuilder';

const GPX_DIR_PATH = `${RNFS.DocumentDirectoryPath}/gpx`;

const useRecordRoute = (
  disableRecording = false
): {
  dumpGPXFile: () => Promise<void>;
  getDumpedGPXFileList: () => Promise<RNFS.ReadDirItem[]>;
} => {
  const [{ recordingEnabled, locationHistory }, setRecordRouteState] =
    useRecoilState(recordRouteState);
  const { location } = useRecoilValue(locationState);
  const { selectedBound } = useRecoilValue(stationState);

  const readyToRecord = useMemo(
    () => recordingEnabled && !disableRecording && !!selectedBound,
    [disableRecording, recordingEnabled, selectedBound]
  );

  useEffect(() => {
    if (readyToRecord && location?.coords) {
      const { latitude, longitude } = location.coords;

      setRecordRouteState((prev) => ({
        ...prev,
        locationHistory: [
          ...prev.locationHistory,
          {
            latitude,
            longitude,
            time: new Date(),
          },
        ],
      }));
    }
  }, [location?.coords, readyToRecord, setRecordRouteState]);

  const dumpGPXFile = useCallback(async () => {
    if (!recordingEnabled) {
      return;
    }
    const gpxFilenameWithoutExtension = dayjs().format('YYYYMMDDTHHmmss');
    const filePath = `${GPX_DIR_PATH}/${gpxFilenameWithoutExtension}.gpx`;

    const isDirExists = await RNFS.exists(GPX_DIR_PATH);
    if (!isDirExists) {
      await RNFS.mkdir(GPX_DIR_PATH);
    }

    const gpxStr = buildGPXString(locationHistory);
    await RNFS.writeFile(filePath, gpxStr, 'utf8');
  }, [locationHistory, recordingEnabled]);

  const getDumpedGPXFileList = useCallback(async () => {
    const isDirExists = await RNFS.exists(GPX_DIR_PATH);
    if (!isDirExists) {
      return [];
    }
    const gpxDir = await RNFS.readDir(`${RNFS.DocumentDirectoryPath}/gpx`);
    return gpxDir.filter((f) => f.isFile());
  }, []);

  return { dumpGPXFile, getDumpedGPXFileList };
};

export default useRecordRoute;
