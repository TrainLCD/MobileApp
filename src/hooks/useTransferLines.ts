import type { Line } from '~/@types/graphql';
import { useTransferLinesFromStation } from './useTransferLinesFromStation';
import { useTransferTargetStation } from './useTransferTargetStation';

type Option = {
  omitRepeatingLine?: boolean;
  omitJR?: boolean;
};

export const useTransferLines = (options?: Option): Line[] => {
  const targetStation = useTransferTargetStation();

  const { omitRepeatingLine, omitJR } = options ?? {
    omitRepeatingLine: false,
    omitJR: false,
  };

  const transferLines = useTransferLinesFromStation(targetStation, {
    omitRepeatingLine,
    omitJR,
  });

  return transferLines;
};
