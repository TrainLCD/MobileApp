import { act, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useLazyGraphQLQuery } from '~/hooks/useLazyGraphQLQuery';
import { useNearbyStations } from '~/hooks/useNearbyStations';
import { gqlClient } from '~/lib/gql';
import {
  GET_STATION_SEARCH_CANDIDATES,
  GET_STATIONS_BY_IDS,
} from '~/lib/graphql/queries';
import { showDialogWhilePresenting } from '~/utils/dialogPresentation';
import { createStation } from '~/utils/test/factories';
import { CommonCard } from './CommonCard';
import { SearchBar } from './SearchBar';
import { StationSearchModal } from './StationSearchModal';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('~/lib/gql', () => ({ gqlClient: { query: jest.fn() } }));
jest.mock('~/hooks/useLazyGraphQLQuery');
jest.mock('~/hooks/useNearbyStations');
jest.mock('~/hooks/useAIAgentFeatureEnabled', () => ({
  useAIAgentFeatureEnabled: () => false,
}));
jest.mock('~/hooks/useFetchCurrentLocationOnce', () => ({
  useFetchCurrentLocationOnce: () => ({
    fetchCurrentLocation: () => new Promise(() => {}),
  }),
}));
jest.mock('~/utils/dialogPresentation');
jest.mock('./CustomModal', () => ({
  CustomModal: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('./SearchBar', () => ({ SearchBar: () => null }));
jest.mock('./CommonCard', () => ({ CommonCard: () => null }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({
    data,
    renderItem,
  }: {
    data: unknown[];
    renderItem: (row: { item: unknown }) => ReactNode;
  }) => (data.length ? renderItem({ item: data[0] }) : null),
}));

const candidate = createStation(1134105, {
  name: '前橋',
  line: { id: 11341 },
});
const detail = { ...candidate, latitude: 36.38, longitude: 139.07 };
const fetchCandidates = jest.fn();
const setup = (called = true) => {
  jest.mocked(useLazyGraphQLQuery).mockReturnValue([
    fetchCandidates,
    {
      called,
      loading: false,
      error: undefined,
      data: { stationsByName: [candidate] },
    },
  ]);
  jest.mocked(useNearbyStations).mockReturnValue({
    data: { stationsNearby: [detail] },
    loading: called,
    error: called ? new Error('nearby') : undefined,
  });
  const onSelect = jest.fn();
  const view = render(
    <StationSearchModal visible onSelect={onSelect} onClose={jest.fn()} />
  );
  const press = () => view.UNSAFE_getByType(CommonCard).props.onPress();
  return { view, onSelect, press };
};
afterEach(() => jest.resetAllMocks());

it('駅名候補の表示では詳細を取得せず、選んだ駅の詳細だけを現在駅に渡す', async () => {
  const { onSelect, press } = setup();
  expect(useLazyGraphQLQuery).toHaveBeenCalledWith(
    GET_STATION_SEARCH_CANDIDATES
  );
  expect(gqlClient.query).not.toHaveBeenCalled();
  expect(showDialogWhilePresenting).not.toHaveBeenCalled();
  jest
    .mocked(gqlClient.query)
    .mockResolvedValue({ data: { stations: [detail] } });
  await act(press);
  expect(gqlClient.query).toHaveBeenCalledWith({
    query: GET_STATIONS_BY_IDS,
    variables: { ids: [candidate.id] },
  });
  expect(onSelect).toHaveBeenCalledWith(detail);
});

it('駅名を再検索した後に届いた詳細を破棄する', async () => {
  const { view, onSelect, press } = setup();
  const delayed = Promise.withResolvers<{
    data: { stations: (typeof detail)[] };
  }>();
  jest.mocked(gqlClient.query).mockReturnValue(delayed.promise);
  act(() => {
    void press();
  });
  act(() => view.UNSAFE_getByType(SearchBar).props.onSearch('Maeb'));
  expect(fetchCandidates).toHaveBeenCalledWith({ variables: { name: 'Maeb' } });
  await act(async () => {
    delayed.resolve({ data: { stations: [detail] } });
    await delayed.promise;
  });
  expect(onSelect).not.toHaveBeenCalled();
});

it('選択した駅の詳細が欠けていれば再試行できる', async () => {
  const { onSelect, press } = setup();
  jest
    .mocked(gqlClient.query)
    .mockResolvedValueOnce({ data: { stations: [] } })
    .mockResolvedValueOnce({ data: { stations: [detail] } });
  await act(press);
  expect(onSelect).not.toHaveBeenCalled();
  expect(showDialogWhilePresenting).toHaveBeenCalledTimes(1);
  await act(press);
  expect(onSelect).toHaveBeenCalledWith(detail);
});

it('周辺駅から選ぶときは取得済みの詳細を使う', async () => {
  const { onSelect, press } = setup(false);
  await act(press);
  expect(gqlClient.query).not.toHaveBeenCalled();
  expect(onSelect).toHaveBeenCalledWith(detail);
});
