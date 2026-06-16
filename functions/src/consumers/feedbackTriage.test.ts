import { coerceReport, looksLikeSpam } from './feedbackTriage';

describe('coerceReport', () => {
  it('returns defaults when category and triageLevel are missing', () => {
    const r = coerceReport({ title: 'タイトル', summary: 'サマリ' });
    expect(r.category).toBe('question');
    expect(r.triageLevel).toBe('medium');
  });

  it('maps canonical category and triageLevel values', () => {
    const r = coerceReport({
      title: 't',
      summary: 's',
      category: 'bug',
      triageLevel: 'urgent',
    });
    expect(r.category).toBe('bug');
    expect(r.triageLevel).toBe('urgent');
  });

  it('maps synonyms to canonical values', () => {
    const r = coerceReport({
      title: 't',
      summary: 's',
      category: 'feature',
      triageLevel: 'critical',
    });
    expect(r.category).toBe('feature_request');
    expect(r.triageLevel).toBe('urgent');
  });

  it('normalizes case, whitespace, and hyphens', () => {
    const r = coerceReport({
      title: 't',
      summary: 's',
      category: '  Feature-Request  ',
      triageLevel: '  P0  ',
    });
    expect(r.category).toBe('feature_request');
    expect(r.triageLevel).toBe('urgent');
  });

  it('maps P-level triage aliases', () => {
    expect(
      coerceReport({ category: 'bug', triageLevel: 'P1' }).triageLevel
    ).toBe('high');
    expect(
      coerceReport({ category: 'bug', triageLevel: 'p2' }).triageLevel
    ).toBe('medium');
    expect(
      coerceReport({ category: 'bug', triageLevel: 'P3' }).triageLevel
    ).toBe('low');
  });

  it('falls back to defaults for unknown values', () => {
    const r = coerceReport({
      title: 't',
      summary: 's',
      category: 'nonsense',
      triageLevel: 'whatever',
    });
    expect(r.category).toBe('question');
    expect(r.triageLevel).toBe('medium');
  });

  it('accepts case-insensitive key names from model output', () => {
    const r = coerceReport({
      Title: 't',
      Summary: 's',
      Category: 'Improvement',
      TriageLevel: 'HIGH',
    });
    expect(r.category).toBe('improvement');
    expect(r.triageLevel).toBe('high');
  });

  it('still parses existing fields (title truncation, labels, confidence, reason)', () => {
    const longTitle = 'あ'.repeat(100);
    const r = coerceReport({
      title: longTitle,
      summary: 's',
      labels: ['ui', 'performance', 42],
      confidence: 0.8,
      reason: 'because',
    });
    expect(r.title.length).toBeLessThanOrEqual(72);
    expect(r.labels).toEqual(['ui', 'performance']);
    expect(r.confidence).toBe(0.8);
    expect(r.reason).toBe('because');
  });

  it('falls back to the title when summary is empty', () => {
    const r = coerceReport({ title: 'タイトルだけ', summary: '' });
    expect(r.summary).toBe('タイトルだけ');
  });

  it('falls back to the default title when both title and summary are empty', () => {
    const r = coerceReport({});
    expect(r.title).toBe('要約未取得');
    expect(r.summary).toBe('要約未取得');
  });

  it('supports question and improvement synonyms', () => {
    expect(coerceReport({ category: 'help' }).category).toBe('question');
    expect(coerceReport({ category: 'enhancement' }).category).toBe(
      'improvement'
    );
  });
});

describe('looksLikeSpam', () => {
  it('treats actionable feedback as not spam', () => {
    expect(looksLikeSpam('表示がおかしいので修正してほしい')).toBe(false);
  });

  it('flags announcement-style transcripts as spam', () => {
    expect(
      looksLikeSpam(
        '次は東京、東京です。お乗り換えのご案内をいたします。停車駅は品川方面'
      )
    ).toBe(true);
  });
});
