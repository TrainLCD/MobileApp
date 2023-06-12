import { LineSymbolImage } from '../lineSymbolImage'

export type LineMark = LineSymbolImage & {
  signShape?: string
  sign?: string
  signPath?: number
  subSign?: string
  subSignShape?: string
  subSignPath?: number
  extraSign?: string
  extraSignShape?: string
  extraSignPath?: number
  jrUnionSigns?: string[]
  jrUnionSignPaths?: number[]
  btUnionSigns?: string[]
  btUnionSignPaths?: number[]
}
