import React from 'react';
import { useErrorBoundary } from 'react-error-boundary';
import { translate } from '../translation';
import ErrorScreen from './ErrorScreen';

const ErrorFallback: React.FC = () => {
  const { resetBoundary } = useErrorBoundary();

  return (
    <ErrorScreen
      title={translate('errorTitle')}
      text={translate('appCrashedText')}
      onRetryPress={resetBoundary}
    />
  );
};

export default ErrorFallback;
