const DEADLINE_SECONDS = 30

export const getDeadline = () => {
  const date = new Date()
  date.setSeconds(date.getSeconds() + DEADLINE_SECONDS)
  return date.getTime().toString()
}
