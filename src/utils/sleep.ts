export const sleep = (timeInMilliseconds: number) => {
  return new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), timeInMilliseconds)
  })
}
