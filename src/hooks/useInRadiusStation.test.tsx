import { render, waitFor } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import { createStation } from '~/utils/test/factories';
import { useInRadiusStation } from './useInRadiusStation';

// Mock state that can be modified per test
let mockStationStateValue: {
  stations: Station[];
  station: Station | null;
} = {
  stations: [],
  station: null,
};

let mockLocationValue: {
  coords: {
    latitude: number | null;
    longitude: number | null;
  };
} | null = null;

jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));

const TestComponent: React.FC<{ radius: number }> = ({ radius }) => {
  const matchedStation = useInRadiusStation(radius);
  return (
    <Text testID="matchedStation">
      {matchedStation ? JSON.stringify({ id: matchedStation.id }) : 'null'}
    </Text>
  );
};

describe('useInRadiusStation', () => {
  const mockUseAtomValue = useAtomValue as jest.MockedFunction<
    typeof useAtomValue
  >;

  beforeEach(() => {
    // Reset mock state
    mockStationStateValue = { stations: [], station: null };
    mockLocationValue = null;

    // Setup mock to return different values based on atom type
    // First call is stationState, second call is locationAtom
    let callIndex = 0;
    mockUseAtomValue.mockImplementation(() => {
      const isStationStateCall = callIndex % 2 === 0;
      callIndex++;
      if (isStationStateCall) {
        return mockStationStateValue;
      }
      return mockLocationValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('位置情報がnullの場合、初期値（station）を返す', async () => {
    const initialStation = createStation(1, {
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    });
    mockStationStateValue = {
      stations: [initialStation],
      station: initialStation,
    };
    mockLocationValue = null;

    const { getByTestId } = render(<TestComponent radius={500} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      expect(result).toBe(JSON.stringify({ id: 1 }));
    });
  });

  it('位置情報のlatitudeがnullの場合、更新されない', async () => {
    const initialStation = createStation(1, {
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    });
    const nearbyStation = createStation(2, {
      groupId: 2,
      latitude: 35.6813,
      longitude: 139.7672,
    });
    mockStationStateValue = {
      stations: [initialStation, nearbyStation],
      station: initialStation,
    };
    mockLocationValue = {
      coords: {
        latitude: null,
        longitude: 139.76715,
      },
    };

    const { getByTestId } = render(<TestComponent radius={500} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      expect(result).toBe(JSON.stringify({ id: 1 }));
    });
  });

  it('位置情報のlongitudeがnullの場合、更新されない', async () => {
    const initialStation = createStation(1, {
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    });
    const nearbyStation = createStation(2, {
      groupId: 2,
      latitude: 35.6813,
      longitude: 139.7672,
    });
    mockStationStateValue = {
      stations: [initialStation, nearbyStation],
      station: initialStation,
    };
    mockLocationValue = {
      coords: {
        latitude: 35.68125,
        longitude: null,
      },
    };

    const { getByTestId } = render(<TestComponent radius={500} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      expect(result).toBe(JSON.stringify({ id: 1 }));
    });
  });

  it('半径内に駅がある場合、その駅を返す', async () => {
    const station1 = createStation(1, {
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    });
    const station2 = createStation(2, {
      groupId: 2,
      latitude: 35.6813,
      longitude: 139.7672,
    });
    mockStationStateValue = {
      stations: [station1, station2],
      station: station1,
    };
    mockLocationValue = {
      coords: {
        latitude: 35.68129,
        longitude: 139.76719,
      },
    };

    const { getByTestId } = render(<TestComponent radius={500} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      // station1も半径内にあるので、最初に見つかったstation1を返す
      expect(result).toBe(JSON.stringify({ id: 1 }));
    });
  });

  it('半径外に駅がある場合、初期値を維持する', async () => {
    const station1 = createStation(1, {
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    });
    // 約3km離れた位置
    const station2 = createStation(2, {
      groupId: 2,
      latitude: 35.7,
      longitude: 139.8,
    });
    mockStationStateValue = {
      stations: [station1, station2],
      station: station1,
    };
    mockLocationValue = {
      coords: {
        latitude: 35.68125,
        longitude: 139.76715,
      },
    };

    const { getByTestId } = render(<TestComponent radius={500} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      // station1は半径内なので、station1を返す
      expect(result).toBe(JSON.stringify({ id: 1 }));
    });
  });

  it('駅の座標がnullの場合、その駅はスキップされる', async () => {
    // 座標なし
    const station1 = createStation(1, {
      groupId: 1,
      latitude: null,
      longitude: null,
    });
    const station2 = createStation(2, {
      groupId: 2,
      latitude: 35.6813,
      longitude: 139.7672,
    });
    mockStationStateValue = {
      stations: [station1, station2],
      station: station1,
    };
    mockLocationValue = {
      coords: {
        latitude: 35.68129,
        longitude: 139.76719,
      },
    };

    const { getByTestId } = render(<TestComponent radius={500} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      // station1は座標がないのでスキップ、station2がマッチ
      expect(result).toBe(JSON.stringify({ id: 2 }));
    });
  });

  it('駅のlatitudeがnullの場合、その駅はスキップされる', async () => {
    // latitudeなし
    const station1 = createStation(1, {
      groupId: 1,
      latitude: null,
      longitude: 139.767125,
    });
    const station2 = createStation(2, {
      groupId: 2,
      latitude: 35.6813,
      longitude: 139.7672,
    });
    mockStationStateValue = {
      stations: [station1, station2],
      station: null,
    };
    mockLocationValue = {
      coords: {
        latitude: 35.68129,
        longitude: 139.76719,
      },
    };

    const { getByTestId } = render(<TestComponent radius={500} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      expect(result).toBe(JSON.stringify({ id: 2 }));
    });
  });

  it('駅のlongitudeがnullの場合、その駅はスキップされる', async () => {
    // longitudeなし
    const station1 = createStation(1, {
      groupId: 1,
      latitude: 35.681236,
      longitude: null,
    });
    const station2 = createStation(2, {
      groupId: 2,
      latitude: 35.6813,
      longitude: 139.7672,
    });
    mockStationStateValue = {
      stations: [station1, station2],
      station: null,
    };
    mockLocationValue = {
      coords: {
        latitude: 35.68129,
        longitude: 139.76719,
      },
    };

    const { getByTestId } = render(<TestComponent radius={500} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      expect(result).toBe(JSON.stringify({ id: 2 }));
    });
  });

  it('複数の駅が半径内にある場合、最初にマッチした駅を返す', async () => {
    const station1 = createStation(1, {
      groupId: 1,
      latitude: 35.68124,
      longitude: 139.76713,
    });
    const station2 = createStation(2, {
      groupId: 2,
      latitude: 35.68125,
      longitude: 139.76714,
    });
    const station3 = createStation(3, {
      groupId: 3,
      latitude: 35.68126,
      longitude: 139.76715,
    });
    mockStationStateValue = {
      stations: [station1, station2, station3],
      station: null,
    };
    mockLocationValue = {
      coords: {
        latitude: 35.681245,
        longitude: 139.767135,
      },
    };

    const { getByTestId } = render(<TestComponent radius={500} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      // 最初に見つかるstation1を返す
      expect(result).toBe(JSON.stringify({ id: 1 }));
    });
  });

  it('stationがnullでstationsが空の場合、undefinedを返す', async () => {
    mockStationStateValue = {
      stations: [],
      station: null,
    };
    mockLocationValue = {
      coords: {
        latitude: 35.681245,
        longitude: 139.767135,
      },
    };

    const { getByTestId } = render(<TestComponent radius={500} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      expect(result).toBe('null');
    });
  });

  it('radiusが小さい場合、遠くの駅はマッチしない', async () => {
    const station1 = createStation(1, {
      groupId: 1,
      latitude: 35.681236,
      longitude: 139.767125,
    });
    // 約111m離れた位置
    const station2 = createStation(2, {
      groupId: 2,
      latitude: 35.682236,
      longitude: 139.767125,
    });
    mockStationStateValue = {
      stations: [station1, station2],
      station: station1,
    };
    mockLocationValue = {
      coords: {
        latitude: 35.6822, // station2に近い位置（station2から約4m）
        longitude: 139.767125,
      },
    };

    // 半径50mではstation2は約4mなので届く
    const { getByTestId } = render(<TestComponent radius={50} />);

    await waitFor(() => {
      const result = getByTestId('matchedStation').props.children;
      // station2は約4mなので半径50m内にある
      expect(result).toBe(JSON.stringify({ id: 2 }));
    });
  });
});
