export type Config = {
  station_api_url?: string
  dev_mode_station_api_url?: string
}

export const ConfigTypeMap: Record<keyof Config, 'string'> = {
  station_api_url: 'string',
  dev_mode_station_api_url: 'string',
}
