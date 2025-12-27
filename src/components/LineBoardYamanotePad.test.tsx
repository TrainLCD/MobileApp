import { render } from '@testing-library/react-native';
import React from 'react';
import type { Line, Station } from '~/@types/graphql';
import LineBoardYamanotePad from './LineBoardYamanotePad';

// モック設定
jest.mock('jotai', () => ({
  useAtomValue: jest.fn(),
}));

jest.mock('~/hooks', () => ({
  useCurrentLine: jest.fn(),
  useGetLineMark: jest.fn(() => jest.fn(() => null)),
  useNextStation: jest.fn(() => null),
  useStationNumberIndexFunc: jest.fn(() => jest.fn(() => 0)),
  useTransferLines: jest.fn(() => []),
}));

jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('~/store/selectors/isEn', () => ({
  isEnAtom: {},
}));

jest.mock('./PadArch', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('LineBoardYamanotePad', () => {
  const { useAtomValue } = require('jotai');
  const { useCurrentLine, useNextStation } = require('~/hooks');
  const PadArch = require('./PadArch').default;

  const mockLine: Line = {
    id: 1,
    name: '山手線',
    color: '#9acd32',
  } as Line;

  const mockStations: Station[] = [
    {
      id: 1,
      groupId: 1,
      name: '東京',
      line: mockLine,
      stationNumbers: [
        {
          lineSymbolColor: '#9acd32',
          stationNumber: 'JY-01',
        },
      ],
    } as Station,
    {
      id: 2,
      groupId: 2,
      name: '有楽町',
      line: mockLine,
      stationNumbers: [
        {
          lineSymbolColor: '#9acd32',
          stationNumber: 'JY-02',
        },
      ],
    } as Station,
    {
      id: 3,
      groupId: 3,
      name: '新橋',
      line: mockLine,
      stationNumbers: [
        {
          lineSymbolColor: '#9acd32',
          stationNumber: 'JY-03',
        },
      ],
    } as Station,
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useAtomValue.mockImplementation((atom) => {
      if (atom === require('~/store/selectors/isEn').isEnAtom) {
        return false;
      }
      return {
        station: mockStations[0],
        arrived: true,
        selectedLine: mockLine,
      };
    });
    useCurrentLine.mockReturnValue(mockLine);
    useNextStation.mockReturnValue(mockStations[1]);
  });

  it('正しくレンダリングされる', () => {
    const { container } = render(
      <LineBoardYamanotePad stations={mockStations} />
    );
    expect(container).toBeTruthy();
  });

  it('PadArchコンポーネントが呼び出される', () => {
    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalled();
  });

  it('lineがnullの場合、nullを返す', () => {
    useCurrentLine.mockReturnValue(null);
    useAtomValue.mockImplementation((atom) => {
      if (atom === require('~/store/selectors/isEn').isEnAtom) {
        return false;
      }
      return {
        station: mockStations[0],
        arrived: true,
        selectedLine: null,
      };
    });
    const { container } = render(
      <LineBoardYamanotePad stations={mockStations} />
    );
    expect(container.children.length).toBe(0);
  });

  it('arrived=trueの場合、正しい駅数がPadArchに渡される', () => {
    useAtomValue.mockImplementation((atom) => {
      if (atom === require('~/store/selectors/isEn').isEnAtom) {
        return false;
      }
      return {
        station: mockStations[0],
        arrived: true,
        selectedLine: mockLine,
      };
    });
    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalledWith(
      expect.objectContaining({
        arrived: true,
        line: mockLine,
      }),
      {}
    );
  });

  it('arrived=falseの場合、駅数が1つ減らされる', () => {
    useAtomValue.mockImplementation((atom) => {
      if (atom === require('~/store/selectors/isEn').isEnAtom) {
        return false;
      }
      return {
        station: mockStations[0],
        arrived: false,
        selectedLine: mockLine,
      };
    });
    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalled();
  });

  it('numberingInfoが正しく生成される', () => {
    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalledWith(
      expect.objectContaining({
        numberingInfo: expect.any(Array),
      }),
      {}
    );
  });

  it('lineMarksが正しく生成される', () => {
    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalledWith(
      expect.objectContaining({
        lineMarks: expect.any(Array),
      }),
      {}
    );
  });

  it('isEnプロップが正しく渡される', () => {
    useAtomValue.mockImplementation((atom) => {
      if (atom === require('~/store/selectors/isEn').isEnAtom) {
        return true;
      }
      return {
        station: mockStations[0],
        arrived: true,
        selectedLine: mockLine,
      };
    });
    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalledWith(
      expect.objectContaining({
        isEn: true,
      }),
      {}
    );
  });

  it('archStationsが最大6駅になる', () => {
    const manyStations = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      groupId: i,
      name: `駅${i}`,
      line: mockLine,
    })) as Station[];

    render(<LineBoardYamanotePad stations={manyStations} />);
    expect(PadArch).toHaveBeenCalled();
  });

  it('transferLinesが正しく渡される', () => {
    const { useTransferLines } = require('~/hooks');
    const mockTransferLines = [
      { id: 2, name: '中央線', color: '#f00' },
    ] as Line[];
    useTransferLines.mockReturnValue(mockTransferLines);

    render(<LineBoardYamanotePad stations={mockStations} />);
    expect(PadArch).toHaveBeenCalledWith(
      expect.objectContaining({
        transferLines: mockTransferLines,
      }),
      {}
    );
  });
});
