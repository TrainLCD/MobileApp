const DEADLINE_SECONDS = 30

const date = new Date()
date.setSeconds(date.getSeconds() + DEADLINE_SECONDS)
export const deadline = date.getTime().toString()
