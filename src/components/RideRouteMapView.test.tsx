import { act, render } from '@testing-library/react-native';
import MapView, { Circle } from 'react-native-maps';
import type { RideRoutes } from '~/utils/rideRoutes';
import { RideRouteMapView } from './RideRouteMapView';

const routes: RideRoutes = {
  lines: [],
  lineIds: [],
  unmappedRideCount: 0,
  bounds: {
    minLatitude: 35,
    maxLatitude: 36,
    minLongitude: 139,
    maxLongitude: 140,
  },
  stations: [
    { latitude: 35.5, longitude: 139.5, name: '駅', isTerminal: false },
  ],
};

it('全画面では同じズーム段階で円の半径を変えず、段階をまたいだときだけ変える', () => {
  const view = render(
    <RideRouteMapView routes={routes} variant="fullscreen" />
  );
  const map = view.UNSAFE_getByType(MapView);
  const region = map.props.initialRegion;
  const radius = () => view.UNSAFE_getByType(Circle).props.radius;
  const initial = radius();
  act(() =>
    map.props.onRegionChangeComplete({
      ...region,
      latitudeDelta: region.latitudeDelta * 1.001,
    })
  );
  expect(radius()).toBe(initial);
  act(() =>
    map.props.onRegionChangeComplete({
      ...region,
      latitudeDelta: region.latitudeDelta * 2,
    })
  );
  expect(radius()).toBe(initial * 2);
});

it('カードの固定範囲と円の半径を期間に追従させる', () => {
  const view = render(<RideRouteMapView routes={routes} variant="card" />);
  expect(
    view.UNSAFE_getByType(MapView).props.onRegionChangeComplete
  ).toBeUndefined();
  const initial = view.UNSAFE_getByType(Circle).props.radius;
  view.rerender(
    <RideRouteMapView
      routes={{
        ...routes,
        bounds: {
          minLatitude: 35,
          minLongitude: 139,
          maxLongitude: 140,
          maxLatitude: 37,
        },
      }}
      variant="card"
    />
  );
  expect(view.UNSAFE_getByType(Circle).props.radius).toBe(initial * 2);
});
