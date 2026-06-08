import en from '../../../assets/translations/en.json';
import ja from '../../../assets/translations/ja.json';
import { tokyoMetroConfig, tyConfig } from './config';

describe('HeaderEast config translation keys', () => {
  const configs = [
    { name: 'tokyoMetroConfig', config: tokyoMetroConfig },
    { name: 'tyConfig', config: tyConfig },
  ] as const;

  const deriveKeys = (prefix: string) => {
    const base = prefix ? 'Local' : 'local';
    return [
      `${prefix}${base}`,
      `${prefix}${base}En`,
      `${prefix}${base}Zh`,
      `${prefix}${base}Ko`,
    ];
  };

  for (const { name, config } of configs) {
    const prefix = config.trainTypeBox.localTypePrefix;
    const keys = deriveKeys(prefix);

    describe(`${name} (localTypePrefix="${prefix}")`, () => {
      it.each(keys)('ja.json contains "%s"', (key) => {
        expect(ja).toHaveProperty(key);
      });

      it.each(keys)('en.json contains "%s"', (key) => {
        expect(en).toHaveProperty(key);
      });
    });
  }
});
