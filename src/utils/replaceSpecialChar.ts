const replaceSpecialChar = (text: string): string =>
  text?.replace(/\W/g, (m: string) => (m.match(/[!-~]|\s/) ? '' : m));

export default replaceSpecialChar;
