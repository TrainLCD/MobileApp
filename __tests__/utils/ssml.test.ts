import { SSMLBuilder } from '~/utils/ssml';

describe('utils/ssml.ts', () => {
  it('Should be wrapped by <speak>', () => {
    const builder = new SSMLBuilder();
    expect(builder.ssml()).toBe('<speak></speak>');
  });
  it('Should be includes sentence in <speak>', () => {
    const builder = new SSMLBuilder();
    builder.add('foo');
    builder.add('bar');
    expect(builder.ssml()).toBe('<speak>foo bar</speak>');
  });
  it('Should not be added extra space for tail of sentence', () => {
    const builder = new SSMLBuilder(false);
    builder.add('foo');
    builder.add('bar');
    expect(builder.ssml()).toBe('<speak>foobar</speak>');
  });
  it('Should not be added spaces for sentences by default', () => {
    const builder = new SSMLBuilder(false);
    builder.add('foo');
    builder.add('bar');
    expect(builder.ssml()).toBe('<speak>foobar</speak>');
  });
  it('Should be added a sentence with provided element type and that single attribute', () => {
    const builder = new SSMLBuilder();
    builder.add('東京', 'sub', [{ alias: 'とうきょう' }]);
    expect(builder.ssml()).toBe(
      '<speak><sub alias="とうきょう">東京</sub></speak>'
    );
  });
  it('Should be added a sentence with provided element type and that multiple attributes', () => {
    const builder = new SSMLBuilder();
    builder.add('東京', 'phoneme', [{ alphabet: 'ipa', ph: 'to̞ːkʲo̞ː' }]);
    expect(builder.ssml()).toBe(
      '<speak><phoneme alphabet="ipa" ph="to̞ːkʲo̞ː">東京</phoneme></speak>'
    );
  });
  it('Should can be used with method chain', () => {
    const enBuilder = new SSMLBuilder();
    enBuilder.add('The next stop is').add('Tokyo');
    expect(enBuilder.ssml()).toBe('<speak>The next stop is Tokyo</speak>');
    const jaBuilder = new SSMLBuilder(false);
    jaBuilder.add('次は').add('東京です');
    expect(jaBuilder.ssml()).toBe('<speak>次は東京です</speak>');
  });
  it('Should be cleared ', () => {
    const enBuilder = new SSMLBuilder();
    enBuilder.add('The next stop is').add('Tokyo');
    enBuilder.clear();
    expect(enBuilder.ssml()).toBe('<speak></speak>');
    const jaBuilder = new SSMLBuilder(false);
    jaBuilder.add('次は').add('東京です');
    jaBuilder.clear();
    expect(jaBuilder.ssml()).toBe('<speak></speak>');
  });
});
