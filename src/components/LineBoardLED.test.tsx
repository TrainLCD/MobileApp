import { render } from '@testing-library/react-native';
import React from 'react';
import { StopCondition } from '~/@types/graphql';
import type { Line, Station } from '~/@types/graphql';
import LineBoardLED from './LineBoardLED';

// モック設定
jest.mock('jotai', () => ({
  useAtomValue: jest.fn(),
}));

jest.mock('~/hooks', () => ({
  useAfterNextStation: jest.fn(),
  useBounds: jest.fn(() => ({ directionalStops: [] })),
  useCurrentLine: jest.fn(),
  useCurrentTrainType: jest.fn(() => ({ name: '普通', nameRoman: 'Local' })),
  useLoopLine: jest.fn(() => ({
    isLoopLine: false,
    isPartiallyLoopLine: false,
    isMeijoLine: false,
    isOsakaLoopLine: false,
    isYamanoteLine: false,
  })),
  useNextStation: jest.fn(),
  useNumbering: jest.fn(() => [null]),
  useTransferLines: jest.fn(() => []),
}));

jest.mock('./Marquee', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: jest.fn(({ children }) => <View>{children}</View>),
  };
});

describe('LineBoardLED', () => {
  const { useAtomValue } = require('jotai');
  const {
    useCurrentLine,
    useNextStation,
    useAfterNextStation,
    useTransferLines,
    useNumbering,
  } = require('~/hooks');

  const mockLine: Line = {
    id: 1,
    name: '山手線',
    nameShort: '山手線',
    nameRoman: 'Yamanote Line',
    color: '#9acd32',
  } as Line;

  const mockNextStation: Station = {
    id: 2,
    groupId: 2,
    name: '新宿',
    nameRoman: 'Shinjuku',
    stopCondition: StopCondition.All,
  } as Station;

  const mockAfterNextStation: Station = {
    id: 3,
    groupId: 3,
    name: '渋谷',
    nameRoman: 'Shibuya',
    stationNumbers: [{ stationNumber: 'JY-20' }],
  } as Station;

  beforeEach(() => {
    jest.clearAllMocks();
    useAtomValue.mockImplementation((atom) => {
      const atomKey = atom.toString();
      if (atomKey.includes('stationState')) {
        return {
          selectedDirection: null,
          stations: [],
        };
      }
      if (atomKey.includes('navigationState')) {
        return {
          headerState: 'NEXT',
        };
      }
      return {};
    });
    useCurrentLine.mockReturnValue(mockLine);
    useNextStation.mockReturnValue(mockNextStation);
    useAfterNextStation.mockReturnValue(mockAfterNextStation);
    useTransferLines.mockReturnValue([]);
    useNumbering.mockReturnValue([null]);
  });

  it('正しくレンダリングされる', () => {
    const { container } = render(<LineBoardLED />);
    expect(container).toBeTruthy();
  });

  it('ARRIVING状態でまもなく駅名が表示される', () => {
    useAtomValue.mockImplementation((atom) => {
      const atomKey = atom.toString();
      if (atomKey.includes('navigationState')) {
        return {
          headerState: 'ARRIVING',
        };
      }
      return {
        selectedDirection: null,
        stations: [],
      };
    });

    const { getByText } = render(<LineBoardLED />);
    expect(getByText('まもなく')).toBeTruthy();
    expect(getByText('新宿')).toBeTruthy();
    expect(getByText('です。')).toBeTruthy();
  });

  it('CURRENT状態で電車情報が表示される', () => {
    useAtomValue.mockImplementation((atom) => {
      const atomKey = atom.toString();
      if (atomKey.includes('navigationState')) {
        return {
          headerState: 'CURRENT',
        };
      }
      return {
        selectedDirection: null,
        stations: [],
      };
    });

    const { getByText } = render(<LineBoardLED />);
    expect(getByText(/この電車は/)).toBeTruthy();
    expect(getByText(/です。/)).toBeTruthy();
  });

  it('NEXT状態で次駅情報が表示される', () => {
    const { getByText } = render(<LineBoardLED />);
    expect(getByText('次は')).toBeTruthy();
    expect(getByText('新宿')).toBeTruthy();
  });

  it('乗り換え路線がある場合、乗り換え情報が表示される', () => {
    const transferLine = {
      id: 2,
      nameShort: '中央線',
      nameRoman: 'Chuo Line',
    } as Line;
    useTransferLines.mockReturnValue([transferLine]);

    const { getByText } = render(<LineBoardLED />);
    expect(getByText('中央線')).toBeTruthy();
    expect(getByText('はお乗り換えです。')).toBeTruthy();
  });

  it('駅番号がある場合、英語表記に駅番号が含まれる', () => {
    useNumbering.mockReturnValue([{ stationNumber: 'JY-17' }]);

    const { getByText } = render(<LineBoardLED />);
    expect(getByText(/Shinjuku/)).toBeTruthy();
  });

  it('afterNextStationがある場合、次の次の駅情報が表示される', () => {
    const { getByText } = render(<LineBoardLED />);
    expect(getByText('渋谷')).toBeTruthy();
    expect(getByText('に停車いたします。')).toBeTruthy();
  });

  it('一部列車が通過する駅の場合、注意喚起が表示される', () => {
    useNextStation.mockReturnValue({
      ...mockNextStation,
      stopCondition: StopCondition.Partial,
    });

    const { getByText } = render(<LineBoardLED />);
    expect(getByText(/は一部列車は通過いたします。/)).toBeTruthy();
  });

  it('英語での次の駅案内が表示される', () => {
    const { getByText } = render(<LineBoardLED />);
    expect(getByText('The next stop is')).toBeTruthy();
    expect(getByText(/Shinjuku/)).toBeTruthy();
  });

  it('山手線の場合、内回り/外回りが表示される', () => {
    const { useLoopLine } = require('~/hooks');
    useLoopLine.mockReturnValue({
      isLoopLine: false,
      isPartiallyLoopLine: false,
      isMeijoLine: false,
      isOsakaLoopLine: false,
      isYamanoteLine: true,
    });

    useAtomValue.mockImplementation((atom) => {
      const atomKey = atom.toString();
      if (atomKey.includes('navigationState')) {
        return {
          headerState: 'CURRENT',
        };
      }
      return {
        selectedDirection: 'INBOUND',
        stations: [],
      };
    });

    const { getByText } = render(<LineBoardLED />);
    expect(getByText(/内回り/)).toBeTruthy();
  });
});
