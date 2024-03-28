type SSMLElementType = 'sub' | 'phoneme' | 'say-as'

export class SSMLBuilder {
  private addSpaceByDefault = true
  private elms: string[] = []

  constructor(addSpaceByDefault = true) {
    this.addSpaceByDefault = addSpaceByDefault
  }

  public add(
    value: string,
    type?: SSMLElementType,
    attrs: Record<string, string>[] = []
  ): SSMLBuilder {
    if (!type) {
      this.elms.push(value)
      return this
    }

    const parsedAttrs = attrs.map((attr) =>
      Object.entries(attr)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ')
    )

    this.elms.push(`<${type}${parsedAttrs.length ? ' ' : ''}${parsedAttrs}>`)
    this.elms.push(value)
    this.elms.push(`</${type}>`)
    return this
  }

  public clear(): SSMLBuilder {
    this.elms = []
    return this
  }

  public ssml(): string {
    const joinedElements = this.elms
      .join(this.addSpaceByDefault ? ' ' : '')
      .replace(/\s<\//g, '</') // タグ終了直前のスペースを消す
      .replace(/>\s/g, '>') // タグ開始直後のスペースを消す
      .replace(/\s\./g, '.') // ピリオドの前のスペースは不要
      .trim()
    return `<speak>${joinedElements}</speak>`
  }
}
