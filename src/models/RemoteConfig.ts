export type Config = {
  REPORT_LETTERS_LOWER_LIMIT?: number
  MAXIMUM_DAILY_FEEDBACK_COUNT?: number
}

export const ConfigTypeMap: Record<keyof Config, 'string' | 'number'> = {
  REPORT_LETTERS_LOWER_LIMIT: 'number',
  MAXIMUM_DAILY_FEEDBACK_COUNT: 'number',
}
