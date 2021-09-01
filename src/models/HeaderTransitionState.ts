export type HeaderTransitionState =
  | 'CURRENT'
  | 'CURRENT_KANA'
  | 'CURRENT_EN'
  | 'CURRENT_ZH'
  | 'CURRENT_KO'
  | 'ARRIVING'
  | 'ARRIVING_KANA'
  | 'ARRIVING_EN'
  | 'ARRIVING_ZH'
  | 'ARRIVING_KO'
  | 'NEXT'
  | 'NEXT_KANA'
  | 'NEXT_EN'
  | 'NEXT_ZH'
  | 'NEXT_KO';

export type HeaderLangState = '' | 'KANA' | 'EN' | 'ZH' | 'KO';
