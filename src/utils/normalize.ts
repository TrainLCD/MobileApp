export const normalizeRomanText = (str: string): string => {
  const isAllCaps = str
    .slice(1)
    .split('')
    .every((s) => /[A-Z]/.test(s))
  if (isAllCaps) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  return str
}
