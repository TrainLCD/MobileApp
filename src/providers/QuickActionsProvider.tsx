import { memo, type ReactNode } from 'react';
import { useQuickActions } from '~/hooks/useQuickActions';

type Props = {
  children: ReactNode;
};

const QuickActionsProvider = ({ children }: Props) => {
  useQuickActions();
  return children;
};

export default memo(QuickActionsProvider);
