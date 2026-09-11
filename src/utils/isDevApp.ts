import { getBundleId } from 'react-native-device-info';
import {
  DEV_APP_BUNDLE_IDENTIFIER,
  DEV_CLIP_BUNDLE_IDENTIFIER,
  LOCAL_APP_BUNDLE_IDENTIFIER,
} from '../constants';

export const isDevApp =
  (() => getBundleId() === DEV_APP_BUNDLE_IDENTIFIER)() ||
  (() => getBundleId() === DEV_CLIP_BUNDLE_IDENTIFIER)() ||
  // local フレーバーは debug ビルドが基本で __DEV__ で拾えるが、localRelease を焼いたときに
  // 本番の API やテレメトリーへ向かないよう bundleId でも Canary 扱いにする
  (() => getBundleId() === LOCAL_APP_BUNDLE_IDENTIFIER)() ||
  __DEV__;
