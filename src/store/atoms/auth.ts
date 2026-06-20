import { atom } from 'jotai';

// Firebase 匿名認証の代替。端末ごとの安定 ID（installId）を uid として持つ最小ユーザー。
export type AppUser = {
  uid: string;
};

export type AuthState = {
  user: AppUser | null;
};

const authState = atom<AuthState>({
  user: null,
});

export default authState;
