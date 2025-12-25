import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import { useIncludesLongStationName } from './useIncludesLongStationName';

const TestComponent: React.FC<{ stations: Station[] }> = ({ stations }) => {
  const hasLongName = useIncludesLongStationName(stations);
  return <Text testID="hasLongName">{String(hasLongName)}</Text>;
};

describe('useIncludesLongStationName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('空の配列の場合、false を返す', () => {
    const { getByTestId } = render(<TestComponent stations={[]} />);

    expect(getByTestId('hasLongName').props.children).toBe('false');
  });

  it('駅名に「ー」が含まれる場合、true を返す', () => {
    const stations: Station[] = [
      { id: 1, name: '東京', groupId: 1 },
      { id: 2, name: 'ターミナル', groupId: 2 }, // 'ー' を含む
      { id: 3, name: '品川', groupId: 3 },
    ] as unknown as Station[];

    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('hasLongName').props.children).toBe('true');
  });

  it('駅名が7文字以上の場合、true を返す', () => {
    const stations: Station[] = [
      { id: 1, name: '東京', groupId: 1 },
      { id: 2, name: '国際展示場正門', groupId: 2 }, // 7文字
      { id: 3, name: '品川', groupId: 3 },
    ] as unknown as Station[];

    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('hasLongName').props.children).toBe('true');
  });

  it('すべての駅名が6文字以下かつ「ー」を含まない場合、false を返す', () => {
    const stations: Station[] = [
      { id: 1, name: '東京', groupId: 1 }, // 2文字
      { id: 2, name: '新宿', groupId: 2 }, // 2文字
      { id: 3, name: '渋谷', groupId: 3 }, // 2文字
      { id: 4, name: '池袋', groupId: 4 }, // 2文字
      { id: 5, name: '上野', groupId: 5 }, // 2文字
    ] as unknown as Station[];

    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('hasLongName').props.children).toBe('false');
  });

  it('6文字の駅名の場合、false を返す', () => {
    const stations: Station[] = [
      { id: 1, name: '東京', groupId: 1 },
      { id: 2, name: '123456', groupId: 2 }, // ちょうど6文字
      { id: 3, name: '品川', groupId: 3 },
    ] as unknown as Station[];

    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('hasLongName').props.children).toBe('false');
  });

  it('name が undefined の駅が含まれていても正常に動作する', () => {
    const stations: Station[] = [
      { id: 1, name: '東京', groupId: 1 },
      { id: 2, name: undefined, groupId: 2 }, // undefined
      { id: 3, name: '品川', groupId: 3 },
    ] as unknown as Station[];

    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('hasLongName').props.children).toBe('false');
  });

  it('name が undefined でも「ー」を含む駅があれば true を返す', () => {
    const stations: Station[] = [
      { id: 1, name: undefined, groupId: 1 },
      { id: 2, name: 'ステーション', groupId: 2 }, // 'ー' を含む
      { id: 3, name: '品川', groupId: 3 },
    ] as unknown as Station[];

    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('hasLongName').props.children).toBe('true');
  });

  it('複数の長い駅名がある場合も true を返す', () => {
    const stations: Station[] = [
      { id: 1, name: 'ターミナル駅', groupId: 1 }, // 'ー' を含む
      { id: 2, name: '国際展示場正門', groupId: 2 }, // 7文字
      { id: 3, name: '品川', groupId: 3 },
    ] as unknown as Station[];

    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('hasLongName').props.children).toBe('true');
  });

  it('「ー」と7文字以上の両方の条件を満たす駅名がある場合、true を返す', () => {
    const stations: Station[] = [
      { id: 1, name: '東京', groupId: 1 },
      { id: 2, name: 'ターミナル駅前', groupId: 2 }, // 'ー' を含み、7文字
      { id: 3, name: '品川', groupId: 3 },
    ] as unknown as Station[];

    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('hasLongName').props.children).toBe('true');
  });
});
