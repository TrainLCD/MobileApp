import { useCallback, useState } from 'react'

export type SSMLElementType =
  | 'say'
  | 'voice'
  | 'break'
  | 'emphasis'
  // | 'par'
  | 'prosody'
  | 'say-as'
  // | 'seq'
  | 'sub'

type SSMLElement = {
  type: SSMLElementType
}

export type SayElement = SSMLElement & {
  type: 'say'
  value: string
}

export type VoiceElement = SSMLElement & {
  type: 'voice'
  name?: string
  language?: string
  gender?: 'male' | 'female' | 'neutral'
  value: string
}

export type BreakElement = SSMLElement & {
  type: 'break'
  time?: string
  strength?: 'x-weak' | 'weak' | 'medium' | 'strong' | 'x-strong' | 'none'
}

export type EmphasisElement = SSMLElement & {
  type: 'emphasis'
  level: 'strong' | 'moderate' | 'none' | 'reduced'
  value: string
}

export type ProsodyElement = SSMLElement & {
  type: 'prosody'
  rate?: 'x-slow' | 'slow' | 'medium' | 'fast' | 'x-fast' | 'default'
  pitch?: 'x-low' | 'low' | 'medium' | 'high' | 'x-high' | 'default'
  volume?:
    | 'silent'
    | 'x-soft'
    | 'soft'
    | 'medium'
    | 'loud'
    | 'x-loud'
    | 'default'
  value: string
}

export type SayAsElement = SSMLElement & {
  type: 'say-as'
  interpretAs?:
    | 'currency'
    | 'telephone'
    | 'verbatim'
    | 'spell-out'
    | 'date'
    | 'characters'
    | 'cardinal'
    | 'ordinal'
    | 'fraction'
    | 'expletive'
    | 'bleep'
    | 'unit'
    | 'time'
  language?: string
  format?: string
  value: string
}

export type SubElement = SSMLElement & {
  type: 'sub'
  alias: string
  value: string
}

type BufferValue =
  | SayElement
  | VoiceElement
  | BreakElement
  | EmphasisElement
  | ProsodyElement
  | SayAsElement
  | SubElement

const useSSML = () => {
  const [buffer, setBuffer] = useState<BufferValue[]>([])

  const getBuffer = useCallback(() => {
    const combinedBuffer = buffer
      .map((buf) => {
        switch (buf.type) {
          case 'say':
            return buf.value
          case 'voice':
            return `<voice language="${buf.language ?? 'ja-JP'}" gender="${
              buf.gender ?? 'neutral'
            }" name="${buf.name ?? 'ja-JP-Standard-B'}">${buf.value}</voice>`
          case 'break':
            return `<break time="${buf.time ?? '0ms'}" strength="${
              buf.strength ?? 'medium'
            }"/>`
          case 'emphasis':
            return `<emphasis level="${buf.level}">${buf.value}</emphasis>`
          case 'prosody':
            return `<prosody rate="${buf.rate ?? 'default'}" pitch="${
              buf.pitch ?? 'default'
            }" volume="${buf.volume ?? 'default'}">${buf.value}</prosody>`
          case 'say-as':
            return `<say-as interpret-as="${buf.interpretAs ?? ''}" format="${
              buf.format ?? ''
            }" language="${buf.language ?? 'ja-JP'}">${buf.value}</say-as>`
          case 'sub':
            return `<sub alias="${buf.alias ?? ''}">${buf.value}</sub>`
          default:
            return null
        }
      })
      .filter((buf) => buf !== null)
      .join('')

    return `<speak>${combinedBuffer}</speak>`
  }, [buffer])

  const addToBuffer = useCallback(
    (value: BufferValue) => setBuffer((prev) => [...prev, value]),
    []
  )

  const clearBuffer = useCallback(() => setBuffer([]), [])

  return { get: getBuffer, add: addToBuffer, clear: clearBuffer }
}

export default useSSML
