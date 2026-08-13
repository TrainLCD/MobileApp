import { base64ToUint8Array } from './base64ToUint8Array';

describe('base64ToUint8Array', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('パディング無しで長さが4の倍数でない入力も復号できる', () => {
    // 非整数長を new Uint8Array へ渡すと RangeError で落ちるため
    expect(Array.from(base64ToUint8Array('QQ'))).toEqual([0x41]);
    expect(Array.from(base64ToUint8Array('YWI'))).toEqual([0x61, 0x62]);
    expect(Array.from(base64ToUint8Array('YWJj'))).toEqual([0x61, 0x62, 0x63]);
  });

  it('パディングの有無で同じ結果になる', () => {
    expect(Array.from(base64ToUint8Array('QQ'))).toEqual(
      Array.from(base64ToUint8Array('QQ=='))
    );
    expect(Array.from(base64ToUint8Array('YWI'))).toEqual(
      Array.from(base64ToUint8Array('YWI='))
    );
  });
});
