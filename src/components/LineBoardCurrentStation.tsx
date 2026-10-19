import { createContext, useContext } from 'react';
import type { Station } from '~/@types/graphql';

// GPS の購読はテーマの外側にまとめ、表示駅が変わったときだけセルへ通知する。
export const LineBoardCurrentStationContext = createContext<
  Station | undefined
>(undefined);
export const useLineBoardCurrentStation = () =>
  useContext(LineBoardCurrentStationContext);
