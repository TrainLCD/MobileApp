export const removeMacron = (str: string): string => {
  return str
    .replace(/[ŌŪ]/g, (match) => {
      return match.replace('Ō', 'O').replace('Ū', 'U');
    })
    .replace(/[ōū]/g, (match) => {
      return match.replace('ō', 'o').replace('ū', 'u');
    });
};
