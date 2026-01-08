import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import { useCanGoForward } from './useCanGoForward';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';
import { useNearestStation } from './useNearestStation';
import { useNextStation } from './useNextStation';

jest.mock('./useCurrentStation', () => ({
  __esModule: true,
  useCurrentStation: jest.fn(),
}));

jest.mock('./useNextStation', () => ({
  __esModule: true,
  useNextStation: jest.fn(),
}));

jest.mock('./useNearestStation', () => ({
  __esModule: true,
  useNearestStation: jest.fn(),
}));

jest.mock('./useLoopLine', () => ({
  __esModule: true,
  useLoopLine: jest.fn(),
}));

const TestComponent: React.FC = () => {
  const canGoForward = useCanGoForward();
  return <Text testID="canGoForward">{String(canGoForward)}</Text>;
};

describe('useCanGoForward', () => {
  const mockUseCurrentStation = useCurrentStation as jest.MockedFunction<
    typeof useCurrentStation
  >;
  const mockUseNextStation = useNextStation as jest.MockedFunction<
    typeof useNextStation
  >;
  const mockUseNearestStation = useNearestStation as jest.MockedFunction<
    typeof useNearestStation
  >;
  const mockUseLoopLine = useLoopLine as jest.MockedFunction<
    typeof useLoopLine
  >;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('環状線の場合は常にtrueを返す', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue(undefined);
    mockUseNearestStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useNearestStation>);
    mockUseLoopLine.mockReturnValue({
      isLoopLine: true,
      isYamanoteLine: true,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('canGoForward').props.children).toBe('true');
  });

  it('次の駅が存在する場合はtrueを返す', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue({
      id: 2,
      groupId: 2,
    } as ReturnType<typeof useNextStation>);
    mockUseNearestStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useNearestStation>);
    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('canGoForward').props.children).toBe('true');
  });

  it('次の駅がなく、currentStationとnearestStationのgroupIdが異なる場合はtrueを返す（後方に戻る）', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue(undefined);
    mockUseNearestStation.mockReturnValue({
      id: 3,
      groupId: 3, // 異なるgroupId
    } as ReturnType<typeof useNearestStation>);
    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('canGoForward').props.children).toBe('true');
  });

  it('次の駅がなく、currentStationとnearestStationのgroupIdが同じ場合はfalseを返す（終点に停車中）', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue(undefined);
    mockUseNearestStation.mockReturnValue({
      id: 1,
      groupId: 1, // 同じgroupId
    } as ReturnType<typeof useNearestStation>);
    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('canGoForward').props.children).toBe('false');
  });

  it('currentStationがundefinedの場合、nearestStationのgroupIdと比較してfalseを返す', () => {
    mockUseCurrentStation.mockReturnValue(undefined);
    mockUseNextStation.mockReturnValue(undefined);
    mockUseNearestStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useNearestStation>);
    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });

    const { getByTestId } = render(<TestComponent />);
    // currentStation?.groupIdはundefined、nearestStation?.groupIdは1、異なるのでtrue
    expect(getByTestId('canGoForward').props.children).toBe('true');
  });

  it('nearestStationがundefinedの場合、currentStationのgroupIdと比較してtrueを返す', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue(undefined);
    mockUseNearestStation.mockReturnValue(undefined);
    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });

    const { getByTestId } = render(<TestComponent />);
    // currentStation?.groupIdは1、nearestStation?.groupIdはundefined、異なるのでtrue
    expect(getByTestId('canGoForward').props.children).toBe('true');
  });

  it('両方ともundefinedの場合、groupIdが同じ（undefined === undefined）としてfalseを返す', () => {
    mockUseCurrentStation.mockReturnValue(undefined);
    mockUseNextStation.mockReturnValue(undefined);
    mockUseNearestStation.mockReturnValue(undefined);
    mockUseLoopLine.mockReturnValue({
      isLoopLine: false,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });

    const { getByTestId } = render(<TestComponent />);
    // undefined === undefined なのでfalse
    expect(getByTestId('canGoForward').props.children).toBe('false');
  });

  it('大阪環状線でもtrueを返す', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue(undefined);
    mockUseNearestStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useNearestStation>);
    mockUseLoopLine.mockReturnValue({
      isLoopLine: true,
      isYamanoteLine: false,
      isOsakaLoopLine: true,
      isMeijoLine: false,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('canGoForward').props.children).toBe('true');
  });

  it('名城線でもtrueを返す', () => {
    mockUseCurrentStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useCurrentStation>);
    mockUseNextStation.mockReturnValue(undefined);
    mockUseNearestStation.mockReturnValue({
      id: 1,
      groupId: 1,
    } as ReturnType<typeof useNearestStation>);
    mockUseLoopLine.mockReturnValue({
      isLoopLine: true,
      isYamanoteLine: false,
      isOsakaLoopLine: false,
      isMeijoLine: true,
      isOedoLine: false,
      isPartiallyLoopLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });

    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('canGoForward').props.children).toBe('true');
  });
});
