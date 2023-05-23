/**
 * string値の先頭に#がついていればそのまま返し、ついていなければ#をつけて返す
 * 今後APIから渡ってくるデータはすべて#がついているHEXになる予定なので、API切り替えが終了したらこの関数も不要になるはず
 */
const prependHEX = (value: string): string => {
  if (value.startsWith('#')) {
    return value;
  }
  return `#${value}`;
};

export default prependHEX;
