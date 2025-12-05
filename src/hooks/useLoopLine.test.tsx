import { render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';
import {
  MEIJO_LINE_ID,
  OSAKA_LOOP_LINE_ID,
  TOEI_OEDO_LINE_ID,
  YAMANOTE_LINE_ID,
} from '~/constants';
import { getIsLocal } from '~/utils/trainTypeString';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useLoopLine } from './useLoopLine';

// 依存フック/ユーティリティをモック
jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('./useCurrentStation', () => ({ useCurrentStation: jest.fn() }));
jest.mock('./useCurrentLine', () => ({ useCurrentLine: jest.fn() }));
jest.mock('./useCurrentTrainType', () => ({ useCurrentTrainType: jest.fn() }));
jest.mock('../utils/trainTypeString', () => ({ getIsLocal: jest.fn() }));

const TestComponent: React.FC<{
  stations?: Station[];
  checkCurrentLine?: boolean;
}> = ({ stations, checkCurrentLine = true }) => {
  const r = useLoopLine(stations, checkCurrentLine);
  return (
    <>
      <Text testID="isYamanoteLine">{String(r.isYamanoteLine)}</Text>
      <Text testID="isOsakaLoopLine">{String(r.isOsakaLoopLine)}</Text>
      <Text testID="isMeijoLine">{String(r.isMeijoLine)}</Text>
      <Text testID="isOedoLine">{String(r.isOedoLine)}</Text>
      <Text testID="isLoopLine">{String(r.isLoopLine)}</Text>
      <Text testID="isPartiallyLoopLine">{String(r.isPartiallyLoopLine)}</Text>
      <Text testID="inbound">
        {JSON.stringify(r.inboundStationsForLoopLine)}
      </Text>
      <Text testID="outbound">
        {JSON.stringify(r.outboundStationsForLoopLine)}
      </Text>
    </>
  );
};

