const replaceSpecialChar = (text: string): string =>
  text?.replace(/\W/g, (m: string) => (m.match(/[!-~]/) ? '' : m));

export default replaceSpecialChar;
