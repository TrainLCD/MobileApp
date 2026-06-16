import {
  buildFailedReport,
  coerceReport,
  extractReportJson,
  looksLikeSpam,
  TRIAGE_FAILED_SUMMARY,
} from './feedbackTriage';

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

describe('extractReportJson', () => {
  it('parses a single clean JSON object', () => {
    const r = extractReportJson('{"title":"t","isSpam":false}') as Record<
      string,
      unknown
    >;
    expect(r.title).toBe('t');
  });

  it('returns only the first balanced object when the model echoes extras', () => {
    // 小型モデルが few-shot を真似て複数オブジェクト/プロンプトを続けて吐くケース
    const text =
      '{"title":"first","isSpam":false}\nInput: ...\nOutput:\n{"title":"second"}';
    const r = extractReportJson(text) as Record<string, unknown>;
    expect(r.title).toBe('first');
  });

  it('strips code fences', () => {
    const r = extractReportJson(
      '```json\n{"title":"fenced","isSpam":true}\n```'
    ) as Record<string, unknown>;
    expect(r.title).toBe('fenced');
  });

  it('repairs a trailing comma', () => {
    const r = extractReportJson('{"title":"t","labels":["a","b"],}') as Record<
      string,
      unknown
    >;
    expect(r.title).toBe('t');
  });

  it('ignores braces inside string values', () => {
    const r = extractReportJson('{"title":"a } b","isSpam":false}') as Record<
      string,
      unknown
    >;
    expect(r.title).toBe('a } b');
  });

  it('returns null when output is truncated before the closing brace', () => {
    expect(extractReportJson('{"title":"t","summary":"途中で')).toBeNull();
  });

  it('returns null when there is no JSON object', () => {
    expect(extractReportJson('ごめんなさい、出力できません')).toBeNull();
    expect(extractReportJson('')).toBeNull();
  });
});

describe('buildFailedReport', () => {
  it('preserves the feedback as a marker instead of dropping it', () => {
    const r = buildFailedReport('音が鳴らないので直してほしいです');
    expect(r.summary).toBe(TRIAGE_FAILED_SUMMARY);
    expect(r.isSpam).toBe(false);
    expect(r.title.startsWith('要約失敗: ')).toBe(true);
    expect(r.title).toContain('音が鳴らない');
  });

  it('truncates the title to the max length', () => {
    const r = buildFailedReport('あ'.repeat(200), 72);
    expect(r.title.length).toBeLessThanOrEqual(72);
  });

  it('handles empty description', () => {
    const r = buildFailedReport('');
    expect(r.title).toBe('要約失敗: （本文なし）');
    expect(r.summary).toBe(TRIAGE_FAILED_SUMMARY);
  });
});
