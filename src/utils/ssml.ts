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
  | 'lang'

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

export type LangElement = SSMLElement & {
  type: 'lang'
  lang: string
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
  | LangElement

export default class SSMLBuilder {
  buffer: BufferValue[] = []

  get() {
    const combinedBuffer = this.buffer
      .map((buf) => {
        switch (buf.type) {
          case 'say':
            return buf.value
          case 'voice':
            return `<voice ${
              buf.language ? `language="${buf.language}"` : ''
            } ${buf.gender ? `gender="${buf.gender}"` : ''} ${
              buf.name ? `name="${buf.name}"` : ''
            }>${buf.value}</voice>`
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
          case 'lang':
            return `<lang ${buf.lang ? `lang="${buf.lang}"` : ''}">${
              buf.value
            }</sub>`
          default:
            return null
        }
      })
      .filter((buf) => buf !== null)
      .join('')

    return `<speak>${combinedBuffer}</speak>`
  }

  add(value: BufferValue) {
    this.buffer = [...this.buffer, value]
    return this
  }

  addSay(value: string | undefined | null) {
    if (!value) {
      return this
    }

    this.buffer = [
      ...this.buffer,
      {
        type: 'say',
        value,
      },
    ]
    return this
  }

  addSub(alias: string | undefined | null, value: string | undefined | null) {
    if (!value || !alias) {
      return this
    }

    this.buffer = [
      ...this.buffer,
      {
        type: 'sub',
        alias,
        value,
      },
    ]
    return this
  }

  addBreak(
    time: string,
    strength?: 'x-weak' | 'weak' | 'medium' | 'strong' | 'x-strong' | 'none'
  ) {
    this.buffer = [...this.buffer, { type: 'break', time, strength }]
    return this
  }

  clear() {
    this.buffer = []
  }

  getClear() {
    const ssml = this.get()
    this.clear()
    return ssml
  }
}
