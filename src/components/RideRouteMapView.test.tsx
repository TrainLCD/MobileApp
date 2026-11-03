import { act, render } from '@testing-library/react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { Platform, View } from 'react-native';
import { getRideRouteRegion } from '~/utils/rideRoutes';
import { LegacyRideRouteMapView } from './LegacyRideRouteMapView';

const MapView = AppleMaps.View;
const layout = (view: ReturnType<typeof render>) =>
  act(() => {
    view
      .UNSAFE_getAllByType(View)
      .find((node) => node.props.onLayout)
      ?.props.onLayout({
        nativeEvent: { layout: { width: 400, height: 300 } },
      });
  });

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
  layout(view);
  const map = view.UNSAFE_getByType(MapView);
  const region = getRideRouteRegion({
    minLatitude: 35,
    maxLatitude: 36,
    minLongitude: 139,
    maxLongitude: 140,
  });
  const radius = () => view.UNSAFE_getByType(MapView).props.circles[0].radius;
  const initial = radius();
  act(() =>
    map.props.onCameraMove({
      ...region,
      latitudeDelta: region.latitudeDelta * 1.001,
    })
  );
  expect(radius()).toBe(initial);
  act(() =>
    map.props.onCameraMove({
      ...region,
      latitudeDelta: region.latitudeDelta * 2,
    })
  );
  expect(radius()).toBe(initial * 2);
});

it('カードの固定範囲と円の半径を期間に追従させる', () => {
  const view = render(<RideRouteMapView routes={routes} variant="card" />);
  layout(view);
  expect(view.UNSAFE_getByType(MapView).props.onCameraMove).toBeUndefined();
  const initial = view.UNSAFE_getByType(MapView).props.circles[0].radius;
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
  expect(view.UNSAFE_getByType(MapView).props.circles[0].radius).toBe(
    initial * 2
  );
});

it('経路がないときは地図を作らない', () => {
  const view = render(
    <RideRouteMapView routes={{ ...routes, bounds: null }} variant="card" />
  );
  expect(view.queryAllByTestId('ride-route-map')).toHaveLength(0);
  expect(view.UNSAFE_queryAllByType(AppleMaps.View)).toHaveLength(0);
  expect(view.UNSAFE_queryAllByType(GoogleMaps.View)).toHaveLength(0);
});

it('Androidでは操作と現在地を無効にしたカードを作り、期間変更をカメラに反映する', () => {
  const original = Platform.OS;
  Platform.OS = 'android';
  try {
    const view = render(<RideRouteMapView routes={routes} variant="card" />);
    layout(view);
    const map = () => view.UNSAFE_getByType(GoogleMaps.View);
    const zoom = map().props.cameraPosition.zoom;
    expect(Number.isFinite(zoom)).toBe(true);
    expect(map().props.properties.isMyLocationEnabled).toBe(false);
    expect(map().props.uiSettings.scrollGesturesEnabled).toBe(false);
    expect(map().props.uiSettings.zoomGesturesEnabled).toBe(false);
    view.rerender(
      <RideRouteMapView
        routes={{
          ...routes,
          bounds: {
            minLatitude: 35,
            maxLatitude: 40,
            minLongitude: 139,
            maxLongitude: 145,
          },
        }}
        variant="card"
      />
    );
    expect(map().props.cameraPosition.zoom).toBeLessThan(zoom);
    expect(view.UNSAFE_queryAllByType(AppleMaps.View)).toHaveLength(0);
  } finally {
    Platform.OS = original;
  }
});

it('見出しと凡例の高さを地図の外側に確保する', () => {
  const view = render(
    <RideRouteMapView
      routes={routes}
      variant="fullscreen"
      mapPadding={{ top: 100, bottom: 200, left: 4, right: 8 }}
    />
  );
  const container = view
    .UNSAFE_getAllByType(View)
    .find((node) => node.props.onLayout);
  expect(container?.props.style).toContainEqual({
    marginTop: 100,
    marginBottom: 200,
    marginLeft: 4,
    marginRight: 8,
  });
});

it.each(['16.4', '16.7', '16.7.12'])(
  'iOS %s では既存の地図を使う',
  (version) => {
    const originalOS = Platform.OS;
    const descriptor = Object.getOwnPropertyDescriptor(Platform, 'Version');
    Platform.OS = 'ios';
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: version,
    });
    try {
      const view = render(<RideRouteMapView routes={routes} variant="card" />);
      expect(view.UNSAFE_getAllByType(LegacyRideRouteMapView)).toHaveLength(1);
      expect(view.UNSAFE_queryAllByType(AppleMaps.View)).toHaveLength(0);
    } finally {
      Platform.OS = originalOS;
      if (descriptor) Object.defineProperty(Platform, 'Version', descriptor);
      else Reflect.deleteProperty(Platform, 'Version');
    }
  }
);
