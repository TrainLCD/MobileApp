import { createStore } from 'jotai';

// React外部からatomにアクセスするためのstoreインスタンス
// TaskManagerなどのコールバックから状態を更新する際に使用
export const store = createStore();
