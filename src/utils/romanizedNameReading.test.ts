import { fixRomanizedNameReading } from './romanizedNameReading';

describe('fixRomanizedNameReading', () => {
  it.each([
    ['ja', 'jah'],
    ['ju', 'jew'],
    ['je', 'jeh'],
    ['JA JU JE', 'Jah Jew Jeh'],
    ['Mejiro', 'Megeero'],
    ['Higashi-Mejiro', 'Higashi-Megeero'],
    ['Jinja', 'Geen-jah'],
    ['Jingu', 'Geengu'],
    ['Jefu', 'Jeh-fu'],
    ['Jaja', 'Jah-jah'],
    ['ji', 'gee'],
    ['jo', 'joe'],
    ['Jinbocho', 'Geenbocho'],
    ['Meiji-Jingumae', 'Meigee-Geengumae'],
    ['Oji', 'Ogee'],
    ['Koenji', 'Koengee'],
    ['Joetsu', 'Joe-etsu'],
    ['Tojo', 'To-joe'],
    ['Jōban', 'Joe-ban'],
    ['Jo\u0304ban', 'Joe-ban'],
    ['O\u0304ji', 'Ōgee'],
    ['JOJO', 'Joe-Joe'],
    ['Jiji', 'Geegee'],
    ['Ōji', 'Ōgee'],
    ['Shinjuku', 'Shin-jew-ku'],
    ['J-O 01', 'J-O 01'],
    ['Tokyo & Osaka', 'Tokyo & Osaka'],
  ])('%s → %s', (name, expected) => {
    expect(fixRomanizedNameReading(name)).toBe(expected);
    expect(fixRomanizedNameReading(expected)).toBe(expected);
  });
});
