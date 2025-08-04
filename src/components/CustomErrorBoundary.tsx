import { ErrorBoundary } from '@sentry/react-native';
import type React from 'react';
import { useCallback, useState } from 'react';
import { useAnonymousUser, useFeedback } from '~/hooks';
import { isDevApp } from '~/utils/isDevApp';
import { translate } from '../translation';
import FatalErrorScreen from './FatalErrorScreen';

const CustomErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const user = useAnonymousUser();
  const { sendReport } = useFeedback(user ?? null);

  const [stacktrace, setStacktrace] = useState<string | undefined>(undefined);

  const handleError = useCallback(
    async (
      error: unknown,
      componentStack: string | undefined,
      eventId: string
    ) => {
      if (!__DEV__) {
        await sendReport({
          sentryEventId: eventId,
          reportType: 'crash',
          description: error instanceof Error ? error.message : 'Unknown error',
          stacktrace: componentStack
            ?.split('\n')
            ?.filter((c) => c.length !== 0)
            ?.map((c) => c.trim())
            .join('\n'),
        });
      }

      if (isDevApp) {
        setStacktrace(componentStack);
      }
    },
    [sendReport]
  );
  return (
    <ErrorBoundary
      fallback={
        <FatalErrorScreen
          showStatus
          title={translate('errorTitle')}
          text={translate('appCrashedText')}
          stacktrace={stacktrace}
        />
      }
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default CustomErrorBoundary;
