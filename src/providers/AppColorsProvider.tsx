import { useAtomValue } from 'jotai';
import type React from 'react';
import { createContext, useContext } from 'react';
import { type AppColors, LIGHT_APP_COLORS } from '~/constants/colorScheme';
import { appColorsAtom } from '~/store/atoms/colorScheme';

/**
 * 既定値をライトの配色にしているのが要点。
 * Provider の外側で描画されるもの(走行画面とその配下)は端末やユーザー設定に
 * かかわらず常に従来と同じ色を受け取るため、ダークモードの影響が及ばない。
 */
const AppColorsContext = createContext<AppColors>(LIGHT_APP_COLORS);

type Props = {
  children: React.ReactNode;
};

/** 操作系画面の配下だけをダークモードの対象にする Provider */
export const AppColorsProvider: React.FC<Props> = ({ children }: Props) => {
  const colors = useAtomValue(appColorsAtom);

  return (
    <AppColorsContext.Provider value={colors}>
      {children}
    </AppColorsContext.Provider>
  );
};

export const useAppColors = (): AppColors => useContext(AppColorsContext);
