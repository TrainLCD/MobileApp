import { useAtomValue } from 'jotai';
import navigationState from '~/store/atoms/navigation';
import tuningState from '~/store/atoms/tuning';
import { isTelemetryEnabledByBuild } from '~/utils/telemetryConfig';

export const useTelemetryEnabled = (): boolean => {
  const { telemetryEnabled: telemetryEnabledByUser } =
    useAtomValue(tuningState);
  const { autoModeEnabled } = useAtomValue(navigationState);

  return (
    isTelemetryEnabledByBuild && telemetryEnabledByUser && !autoModeEnabled
  );
};
