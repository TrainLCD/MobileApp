import { Image, type ImageRef } from 'expo-image';
import { AppleMaps, type CameraMoveEvent, GoogleMaps } from 'expo-maps';
import { useAtomValue } from 'jotai';
import {
  type ComponentRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import Typography from '~/components/Typography';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '~/constants/mapStyles';
import { COLOR_SCHEME } from '~/models/ColorScheme';
import { resolvedColorSchemeAtom } from '~/store/atoms/colorScheme';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import { getRideRouteRegion, type RideRoutes } from '~/utils/rideRoutes';
import { LegacyRideRouteMapView } from './LegacyRideRouteMapView';

// 太さの段階(1〜3)ごとの線の太さ。カードは小さく表示するので細くする
const LINE_WIDTHS = {
  card: [3, 5, 7],
  fullscreen: [4, 6, 8],
} as const;
// 地図と区別するための縁取りの幅(線の両側の合計)
const OUTLINE_WIDTH = 3;
const FALLBACK_LINE_COLOR = '#888888';
// 駅の点の半径を、表示している緯度の幅に対する割合で決める。Circle の半径は
// メートル指定なので、拡大しても画面上の大きさが変わらないよう表示範囲に合わせる。
// 全画面は地図の高さがカードの4倍ほどあるので、割合を小さくして同じくらいの点にする
const STATION_RADIUS_RATIO = { card: 0.012, fullscreen: 0.005 } as const;
// 1段で表示範囲が2倍になるズームを4分割する。点の半径のずれは約9%以内に収まる。
const quantizeLatitudeDelta = (delta: number): number =>
  Number.isFinite(delta) && delta > 0
    ? 2 ** (Math.round(Math.log2(delta) * 4) / 4)
    : 0;
const METERS_PER_LATITUDE_DEGREE = 111_000;
// 駅名を出す駅の上限。年の表示で端の駅が多くなっても地図を埋めないようにする
const MAX_STATION_LABELS = 30;

const styles = StyleSheet.create({
  map: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: 'bold',
    textShadowRadius: 3,
    textShadowOffset: { width: 0, height: 0 },
  },
});

const toLineWidth = (variant: 'card' | 'fullscreen', level: number): number =>
  LINE_WIDTHS[variant][Math.min(Math.max(level, 1), 3) - 1];

// Google Maps は任意のReact要素をマーカーにできないため、駅名を一度だけ画像化する。
const AndroidStationLabel = ({
  id,
  name,
  isDark,
  onImage,
}: {
  id: string;
  name: string;
  isDark: boolean;
  onImage: (id: string, image: ImageRef | undefined) => void;
}) => {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    let uri: string | undefined;
    void (async () => {
      try {
        uri = await captureRef(ref, { format: 'png', result: 'tmpfile' });
        const image = await Image.loadAsync(uri);
        if (active) onImage(id, image);
      } catch {
        // 画像化できない場合も、標準マーカーのタップで駅名を確認できる。
      } finally {
        if (uri) releaseCapture(uri);
      }
    })();
    return () => {
      active = false;
      onImage(id, undefined);
    };
  }, [ready, id, onImage]);
  return (
    <View ref={ref} collapsable={false} onLayout={() => setReady(true)}>
      <Typography
        style={[
          styles.label,
          {
            color: isDark ? '#fff' : '#222',
            textShadowColor: isDark ? '#000' : '#fff',
          },
        ]}
      >
        {name}
      </Typography>
    </View>
  );
};

type Props = {
  routes: RideRoutes;
  // card は振り返り画面の中に置く操作できない地図、fullscreen は全画面で動かせる地図
  variant: 'card' | 'fullscreen';
  // 地図の上に重ねた UI の分だけ、地図の出典表記と中心をずらす
  mapPadding?: { top: number; right: number; bottom: number; left: number };
};

/**
 * 振り返りの移動経路を、地図の上に路線色の線で描く。
 * 駅の座標は乗車ログに保存した駅の位置で、利用者の位置は使わない。
 */
