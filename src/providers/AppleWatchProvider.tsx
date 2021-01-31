import React from 'react';

type Props = {
  children: React.ReactNode;
};

const AppleWatchProvider: React.FC<Props> = ({ children }: Props) => {
  return <>{children}</>;
};

export default AppleWatchProvider;
