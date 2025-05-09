const getStringBytes = (str: string): number =>
  encodeURIComponent(str).replace(/%../g, 'x').length;

export default getStringBytes;
