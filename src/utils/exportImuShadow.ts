import { File, Paths } from 'expo-file-system';
import Share from 'react-native-share';
import {
  getLastImuShadowRecording,
  serializeImuShadowRecording,
  waitForFinalBatteryObservation,
} from '~/lib/imuShadowRecording';

/** Export only from an explicit button press. Never send a recording to telemetry. */
export const exportImuShadow = async (): Promise<void> => {
  const recording = getLastImuShadowRecording();
  if (!recording) {
    return;
  }
  await waitForFinalBatteryObservation(recording);
  const file = new File(Paths.cache, `imu-shadow-${Date.now()}.json`);
  file.writeSync(serializeImuShadowRecording(recording));
  await Share.open({
    url: file.uri,
    type: 'application/json',
    failOnCancel: false,
  });
};
