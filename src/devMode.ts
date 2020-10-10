import Constants from 'expo-constants';

const isDevMode = Constants.manifest
  ? !Constants.manifest.releaseChannel ||
    Constants.manifest.releaseChannel === 'default'
  : false;

export default isDevMode;
