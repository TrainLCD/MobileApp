import { createStore } from 'jotai/vanilla';

// React外部からatomにアクセスするためのstoreインスタンス
// TaskManagerなどのコールバックから状態を更新する際に使用
export const store = createStore();