export const RideRouteMapView = (props: Props) => {
  if (
    Platform.OS === 'ios' &&
    Number.parseInt(String(Platform.Version), 10) < 17
  ) {
    return <LegacyRideRouteMapView {...props} />;
  }
  return <ExpoRideRouteMapView {...props} />;
};

const ExpoRideRouteMapView = ({ routes, variant, mapPadding }: Props) => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colorScheme = useAtomValue(resolvedColorSchemeAtom);
  // 電光掲示板風テーマは画面全体が暗いので、地図も暗くする
  const isDark = isLEDTheme || colorScheme === COLOR_SCHEME.DARK;
  const isCard = variant === 'card';

  const initialRegion = useMemo(
    () => (routes.bounds ? getRideRouteRegion(routes.bounds) : undefined),
    [routes.bounds]
  );
  const [latitudeDelta, setLatitudeDelta] = useState(
    quantizeLatitudeDelta(initialRegion?.latitudeDelta ?? 0)
  );
  const handleRegionChangeComplete = useCallback((region: CameraMoveEvent) => {
    setLatitudeDelta(quantizeLatitudeDelta(region.latitudeDelta));
  }, []);
  const [labelImages, setLabelImages] = useState<Record<string, ImageRef>>({});
  const handleLabelImage = useCallback(
    (id: string, image: ImageRef | undefined) => {
      setLabelImages((previous) => {
        if (previous[id] === image) return previous;
        const next = { ...previous };
        if (image) next[id] = image;
        else delete next[id];
        return next;
      });
    },
    []
  );
  const [size, setSize] = useState({ width: 0, height: 0 });
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) =>
      previous.width === width && previous.height === height
        ? previous
        : { width, height }
    );
  }, []);
  // カードは表示範囲を動かせないので、期間を切り替えたときも経路の範囲から求める
  const shownLatitudeDelta = isCard
    ? (initialRegion?.latitudeDelta ?? 0)
    : latitudeDelta;
  const stationRadius =
    shownLatitudeDelta *
    METERS_PER_LATITUDE_DEGREE *
    STATION_RADIUS_RATIO[variant];
  const labels = useMemo(
    () =>
      isCard
        ? []
        : routes.stations
            .filter((s) => s.isTerminal && s.name != null)
            .slice(0, MAX_STATION_LABELS),
    [isCard, routes.stations]
  );

  if (!initialRegion) {
    return null;
  }

  const outlineColor = isDark ? '#111111' : '#FFFFFF';

  // Apple Maps は緯度・経度の幅、Google Maps は256dpの世界地図を基準にする。
  const mercatorSpan = (latitude: number) => {
    const radians = (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 180;
    return Math.log(Math.tan(Math.PI / 4 + radians / 2));
  };
  const latitudeFraction =
    Math.abs(
      mercatorSpan(initialRegion.latitude + initialRegion.latitudeDelta / 2) -
        mercatorSpan(initialRegion.latitude - initialRegion.latitudeDelta / 2)
    ) /
    (2 * Math.PI);
  const zoom =
    Platform.OS === 'ios'
      ? Math.log2(
          360 /
            Math.max(initialRegion.latitudeDelta, initialRegion.longitudeDelta)
        )
      : Math.min(
          Math.log2(
            Math.max(size.width, 1) /
              ((256 * initialRegion.longitudeDelta) / 360)
          ),
          Math.log2(Math.max(size.height, 1) / (256 * latitudeFraction))
        );
  const cameraPosition = {
    coordinates: {
      latitude: initialRegion.latitude,
      longitude: initialRegion.longitude,
    },
    zoom,
  };
  const polylines = [
    ...routes.lines.map((line, index) => ({
      id: `outline-${index}`,
      coordinates: line.coordinates,
      color: outlineColor,
      width: toLineWidth(variant, line.level) + OUTLINE_WIDTH,
    })),
    ...routes.lines.map((line, index) => ({
      id: `line-${index}`,
      coordinates: line.coordinates,
      color: line.color ?? FALLBACK_LINE_COLOR,
      width: toLineWidth(variant, line.level),
    })),
  ];
  const circles =
    stationRadius > 0
      ? routes.stations.map((station) => ({
          id: `${station.latitude},${station.longitude}`,
          center: station,
          radius: stationRadius,
          color: '#FFFFFF',
          lineColor: '#333333',
          lineWidth: 1,
        }))
      : [];
  const common = {
    style: styles.map,
    cameraPosition,
    polylines,
    circles,
    onCameraMove: isCard ? undefined : handleRegionChangeComplete,
  };
  // 両OSで地図そのものを重ねたUIの内側に置き、出典表記を隠さない。
  // カードの期間変更とサイズ変更では初期カメラを確実に適用する。
  const mapKey = `${size.width},${size.height}:${isCard ? JSON.stringify(cameraPosition) : ''}`;
  return (
    <View
      style={[
        styles.map,
        {
          marginTop: mapPadding?.top,
          marginBottom: mapPadding?.bottom,
          marginLeft: mapPadding?.left,
          marginRight: mapPadding?.right,
        },
      ]}
      onLayout={handleLayout}
      pointerEvents={isCard ? 'none' : 'auto'}
    >
      {Platform.OS === 'android' && !isCard ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: 'absolute', left: -10000, top: 0 }}
        >
          {labels.map((station) => {
            const id = `${station.latitude},${station.longitude}`;
            return (
              <AndroidStationLabel
                key={`${id}:${station.name}:${isDark}`}
                id={id}
                name={station.name ?? ''}
                isDark={isDark}
                onImage={handleLabelImage}
              />
            );
          })}
        </View>
      ) : null}
      {size.width > 0 && size.height > 0 ? (
        Platform.OS === 'ios' ? (
          <AppleMaps.View
            {...common}
            key={mapKey}
            colorScheme={
              isDark
                ? AppleMaps.MapColorScheme.DARK
                : AppleMaps.MapColorScheme.LIGHT
            }
            annotations={labels.map((station) => ({
              id: `${station.latitude},${station.longitude}`,
              coordinates: station,
              text: station.name ?? '',
              textColor: isDark ? '#fff' : '#222',
              backgroundColor: 'transparent',
              anchor: { x: 0, y: 1 },
            }))}
            properties={{
              pointsOfInterest: { including: [] },
              isMyLocationEnabled: false,
              selectionEnabled: false,
            }}
            uiSettings={{
              compassEnabled: false,
              myLocationButtonEnabled: false,
              scaleBarEnabled: false,
              togglePitchEnabled: false,
            }}
          />
        ) : Platform.OS === 'android' ? (
          <GoogleMaps.View
            {...common}
            key={mapKey}
            colorScheme={
              isDark
                ? GoogleMaps.MapColorScheme.DARK
                : GoogleMaps.MapColorScheme.LIGHT
            }
            markers={labels.map((station) => ({
              id: `${station.latitude},${station.longitude}`,
              coordinates: station,
              title: station.name ?? '',
              showCallout: true,
              icon: labelImages[`${station.latitude},${station.longitude}`],
              anchor: { x: 0, y: 1 },
            }))}
            properties={{
              mapStyleOptions: {
                json: JSON.stringify(isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE),
              },
              isMyLocationEnabled: false,
              selectionEnabled: false,
            }}
            uiSettings={{
              compassEnabled: false,
              myLocationButtonEnabled: false,
              mapToolbarEnabled: false,
              rotationGesturesEnabled: false,
              tiltGesturesEnabled: false,
              scrollGesturesEnabled: !isCard,
              zoomGesturesEnabled: !isCard,
              zoomControlsEnabled: false,
            }}
          />
        ) : null
      ) : null}
    </View>
  );
};

// 地図の地の色に近い色。地図を出せないときの背景に使う
export const useRideRouteMapBackgroundColor = (): string => {
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const colorScheme = useAtomValue(resolvedColorSchemeAtom);
  return isLEDTheme || colorScheme === COLOR_SCHEME.DARK
    ? '#242f3e'
    : '#EEEBE4';
};
