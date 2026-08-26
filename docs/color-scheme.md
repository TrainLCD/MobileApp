# 操作系画面のダークモード

設定・路線選択・経路検索などの**操作系画面**だけをダークモードの対象にする仕組みをまとめる。
走行画面(`src/screens/Main.tsx` とその配下)は路線テーマ(`models/Theme.ts`)が配色を決めるため、
この仕組みの対象外であり、ユーザーがダークを選んでも見た目は変わらない。

## ユーザー設定

設定 → 外観(`ColorSchemeSettings`)で以下の 3 つから選ぶ。既定は「自動」。

- **自動**: 端末のダークモード設定に追従する
- **ライト**: 常にライト
- **ダーク**: 常にダーク

選択値は MMKV(`STORAGE_KEYS.COLOR_SCHEME_PREFERENCE`)へ即時保存する。

## 構成

| レイヤー | 実体 | 役割 |
| ---- | ---- | ---- |
| モデル | `src/models/ColorScheme.ts` | `AUTO` / `LIGHT` / `DARK` の定義 |
| パレット | `src/constants/colorScheme.ts` | ライト/ダークの配色トークン |
| 状態 | `src/store/atoms/colorScheme.ts` | ユーザー設定・端末設定・解決済みの配色 |
| 端末追従 | `src/components/FxSystemColorScheme.tsx` | `Appearance` の変化を atom へ反映 |
| 配布 | `src/providers/AppColorsProvider.tsx` | 配下のコンポーネントへ配色を配る |

`colorSchemePreferenceAtom` は他の設定と異なり `Permitted` の `loadSettings`(effect)では復元せず、
MMKV の同期 API で初期値を確定する。effect 復元だと初回フレームだけライトで描画され、
ダーク設定時に白い画面が一瞬光るため。

## 走行画面を対象外にする方法

`AppColorsProvider` の Context の**既定値をライトのパレットにしている**のが要点。
Provider の外側で描画されるものは、ユーザー設定や端末設定にかかわらず常に従来と同じ色を受け取る。

`MainStack` では走行画面**以外**の `Stack.Screen` にだけ `layout` で Provider を差し込む。

```tsx
const operationScreenLayout = ({
  children,
}: {
  children: React.ReactElement;
}) => <AppColorsProvider>{children}</AppColorsProvider>;

<Stack.Screen
  layout={operationScreenLayout}
  name="AppSettings"
  component={AppSettings}
/>
{/* 走行画面には layout を付けない */}
<Stack.Screen name="Main" component={Main} />
```

そのため `Typography` や `Button` のような共通コンポーネントは、走行画面の配下ではライトの値を受け取り、
従来と同じ見た目のままになる。新しく共通コンポーネントを配色対応させるときも、
`useAppColors()` を使う限りこの境界は保たれる。

## LED テーマは対象外

LED テーマは行先表示器を模した配色を全画面で持っているため、ダークモードと併用すると
色の混在が起きる。そこで `appColorsAtom` は **LED テーマ選択中はライトのパレットを返す**。

```ts
export const appColorsAtom = atom<AppColors>((get) => {
  if (get(isLEDThemeAtom)) {
    return LIGHT_APP_COLORS;
  }
  return APP_COLORS[get(resolvedColorSchemeAtom)];
});
```

`LIGHT_APP_COLORS` の各値は、この機能を入れる前に各画面へ直接書かれていた色と同じものを
使っている。そのため LED テーマ中は、各コンポーネントに残した `isLEDTheme` 分岐と合わせて
導入前と完全に同じ色になる。設定値そのものは保持されるので、LED 以外のテーマへ戻せば
選んでいたダークがそのまま適用される。

`colors.isDark` も同様に LED テーマ中は `false` になる。

## 使い方

```tsx
import { useAppColors } from '~/providers/AppColorsProvider';

const colors = useAppColors();

<View style={{ backgroundColor: colors.background }}>
  <Typography style={{ color: colors.secondaryText }}>...</Typography>
</View>;
```

LED テーマは独自の黒背景を持つため、既存の `isLEDTheme` 分岐はそのまま残し、
非 LED 側の色だけをパレットへ置き換える。

```tsx
backgroundColor: isLEDTheme ? '#333' : colors.card,
```

## 制限事項

`@gorhom/portal` を使うモーダル(`CustomModal` 系)は、要素が PortalProvider の位置でマウントされるため
`AppColorsProvider` の Context が届かない。対応済みのモーダルは、
自身の配色を `appColorsAtom` から直接読み、子孫には Provider を張り直している
(`StationSearchModal`、`ThemeConfirmModal`)。

以下は走行画面と共有しているため、今回は従来のライト(または LED)の見た目のままにしている。

- `SelectBoundModal` とその配下
  (`TrainTypeListModal` / `RouteInfoModal` / `SavePresetNameModal` /
  `SelectBoundSettingListModal`)
- 共通ダイアログ(`CommonDialogPresenter` / `CommonDialogModal`)
- `GlobalToast`
