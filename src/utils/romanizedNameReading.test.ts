import { fixRomanizedNameReading } from './romanizedNameReading';

describe('fixRomanizedNameReading', () => {
  it.each([
    ['ja', 'jah'],
    ['ju', 'jew'],
    ['je', 'jeh'],
    ['JA JU JE', 'Jah Jew Jeh'],
    ['Jinja', 'Gee-n-jah'],
    ['Jingu', 'Gee-ngu'],
    ['Jefu', 'Jeh-fu'],
    ['Jaja', 'Jah-jah'],
    ['ji', 'gee'],
    ['jo', 'joe'],
    ['Jinbocho', 'Gee-nbocho'],
    ['Meiji-Jingumae', 'Mei-gee-Gee-ngumae'],
    ['Oji', 'O-gee'],
    ['Koenji', 'Koen-gee'],
    ['Joetsu', 'Joe-etsu'],
    ['Tojo', 'To-joe'],
    ['Jōban', 'Joe-ban'],
    ['Jo\u0304ban', 'Joe-ban'],
    ['O\u0304ji', 'Ō-gee'],
    ['JOJO', 'Joe-Joe'],
    ['Jiji', 'Gee-gee'],
    ['Ōji', 'Ō-gee'],
    ['Shinjuku', 'Shin-jew-ku'],
    ['J-O 01', 'J-O 01'],
    ['Tokyo & Osaka', 'Tokyo & Osaka'],
  ])('%s → %s', (name, expected) => {
    expect(fixRomanizedNameReading(name)).toBe(expected);
    expect(fixRomanizedNameReading(expected)).toBe(expected);
  });
});
