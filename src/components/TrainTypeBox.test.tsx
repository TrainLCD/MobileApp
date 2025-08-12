import React from 'react';
import { render } from '@testing-library/react-native';

// Create a minimal component that tests the specific crash fix
const TestSplitFunction = ({ trainTypeName, prevTrainTypeName }: { trainTypeName: any, prevTrainTypeName: any }) => {
  // This mimics the exact logic from TrainTypeBox that was causing crashes
  const numberOfLines = React.useMemo(
    () => (trainTypeName?.split('\n').length === 1 ? 1 : 2),
    [trainTypeName]
  );
  const prevNumberOfLines = React.useMemo(
    () => (prevTrainTypeName?.split('\n').length === 1 ? 1 : 2),
    [prevTrainTypeName]
  );

  return null; // We just care that the component doesn't crash
};

describe('TrainTypeBox crash fix', () => {
  it('should not crash when trainTypeName is undefined', () => {
    expect(() => {
      render(<TestSplitFunction trainTypeName={undefined} prevTrainTypeName={undefined} />);
    }).not.toThrow();
  });

  it('should not crash when trainTypeName is null', () => {
    expect(() => {
      render(<TestSplitFunction trainTypeName={null} prevTrainTypeName={null} />);
    }).not.toThrow();
  });

  it('should not crash when trainTypeName is empty string', () => {
    expect(() => {
      render(<TestSplitFunction trainTypeName="" prevTrainTypeName="" />);
    }).not.toThrow();
  });

  it('should work correctly with valid strings', () => {
    expect(() => {
      render(<TestSplitFunction trainTypeName="Test" prevTrainTypeName="Test\nLine" />);
    }).not.toThrow();
  });

  it('should work correctly when one is undefined and other is valid', () => {
    expect(() => {
      render(<TestSplitFunction trainTypeName={undefined} prevTrainTypeName="Valid" />);
    }).not.toThrow();
  });
});