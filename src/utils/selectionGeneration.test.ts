import { beginSelection, isLatestSelection } from './selectionGeneration';

describe('selectionGeneration', () => {
  it('最後に開始した選択だけが最新になる', () => {
    const first = beginSelection();
    expect(isLatestSelection(first)).toBe(true);

    const second = beginSelection();
    expect(isLatestSelection(first)).toBe(false);
    expect(isLatestSelection(second)).toBe(true);
  });

  it('世代は呼び出しごとに進む', () => {
    const a = beginSelection();
    const b = beginSelection();
    expect(b).toBeGreaterThan(a);
  });
});
