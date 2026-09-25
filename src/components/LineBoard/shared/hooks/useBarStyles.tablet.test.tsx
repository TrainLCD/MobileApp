import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import { useBarStyles } from './useBarStyles';

// 駅の枠の幅は画面幅の 1/9 = 100
jest.mock('~/hooks/useScale', () => ({
  useScale: jest.fn(() => ({
    widthScale: (value: number) => value,
    heightScale: (value: number) => value,
    myWidth: 900,
    myHeight: 600,
  })),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: true,
}));

const TestComponent: React.FC<{ index?: number; stationsLength?: number }> = ({
  index,
  stationsLength,
}) => {
  const { left, width } = useBarStyles({ index, stationsLength });
  return (
    <>
      <Text testID="left">{left}</Text>
      <Text testID="width">{width}</Text>
    </>
  );
};

describe('useBarStyles（タブレット）', () => {
  it('駅の数を渡さなければ先頭の枠の線は幅200のまま', () => {
    const { getByTestId } = render(<TestComponent index={0} />);
    expect(getByTestId('width').props.children).toBe(200);
  });

  it('残り2駅なら先頭の枠の線を最後の駅の枠の線の右端で止める', () => {
    const { getByTestId } = render(
      <TestComponent index={0} stationsLength={2} />
    );
    // 最後の駅の枠の線の右端: 100 * 1 - 20 + 61.75 = 141.75、先頭の左端は -32
    expect(getByTestId('width').props.children).toBe(173.75);
  });

  it('最後の駅の枠の線が十分に遠ければ先頭の枠の線は幅200のまま', () => {
    const { getByTestId } = render(
      <TestComponent index={0} stationsLength={4} />
    );
    // 最後の駅の枠の線の右端: 100 * 3 - 20 + 62 = 342
    expect(getByTestId('width').props.children).toBe(200);
  });

  it('1駅だけなら先頭の枠の線は幅200のまま', () => {
    const { getByTestId } = render(
      <TestComponent index={0} stationsLength={1} />
    );
    expect(getByTestId('width').props.children).toBe(200);
  });

  it('2番目の枠の線は駅の数に関係なく幅61.75', () => {
    const { getByTestId } = render(
      <TestComponent index={1} stationsLength={2} />
    );
    expect(getByTestId('width').props.children).toBe(61.75);
  });
});
