import { fixRomanizedNameReading } from './romanizedNameReading';

describe('fixRomanizedNameReading', () => {
  it.each([
    ['ji', 'gee'],
    ['jo', 'joe'],
    ['Jinbocho', 'Gee-nbocho'],
    ['Meiji-Jingumae', 'Mei-gee-Gee-ngumae'],
    ['Oji', 'O-gee'],
    ['Koenji', 'Koen-gee'],
    ['Joetsu', 'Joe-etsu'],
    ['Tojo', 'To-joe'],
    ['Jōban', 'Joe-ban'],
    ['JOJO', 'Joe-Joe'],
    ['Jiji', 'Gee-gee'],
    ['Ōji', 'Ō-gee'],
    ['Shinjuku', 'Shinjuku'],
    ['J-O 01', 'J-O 01'],
    ['Tokyo & Osaka', 'Tokyo & Osaka'],
  ])('%s → %s', (name, expected) => {
    expect(fixRomanizedNameReading(name)).toBe(expected);
    expect(fixRomanizedNameReading(expected)).toBe(expected);
  });
});
