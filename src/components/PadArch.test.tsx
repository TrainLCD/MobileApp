import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import type { Line, LineNested, Station } from '~/@types/graphql';
import { HEADER_E235_TABLET_HEIGHT } from '~/constants';
import PadArch, { getPadArchLayout } from './PadArch';

jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('./NumberingIcon', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./TransferLineDot', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./TransferLineMark', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock('./ChevronYamanote', () => ({
  ChevronYamanote: jest.fn(() => null),
}));

jest.mock('./Typography', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn((props) => <Text {...props}>{props.children}</Text>),
  };
});

jest.mock('./LineBoard/shared/components', () => {
  const { Text } = require('react-native');
  return {
    EstimatedMinutesBadge: jest.fn(({ estimatedMinutes }) => (
      <Text>{estimatedMinutes}</Text>
    )),
  };
});

describe('PadArch', () => {
  const mockLine: Line = {
    __typename: 'Line',
    id: 1,
    nameShort: '山手線',
    color: '#9acd32',
  } as Line;

  const mockStations: Station[] = [
    { id: 1, groupId: 1, name: '東京', line: mockLine } as unknown as Station,
    { id: 2, groupId: 2, name: '有楽町', line: mockLine } as unknown as Station,
    { id: 3, groupId: 3, name: '新橋', line: mockLine } as unknown as Station,
  ];

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderPadArch = (
    stations: Station[],
    estimatedMinutesByStationId?: Map<number, number | null>,
    arrived = false
  ) =>
    render(
      <PadArch
        line={mockLine}
        stations={stations}
        arrived={arrived}
        transferLines={[]}
        station={null}
        numberingInfo={stations.map(() => null)}
        lineMarks={[]}
        trainTypeLines={[] as LineNested[]}
        isEn={false}
        estimatedMinutesByStationId={estimatedMinutesByStationId}
      />
    );

  it('stationIdに対応するestimatedMinutesがEstimatedMinutesBadgeへ渡される', () => {
    const { EstimatedMinutesBadge } = require('./LineBoard/shared/components');
    renderPadArch(mockStations, new Map([[2, 5]]));
    expect(EstimatedMinutesBadge.mock.calls[0][0]).toEqual(
      expect.objectContaining({ estimatedMinutes: 5 })
    );
  });

  it('estimatedMinutesByStationIdが未指定でもエラーなくレンダリングされる', () => {
    const result = renderPadArch(mockStations);
    expect(result.toJSON()).toBeTruthy();
  });

  it('通過駅にはestimatedMinutesを表示しない', () => {
    const getIsPass = require('~/utils/isPass').default;
    getIsPass.mockReturnValue(true);
    const { EstimatedMinutesBadge } = require('./LineBoard/shared/components');
    renderPadArch(mockStations, new Map([[2, 5]]));
    expect(EstimatedMinutesBadge).not.toHaveBeenCalled();
  });

  // Animated.loop は中身が Animated.sequence だと周回ごとに JS スレッドで
  // 再開するため、JS が詰まるとシェブロンが止まる(#7061)
  it.each([false, true])(
    'arrived=%sのループアニメーションはAnimated.sequenceを使わない',
    (arrived) => {
      const sequenceSpy = jest.spyOn(Animated, 'sequence');
      const loopSpy = jest.spyOn(Animated, 'loop');
      renderPadArch(mockStations, undefined, arrived);
      expect(loopSpy).toHaveBeenCalled();
      expect(sequenceSpy).not.toHaveBeenCalled();
      sequenceSpy.mockRestore();
      loopSpy.mockRestore();
    }
  );

  it('到着時の最後から2番目の駅にはestimatedMinutesを表示しない', () => {
    const { EstimatedMinutesBadge } = require('./LineBoard/shared/components');
    renderPadArch(mockStations, new Map([[2, 5]]), true);
    expect(EstimatedMinutesBadge).not.toHaveBeenCalled();
  });
});

describe('getPadArchLayout', () => {
  it('高さ810以上のウィンドウでは縮小せずそのままの寸法で割り付ける', () => {
    expect(getPadArchLayout(1366, 1024)).toEqual({
      width: 1366,
      height: 1024,
      scale: 1,
    });
    expect(getPadArchLayout(1080, 810)).toEqual({
      width: 1080,
      height: 810,
      scale: 1,
    });
  });

  it('高さ600のタブレットでは最下端のシェブロンがヘッダー下に収まるよう縮小する', () => {
    const { width, height, scale } = getPadArchLayout(960, 600);
    expect(height).toBe(810);
    expect(scale).toBeCloseTo(400 / 610);
    expect(width * scale).toBeCloseTo(960);
    // 非到着時のシェブロンの下端(ヘッダー下端から 4H/7 + 84 + 54)
    const chevronBottom = ((4 * height) / 7 + 84 + 54) * scale;
    expect(chevronBottom).toBeLessThanOrEqual(600 - HEADER_E235_TABLET_HEIGHT);
  });
});
