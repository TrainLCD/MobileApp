export type Config = {
  report_letters_lower_limit?: number
}

export const ConfigTypeMap: Record<keyof Config, 'string' | 'number'> = {
  report_letters_lower_limit: 'number',
}
