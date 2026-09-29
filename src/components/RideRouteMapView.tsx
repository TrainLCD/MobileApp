import { useAtomValue } from 'jotai';
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import MapView, {
  Circle,
  type EdgePadding,
  Marker,
  Polyline,
  type Region,
} from 'react-native-maps';
import Typography from '~/components/Typography';
import { DARK_MAP_STYLE, LIGHT_MAP_STYLE } from '~/constants/mapStyles';
import { COLOR_SCHEME } from '~/models/ColorScheme';
import { resolvedColorSchemeAtom } from '~/store/atoms/colorScheme';
import { isLEDThemeAtom } from '~/store/atoms/theme';
import {
  getRideRouteRegion,
  type RideRouteStation,
  type RideRoutes,
} from '~/utils/rideRoutes';

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

const StationLabel = React.memo(
  ({ station, isDark }: { station: RideRouteStation; isDark: boolean }) => (
    <Marker
      coordinate={station}
      anchor={{ x: 0, y: 1 }}
      // 中身が変わらないので、描き直しの負荷を避ける
      tracksViewChanges={false}
    >
      <Typography
        style={[
          styles.label,
          {
            color: isDark ? '#fff' : '#222',
            textShadowColor: isDark ? '#000' : '#fff',
          },
        ]}
      >
        {station.name}
      </Typography>
    </Marker>
  )
);

type Props = {
  routes: RideRoutes;
  // card は振り返り画面の中に置く操作できない地図、fullscreen は全画面で動かせる地図
  variant: 'card' | 'fullscreen';
  // 地図の上に重ねた UI の分だけ、地図の出典表記と中心をずらす
  mapPadding?: EdgePadding;
};

/**
 * 振り返りの移動経路を、地図の上に路線色の線で描く。
 * 駅の座標は乗車ログに保存した駅の位置で、利用者の位置は使わない。
 */
export const RideRouteMapView = ({ routes, variant, mapPadding }: Props) => {
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
    initialRegion?.latitudeDelta ?? 0
  );
  const handleRegionChangeComplete = useCallback((region: Region) => {
    setLatitudeDelta(region.latitudeDelta);
  }, []);
  // Android の react-native-maps は、GoogleMap の用意ができる前に mapPadding を
  // 受け取ると null の地図を触って落ちる(MapView.applyBaseMapPadding)。
  // 用意ができてから渡す
  const [mapReady, setMapReady] = useState(false);
  const handleMapReady = useCallback(() => {
    setMapReady(true);
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

  return (
    <MapView
      style={styles.map}
      // カードは地図を固定する。期間を切り替えたら経路に合わせて表示範囲を変える
      region={isCard ? initialRegion : undefined}
      initialRegion={initialRegion}
      onRegionChangeComplete={isCard ? undefined : handleRegionChangeComplete}
      onMapReady={handleMapReady}
      mapPadding={mapReady ? mapPadding : undefined}
      // Android はカードを静止画の地図(ライトモード)にして、スクロール中の負荷を抑える
      liteMode={isCard}
      scrollEnabled={!isCard}
      zoomEnabled={!isCard}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      showsPointsOfInterests={false}
      showsCompass={false}
      customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
    >
      {routes.lines.map((line, index) => (
        <Polyline
          // 線は並び替えないので、並び順をそのまま key にする
          // biome-ignore lint/suspicious/noArrayIndexKey: 並び順が変わらない
          key={`outline-${index}`}
          coordinates={line.coordinates}
          strokeColor={outlineColor}
          strokeWidth={toLineWidth(variant, line.level) + OUTLINE_WIDTH}
          lineCap="round"
          lineJoin="round"
          zIndex={1}
        />
      ))}
      {routes.lines.map((line, index) => (
        <Polyline
          // biome-ignore lint/suspicious/noArrayIndexKey: 並び順が変わらない
          key={`line-${index}`}
          coordinates={line.coordinates}
          strokeColor={line.color ?? FALLBACK_LINE_COLOR}
          strokeWidth={toLineWidth(variant, line.level)}
          lineCap="round"
          lineJoin="round"
          zIndex={2}
        />
      ))}
      {stationRadius > 0
        ? routes.stations.map((station) => (
            <Circle
              key={`${station.latitude},${station.longitude}`}
              center={station}
              radius={stationRadius}
              fillColor="#FFFFFF"
              strokeColor="#333333"
              strokeWidth={1}
              zIndex={3}
            />
          ))
        : null}
      {labels.map((station) => (
        <StationLabel
          key={`${station.latitude},${station.longitude}`}
          station={station}
          isDark={isDark}
        />
      ))}
    </MapView>
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
