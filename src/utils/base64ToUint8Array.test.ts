import { base64ToUint8Array } from './base64ToUint8Array';

describe('base64ToUint8Array', () => {
  it('既知文字列をデコードできる', () => {
    // "Hello" = SGVsbG8=
    const result = base64ToUint8Array('SGVsbG8=');
    expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it('パディングなしの文字列をデコードできる', () => {
    // "abc" = YWJj (no padding)
    const result = base64ToUint8Array('YWJj');
    expect(result).toEqual(new Uint8Array([97, 98, 99]));
  });

  it('パディング1つの文字列をデコードできる', () => {
    // "ab" = YWI=
    const result = base64ToUint8Array('YWI=');
    expect(result).toEqual(new Uint8Array([97, 98]));
  });

  it('パディング2つの文字列をデコードできる', () => {
    // "a" = YQ==
    const result = base64ToUint8Array('YQ==');
    expect(result).toEqual(new Uint8Array([97]));
  });

  it('空文字列を渡すと空のUint8Arrayを返す', () => {
    const result = base64ToUint8Array('');
    expect(result).toEqual(new Uint8Array(0));
  });

  it('改行やスペースを含むbase64をデコードできる', () => {
    const result = base64ToUint8Array('SGVs\nbG8=');
    expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it('単一バイト QQ== をデコードできる', () => {
    // "A" = QQ==
    const result = base64ToUint8Array('QQ==');
    expect(result).toEqual(new Uint8Array([65]));
  });
});
