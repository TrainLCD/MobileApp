import { render } from '@testing-library/react-native';
import TransferLineMark from './TransferLineMark';

const mockImage = jest.fn((_props?: unknown) => null);

jest.mock('expo-image', () => ({
  Image: (props: unknown) => mockImage(props),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

describe('TransferLineMark', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('同一路線IDでも画像ソースが変わればrecyclingKeyを更新する', () => {
    const line = {
      id: 11321,
      company: { id: 2 },
      color: '#00ac9a',
      nameShort: '埼京線',
    };

    const { rerender } = render(
      <TransferLineMark
        line={line as never}
        mark={{ signPath: 101 }}
        size={undefined}
      />
    );

    expect(mockImage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        recyclingKey: '11321:101:::::color',
        source: 101,
      })
    );

    rerender(
      <TransferLineMark
        line={line as never}
        mark={{ signPath: 202 }}
        size={undefined}
      />
    );

    expect(mockImage).toHaveBeenLastCalledWith(
      expect.objectContaining({
        recyclingKey: '11321:202:::::color',
        source: 202,
      })
    );
  });
});
