import { useAtomValue } from 'jotai';
import tuningState from '~/store/atoms/tuning';
import { isTelemetryEnabledByBuild } from '~/utils/telemetryConfig';

export const useTelemetryEnabled = (): boolean => {
  const { telemetryEnabled: telemetryEnabledByUser } =
    useAtomValue(tuningState);

  return isTelemetryEnabledByBuild && telemetryEnabledByUser;
};
