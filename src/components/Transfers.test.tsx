import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { APP_THEME } from '../models/Theme';
import Transfers from './Transfers';

const mockScrollViewMarker = jest.fn();

jest.mock('react-native-screens/experimental', () => ({
  ScrollViewMarker: (props: { children: React.ReactNode }) => {
    mockScrollViewMarker(props);
    return props.children;
  },
}));

jest.mock('../hooks', () => ({
  useGetLineMark: () => jest.fn(),
  useTransferLines: () => [],
  useTransferStationNumbers: () => [],
}));

jest.mock('./TransfersHeading', () => ({
  TransfersHeading: () => null,
}));

const originalOS = Platform.OS;

describe('Transfers', () => {
  afterEach(() => {
    Platform.OS = originalOS;
    jest.clearAllMocks();
  });

  it('iOSでは乗換一覧のスクロール端エフェクトを無効化する', () => {
    Platform.OS = 'ios';
    render(<Transfers theme={APP_THEME.E231} onPress={jest.fn()} />);
    expect(mockScrollViewMarker).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollEdgeEffects: {
          top: 'hidden',
          bottom: 'hidden',
          left: 'hidden',
          right: 'hidden',
        },
      })
    );
  });

  it('Androidでは従来のリストを描画する', () => {
    Platform.OS = 'android';
    render(<Transfers theme={APP_THEME.E231} onPress={jest.fn()} />);
    expect(mockScrollViewMarker).not.toHaveBeenCalled();
  });
});