describe('useLoopLine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getIsLocal as jest.Mock).mockReturnValue(true);
    // useAtomValue はテストごとに必要量だけ上書きする
  });

  it('山手線で環状線として検出し、主要駅2件ずつを返す', () => {
    const stations: Station[] = [
      { id: 1130224, groupId: 1, line: { id: YAMANOTE_LINE_ID } }, // 東京
      { id: 1130220, groupId: 2, line: { id: YAMANOTE_LINE_ID } }, // 上野
      { id: 1130212, groupId: 3, line: { id: YAMANOTE_LINE_ID } }, // 池袋
      { id: 1130208, groupId: 4, line: { id: YAMANOTE_LINE_ID } }, // 新宿
      { id: 1130205, groupId: 5, line: { id: YAMANOTE_LINE_ID } }, // 渋谷
      { id: 1130229, groupId: 6, line: { id: YAMANOTE_LINE_ID } }, // 品川
    ] as unknown as Station[];

    (useAtomValue as jest.Mock).mockReturnValueOnce({ stations });
    (useCurrentLine as jest.Mock).mockReturnValue({ id: YAMANOTE_LINE_ID });
    (useCurrentStation as jest.Mock).mockReturnValue({
      id: 1130224,
      groupId: 1,
    }); // 東京を現在駅
    (useCurrentTrainType as jest.Mock).mockReturnValue(null);

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('isYamanoteLine').props.children).toBe('true');
    expect(getByTestId('isLoopLine').props.children).toBe('true');
    expect(getByTestId('isOsakaLoopLine').props.children).toBe('false');
    expect(getByTestId('isMeijoLine').props.children).toBe('false');

    // inbound: 逆順で東京の次 → 品川, 渋谷
    const inbound = getByTestId('inbound').props.children as string;
    expect(inbound).toContain('1130229');
    expect(inbound).toContain('1130205');

    // outbound: 正順で東京の次 → 上野, 池袋
    const outbound = getByTestId('outbound').props.children as string;
    expect(outbound).toContain('1130220');
    expect(outbound).toContain('1130212');
  });

  it('非ローカル種別のとき isLoopLine は false になり、駅リストは空', () => {
    const stations: Station[] = [
      { id: 1130224, groupId: 1, line: { id: YAMANOTE_LINE_ID } },
      { id: 1130220, groupId: 2, line: { id: YAMANOTE_LINE_ID } },
    ] as unknown as Station[];

    (useAtomValue as jest.Mock).mockReturnValueOnce({ stations });
    (useCurrentLine as jest.Mock).mockReturnValue({ id: YAMANOTE_LINE_ID });
    (useCurrentStation as jest.Mock).mockReturnValue({
      id: 1130224,
      groupId: 1,
    });
    (useCurrentTrainType as jest.Mock).mockReturnValue({});
    (getIsLocal as jest.Mock).mockReturnValue(false);

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('isLoopLine').props.children).toBe('false');
    expect(getByTestId('inbound').props.children).toBe('[]');
    expect(getByTestId('outbound').props.children).toBe('[]');
  });

  it('checkCurrentLine=false の場合、overrideStations から大阪環状線を検出', () => {
    const overrideStations: Station[] = [
      { id: 1162310, groupId: 1, line: { id: OSAKA_LOOP_LINE_ID } }, // 大阪
      { id: 1162307, groupId: 2, line: { id: OSAKA_LOOP_LINE_ID } }, // 西九条
      { id: 1162313, groupId: 3, line: { id: OSAKA_LOOP_LINE_ID } }, // 京橋
      { id: 1162317, groupId: 4, line: { id: OSAKA_LOOP_LINE_ID } }, // 鶴橋
      { id: 1162301, groupId: 5, line: { id: OSAKA_LOOP_LINE_ID } }, // 天王寺
      { id: 1162302, groupId: 6, line: { id: OSAKA_LOOP_LINE_ID } }, // 新今宮
    ] as unknown as Station[];

    // atom 側の値は未使用になるが、呼ばれるため空で返す
    (useAtomValue as jest.Mock).mockReturnValueOnce({ stations: [] });
    (useCurrentLine as jest.Mock).mockReturnValue({ id: 99999 });
    (useCurrentStation as jest.Mock).mockReturnValue({
      id: 1162310,
      groupId: 1,
    });
    (useCurrentTrainType as jest.Mock).mockReturnValue(null);

    const { getByTestId } = render(
      <TestComponent stations={overrideStations} checkCurrentLine={false} />
    );

    expect(getByTestId('isOsakaLoopLine').props.children).toBe('true');
    expect(getByTestId('isLoopLine').props.children).toBe('true');
  });

  it('大江戸線は部分環状として検出され、isLoopLine は false', () => {
    const stations: Station[] = [
      { id: 9930121, groupId: 1, line: { id: TOEI_OEDO_LINE_ID } },
      { id: 9930124, groupId: 2, line: { id: TOEI_OEDO_LINE_ID } },
    ] as unknown as Station[];

    (useAtomValue as jest.Mock).mockReturnValueOnce({ stations });
    (useCurrentLine as jest.Mock).mockReturnValue({ id: TOEI_OEDO_LINE_ID });
    (useCurrentStation as jest.Mock).mockReturnValue({
      id: 9930121,
      groupId: 1,
    });
    (useCurrentTrainType as jest.Mock).mockReturnValue(null);

    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('isOedoLine').props.children).toBe('true');
    expect(getByTestId('isPartiallyLoopLine').props.children).toBe('true');
    expect(getByTestId('isLoopLine').props.children).toBe('false');
    expect(getByTestId('inbound').props.children).toBe('[]');
    expect(getByTestId('outbound').props.children).toBe('[]');
  });

  it('名城線でも環状線として検出される', () => {
    const overrideStations: Station[] = [
      { id: 9951409, groupId: 1, line: { id: MEIJO_LINE_ID } },
      { id: 9951402, groupId: 2, line: { id: MEIJO_LINE_ID } },
      { id: 9951413, groupId: 3, line: { id: MEIJO_LINE_ID } },
    ] as unknown as Station[];

    (useAtomValue as jest.Mock).mockReturnValueOnce({ stations: [] });
    (useCurrentLine as jest.Mock).mockReturnValue({ id: 0 });
    (useCurrentStation as jest.Mock).mockReturnValue({
      id: 9951409,
      groupId: 1,
    });
    (useCurrentTrainType as jest.Mock).mockReturnValue(null);

    const { getByTestId } = render(
      <TestComponent stations={overrideStations} checkCurrentLine={false} />
    );

    expect(getByTestId('isMeijoLine').props.children).toBe('true');
    expect(getByTestId('isLoopLine').props.children).toBe('true');
  });
});
