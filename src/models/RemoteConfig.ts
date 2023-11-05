/**
 * @deprecated Hooksに一元化する必要がないと思うので廃止予定
 */
export type Config = {
  REPORT_LETTERS_LOWER_LIMIT?: number
  MAXIMUM_DAILY_FEEDBACK_COUNT?: number
}

/**
 * @deprecated Hooksに一元化する必要がないと思うので廃止予定
 */
export const ConfigTypeMap: Record<keyof Config, 'string' | 'number'> = {
  REPORT_LETTERS_LOWER_LIMIT: 'number',
  MAXIMUM_DAILY_FEEDBACK_COUNT: 'number',
}
