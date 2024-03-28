export const normalizeRomanText = (str: string): string => {
  const isAllCaps = str
    .slice(1)
    .split('')
    .filter((s) => s !== '-' && s !== ' ')
    .every((s) => /[A-Z]/.test(s))
  if (isAllCaps) {
    return (
      str.charAt(0).toUpperCase() +
      str.slice(1).toLowerCase().replaceAll('-', '')
    )
  }

  return str.replace('JR', 'J-R')
}
