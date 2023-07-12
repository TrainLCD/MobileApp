export type Config = {
  production_grpc_url?: string
  staging_grpc_url?: string
}

export const ConfigTypeMap: Record<keyof Config, 'string'> = {
  production_grpc_url: 'string',
  staging_grpc_url: 'string',
}
