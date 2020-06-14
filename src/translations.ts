interface Translation {
  nowStoppingAt: string;
  nowStoppingAtEn: string;
  selectLineTitle: string;
  settingsTitle: string;
  startStationTitle: string;
  selectBoundTitle: string;
  couldNotGetLocation: string;
  badAccuracy: string;
  arrivingAt: string;
  arrivingAtEn: string;
  next: string;
  nextKana: string;
  nextEn: string;
  jyShinjuku: string;
  jyShibuya: string;
  jyIkebukuro: string;
  jyUeno: string;
  jyTokyo: string;
  jyShinagawa: string;
  tapToClose: string;
  inbound: string;
  outbound: string;
  transfer: string;
  shakeToOpenMenu: string;
  back: string;
  cancel: string;
  firstAlertTitle: string;
  firstAlertText: string;
  subwayAlertTitle: string;
  subwayAlertText: string;
  oKyobashi: string;
  oOsaka: string;
  oNishikujo: string;
  oShinimamiya: string;
  selectThemeTitle: string;
  tokyoMetroLike: string;
  yamanoteLineLike: string;
  osakaLoopLineLike: string;
  searchByStationNamePlaceholder: string;
  search: string;
}

const translations: { ja: Translation; en: Translation } = {
  ja: {
    nowStoppingAt: 'ただいま',
    nowStoppingAtEn: 'Now stopping at',
    selectLineTitle: '路線を選択してください',
    settingsTitle: '設定',
    startStationTitle: '駅を指定',
    selectBoundTitle: '方面を選択してください',
    couldNotGetLocation:
      '位置情報を取得できませんでした。位置情報許可設定をご確認ください。',
    badAccuracy:
      '位置情報に誤差が一定以上あるため、正常に動作しない可能性があります。',
    arrivingAt: 'まもなく',
    arrivingAtEn: 'Arriving at',
    next: '次は',
    nextKana: 'つぎは',
    nextEn: 'Next stop is',
    jyShinjuku: '新宿',
    jyShibuya: '渋谷',
    jyIkebukuro: '池袋',
    jyUeno: '上野',
    jyTokyo: '東京',
    jyShinagawa: '品川',
    tapToClose: 'タップで消せます',
    inbound: '内回り',
    outbound: '外回り',
    transfer: 'のりかえ',
    shakeToOpenMenu: '画面長押しでメニューを開けます。',
    back: '戻る',
    cancel: 'キャンセル',
    firstAlertTitle: 'はじめに',
    firstAlertText:
      'このアプリは鉄道会社様公式のアプリではありません。実際の駅・車内の案内に従ってご利用ください。',
    subwayAlertTitle: '動作保証外',
    subwayAlertText:
      '地下鉄線内は電波が入りづらいため、動作保証外となります。ご注意ください。',
    oKyobashi: '京橋',
    oOsaka: '大阪',
    oNishikujo: '西九条',
    oShinimamiya: '新今宮',
    selectThemeTitle: 'テーマ',
    tokyoMetroLike: '東京メトロ風',
    yamanoteLineLike: '山手線風',
    osakaLoopLineLike: '大阪環状線風',
    searchByStationNamePlaceholder: '駅名を入力してください',
    search: '検索',
  },
  en: {
    nowStoppingAt: 'Now stopping at',
    nowStoppingAtEn: 'Now stopping at',
    selectLineTitle: 'Please select a line',
    settingsTitle: 'Settings',
    startStationTitle: 'Fake initial station',
    selectBoundTitle: 'Please select direction',
    couldNotGetLocation:
      'Could not get location information. Check the location information permission setting.',
    badAccuracy:
      'It may not work properly because there is a certain amount of error in the location information.',
    arrivingAt: 'Arriving at',
    arrivingAtEn: 'Arriving at',
    next: 'Next stop is',
    nextKana: 'Next stop is',
    nextEn: 'Next stop is',
    jyShinjuku: 'Shinjuku',
    jyShibuya: 'Shibuya',
    jyIkebukuro: 'Ikebukuro',
    jyUeno: 'Ueno',
    jyTokyo: 'Tokyo',
    jyShinagawa: 'Shinagawa',
    tapToClose: 'Tap to close',
    inbound: 'Inbound',
    outbound: 'Outbound',
    transfer: 'Transfer',
    shakeToOpenMenu: 'Press and hold to open the menu.',
    back: 'Back',
    cancel: 'Cancel',
    firstAlertTitle: 'Notice',
    firstAlertText:
      'This app is not a railway company official app. Please use according to the guidance of the actual station and inside the car.',
    subwayAlertTitle: 'Out of operation guarantee',
    subwayAlertText:
      'Operation is not guaranteed because it is difficult for radio waves to enter the subway line. Please be careful.',
    oKyobashi: 'Kyobashi',
    oOsaka: 'Osaka',
    oNishikujo: 'Nishikujo',
    oShinimamiya: 'Shin-Imamiya',
    selectThemeTitle: 'Themes',
    tokyoMetroLike: 'Tokyo Metro',
    yamanoteLineLike: 'Yamanote Line',
    osakaLoopLineLike: 'Osaka Loop Line',
    searchByStationNamePlaceholder: 'Please enter the station name',
    search: 'Search',
  },
};

export default translations;
