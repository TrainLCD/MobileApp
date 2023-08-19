import { NativeEventEmitter, NativeModules } from 'react-native';

const { PictureInPictureModule } = NativeModules;

export const pipEventEmitter = new NativeEventEmitter(PictureInPictureModule);

export default PictureInPictureModule
