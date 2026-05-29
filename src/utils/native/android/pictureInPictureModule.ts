import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { PictureInPictureModule } = NativeModules;

const EVENT_NAME = 'TrainLCDPictureInPictureModeChanged';

type PictureInPictureModeChangedEvent = {
  isInPictureInPictureMode: boolean;
};

export const setPictureInPictureEnabled = (enabled: boolean) => {
  if (Platform.OS !== 'android') {
    return;
  }

  PictureInPictureModule?.setPictureInPictureEnabled?.(enabled);
};

export const addPictureInPictureModeChangeListener = (
  listener: (event: PictureInPictureModeChangedEvent) => void
) => {
  if (Platform.OS !== 'android' || !PictureInPictureModule) {
    return { remove: () => undefined };
  }

  return new NativeEventEmitter(PictureInPictureModule).addListener(
    EVENT_NAME,
    listener
  );
};
