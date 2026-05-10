import { compile } from './templateEngine';

describe('templateEngine', () => {
  describe('variable substitution', () => {
    test('inserts string variables', () => {
      const render = compile('Hello, {name}!');
      expect(render({ name: 'World' })).toBe('Hello, World!');
    });

    test('inserts multiple variables', () => {
      const render = compile('{greeting}, {name}!');
      expect(render({ greeting: 'Hi', name: 'Bob' })).toBe('Hi, Bob!');
    });

    test('treats null/undefined/false as empty', () => {
      const render = compile('[{a}][{b}][{c}]');
      expect(render({ a: null, b: undefined, c: false })).toBe('[][][]');
    });

    test('inserts numbers', () => {
      const render = compile('count={n}');
      expect(render({ n: 42 })).toBe('count=42');
    });

    test('preserves curly braces that are not valid placeholders', () => {
      const render = compile('a{ b }c');
      expect(render({})).toBe('a{ b }c');
    });

    test('preserves SSML tags verbatim', () => {
      const render = compile('hello<break time="200ms"/>{name}');
      expect(render({ name: 'X' })).toBe('hello<break time="200ms"/>X');
    });
  });

  describe('if blocks', () => {
    test('renders then-branch when truthy', () => {
      const render = compile('A{#if flag}B{/if}C');
      expect(render({ flag: true })).toBe('ABC');
    });

    test('omits then-branch when falsy', () => {
      const render = compile('A{#if flag}B{/if}C');
      expect(render({ flag: false })).toBe('AC');
    });

    test('treats empty string as falsy', () => {
      const render = compile('A{#if x}Y{/if}B');
      expect(render({ x: '' })).toBe('AB');
    });

    test('treats non-empty string as truthy', () => {
      const render = compile('A{#if x}Y{/if}B');
      expect(render({ x: 'hi' })).toBe('AYB');
    });

    test('treats 0 as falsy and non-zero number as truthy', () => {
      const render = compile('{#if n}yes{/if}');
      expect(render({ n: 0 })).toBe('');
      expect(render({ n: 1 })).toBe('yes');
    });

    test('renders else-branch when falsy', () => {
      const render = compile('{#if flag}T{:else}F{/if}');
      expect(render({ flag: true })).toBe('T');
      expect(render({ flag: false })).toBe('F');
    });

    test('supports variables inside if blocks', () => {
      const render = compile('{#if has}value={v}{/if}');
      expect(render({ has: true, v: 'hello' })).toBe('value=hello');
      expect(render({ has: false, v: 'hello' })).toBe('');
    });

    test('supports nested if blocks', () => {
      const render = compile('{#if a}A{#if b}B{/if}C{/if}');
      expect(render({ a: true, b: true })).toBe('ABC');
      expect(render({ a: true, b: false })).toBe('AC');
      expect(render({ a: false, b: true })).toBe('');
    });

    test('supports nested if/else', () => {
      const render = compile(
        '{#if a}{#if b}AB{:else}A_{/if}{:else}{#if b}_B{:else}__{/if}{/if}'
      );
      expect(render({ a: true, b: true })).toBe('AB');
      expect(render({ a: true, b: false })).toBe('A_');
      expect(render({ a: false, b: true })).toBe('_B');
      expect(render({ a: false, b: false })).toBe('__');
    });
  });

  describe('whitespace preservation', () => {
    test('keeps leading/trailing whitespace verbatim', () => {
      const render = compile('  A  {x}  B  ');
      expect(render({ x: 'X' })).toBe('  A  X  B  ');
    });

    test('preserves spaces around omitted if blocks', () => {
      const render = compile('A {#if f}B {/if}C');
      expect(render({ f: false })).toBe('A C');
    });
  });

  describe('errors', () => {
    test('throws on unclosed if', () => {
      expect(() => compile('A{#if x}B')).toThrow(/Unclosed/);
    });

    test('throws on stray else', () => {
      expect(() => compile('A{:else}B')).toThrow(/:else/);
    });

    test('throws on stray endif', () => {
      expect(() => compile('A{/if}B')).toThrow(/\/if/);
    });
  });
});
