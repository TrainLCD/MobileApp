export type FlattenObject<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object ? FlattenObject<T[K]> : T[K]
    }[keyof T]
  : T
