import { createStore } from 'jotai';
import reportModalVisibleAtom from './reportModal';

describe('reportModalVisibleAtom', () => {
  it('初期値がfalseである', () => {
    const store = createStore();
    expect(store.get(reportModalVisibleAtom)).toBe(false);
  });

  it('trueに設定できる', () => {
    const store = createStore();
    store.set(reportModalVisibleAtom, true);
    expect(store.get(reportModalVisibleAtom)).toBe(true);
  });

  it('falseに戻すことができる', () => {
    const store = createStore();
    store.set(reportModalVisibleAtom, true);
    store.set(reportModalVisibleAtom, false);
    expect(store.get(reportModalVisibleAtom)).toBe(false);
  });
});
