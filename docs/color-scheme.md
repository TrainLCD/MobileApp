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

## 電光掲示板風テーマは対象外

電光掲示板風テーマ(コード上の識別子は `isLEDTheme` などの LED 表記)は行先表示器を模した
配色を全画面で持っているため、ダークモードと併用すると色の混在が起きる。そこで
`appColorsAtom` は **電光掲示板風テーマ選択中はライトのパレットを返す**。

```ts
export const appColorsAtom = atom<AppColors>((get) => {
  if (get(isLEDThemeAtom)) {
    return LIGHT_APP_COLORS;
  }
  return APP_COLORS[get(resolvedColorSchemeAtom)];
});
```

`LIGHT_APP_COLORS` の各値は、この機能を入れる前に各画面へ直接書かれていた色と同じものを
使っている(同系色でも従来値が違うものはトークンを分けている。
例: `card` = `#FFFFFF` と `subtleSurface` = `#FCFCFC`)。この対応関係は
`src/constants/colorScheme.test.ts` で固定しているので、トークンを統合・改名するときは
そこが落ちないことを確認すること。そのため電光掲示板風テーマ中は、各コンポーネントに残した `isLEDTheme` 分岐と
合わせて導入前と完全に同じ色になる。設定値そのものは保持されるので、他のテーマへ戻せば
選んでいたダークがそのまま適用される。

`colors.isDark` も同様に電光掲示板風テーマ中は `false` になる。

## 使い方

```tsx
import { useAppColors } from '~/providers/AppColorsProvider';

const colors = useAppColors();

<View style={{ backgroundColor: colors.background }}>
  <Typography style={{ color: colors.secondaryText }}>...</Typography>
</View>;
```

電光掲示板風テーマは独自の黒背景を持つため、既存の `isLEDTheme` 分岐はそのまま残し、
それ以外の色だけをパレットへ置き換える。

```tsx
backgroundColor: isLEDTheme ? '#333' : colors.card,
```

## モーダルは走行画面から開いても配色に追従する

モーダルは車内再現(走行画面)とは別コンセプトの画面なので、**どの画面から開いたかに
かかわらず**配色設定に追従する。走行画面本体だけが対象外という切り分け。

`@gorhom/portal` を使うモーダル(`CustomModal` 系)は、要素が PortalHost の位置で
マウントされるため呼び出し元ツリーの Context が届かない。そこで `CustomModal` が
Portal の内側で `AppColorsProvider` を張り直し、子孫へ配色を配っている。

```tsx
<Portal>
  <AppColorsProvider>{/* モーダルの中身 */}</AppColorsProvider>
</Portal>
```

`contentContainerStyle` のように Portal の外側で組み立てる値は Context が使えないため、
モーダル本体は `appColorsAtom` を直接購読する。

```tsx
const colors = useAtomValue(appColorsAtom);
```

この境界は `src/components/CustomModal.colorScheme.test.tsx` で固定している
(`AppColorsProvider` を挟まないツリーから開いてもダークが届くこと、
電光掲示板風テーマでは従来の配色のままであること)。

## アクションシート

アクションシートは React のツリーの外に出る一時的な UI なので、`useAppColors()` の
Context ではなく `getActionSheetColorOptions()`(`src/utils/actionSheetColors.ts`)で
配色をオプションとして渡す。

```tsx
const actionSheetColors = useAtomValue(overlayAppColorsAtom);

showActionSheetWithOptions(
  {
    options,
    cancelButtonIndex,
    ...getActionSheetColorOptions(actionSheetColors),
  },
  handleSelect
);
```

iOS は端末ネイティブのシートなので `userInterfaceStyle` だけが効き、Android は JS 実装の
シートなのでスタイル系だけが効く。両方を一度に渡し、効かない側は無視させている。
ライト時はスタイルを指定せずライブラリ既定値のままにして導入前と同じ見た目を保つが、
iOS のネイティブシートは既定で端末の外観に追従してしまうため、ライトでも
`userInterfaceStyle` だけは明示してアプリ側の設定を優先させる。

アクションシートは OS 側のレイヤーに描かれ、電光掲示板風テーマの配色を持ちようがない。
そのためここだけは電光掲示板風テーマ中も配色設定に追従させる。渡すパレットは
`appColorsAtom` ではなく、テーマの影響を受けない `overlayAppColorsAtom` を使う。
追従させないと、他がダークなのにシートだけ明るいという不具合に見えてしまう。

走行画面から開くアクションシート(`Permitted.tsx` の長押しメニュー)もモーダルと同じ扱いで
配色に追従する。走行画面は Provider の外側にあるため、そこでは `appColorsAtom` を直接購読する。

## native の外観設定

iOS は `Info.plist` の `UIUserInterfaceStyle` が `Light` だとアプリ全体がライトに固定され、
`Appearance.getColorScheme()` が常に `'light'` を返す(`RCTAppearance.mm` は key window
の trait collection を読むため)。この状態では端末設定を読めず「自動」が機能しないので、
`Automatic` にしてある。Expo の既定値は `light` で prebuild すると書き戻されるため、
`app.config.ts` にも `userInterfaceStyle: 'automatic'` を明示している。

固定を外すと `Alert` やキーボードなど native が描く UI が端末設定に従うようになり、
アプリで「ライト」を選んでいても端末がダークならそこだけ黒くなる。これを防ぐため
`FxSystemColorScheme` が `Appearance.setColorScheme()` で window の外観を上書きする。

| 配色設定 | `setColorScheme()` へ渡す値 |
| ---- | ---- |
| 自動 | `'unspecified'`(上書きの解除) |
| ライト | `'light'` |
| ダーク | `'dark'` |

解除に `null` ではなく `'unspecified'` を渡すこと。react-native 側は `'unspecified'` の
ときだけ native から現在値を読み直してキャッシュを更新する実装になっている。

上書き中は window の外観がアプリの設定値そのものなので、変更イベントも
`getColorScheme()` の戻り値も端末の値としては使えない。そのため `FxSystemColorScheme` は
「自動」のときだけ `systemColorSchemeAtom` へ反映する。マウント時の読み取りも同じ条件で
弾く(StrictMode や再マウントで effect が再実行されると、既に効いている上書きの値を
読んでしまうため)。atom の初期値は上書き前(モジュール評価時)の端末の値を持っている。

「自動」へ戻すときは、上書きを解除したうえで `getColorScheme()` を読み直す。解除の前後で
実効の配色が変わらないと変更イベントが飛ばないためで、ダークを選んでいる間に端末も
ダークへ変わっていたようなケースでは、これが無いと古い値のまま追従が復帰しない。

`react-native-web` の `Appearance` は `setColorScheme` を持たない。無条件に呼ぶと web
プレビューがマウント時に落ちるので、存在を確認してから呼ぶ。

Android は `Configuration.uiMode` を読むため、この固定の影響を受けない。

## 制限事項

`GlobalToast` は元からダークな見た目(背景 `#333` に白文字)なので、配色設定の対象外。
