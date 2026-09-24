import { APP_THEME } from '~/models/Theme';
import { EN_TEMPLATES, JA_TEMPLATES } from './templates';

describe('TTSテンプレート', () => {
  it('E131系風は埼京線風と同じ日本語テンプレートを使う', () => {
    expect(JA_TEMPLATES[APP_THEME.E131]).toBe(JA_TEMPLATES[APP_THEME.SAIKYO]);
  });

  it('E131系風は埼京線風と同じ英語テンプレートを使う', () => {
    expect(EN_TEMPLATES[APP_THEME.E131]).toBe(EN_TEMPLATES[APP_THEME.SAIKYO]);
  });
});
