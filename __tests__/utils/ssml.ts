import SSMLBuilder from '../../src/utils/ssml'

describe('hooks/useSSML', () => {
  it('add say(without sugar syntax)', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.add({
      type: 'say',
      value: 'Hello World',
    })
    expect(ssmlBuilder.get()).toBe('<speak>Hello World</speak>')
  })
  it('say twice(without method-chaining)', () => {
    const ssmlBuilder = new SSMLBuilder()

    ssmlBuilder.add({
      type: 'say',
      value: 'Hello',
    })
    ssmlBuilder.add({
      type: 'say',
      value: 'World',
    })
    expect(ssmlBuilder.get()).toBe('<speak>HelloWorld</speak>')
  })
  it('voice without optional field', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.add({
      type: 'voice',
      value: 'Hello',
    })
    // FIXME: template literalを使っている関係で変なスペースが入ってしまうので応急処置でreplaceしている
    expect(ssmlBuilder.get().replace('   ', '')).toBe(
      `<speak><voice>Hello</voice></speak>`
    )
  })
  it('voice with filled optional field', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.add({
      type: 'voice',
      name: 'ja-JP-Standard-B',
      language: 'ja-JP',
      value: 'Hello',
      gender: 'male',
    })
    expect(ssmlBuilder.get()).toBe(
      `<speak><voice language="ja-JP" gender="male" name="ja-JP-Standard-B">Hello</voice></speak>`
    )
  })
  it('break without optional field', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.add({
      type: 'break',
    })
    expect(ssmlBuilder.get()).toBe(
      `<speak><break time="0ms" strength="medium"/></speak>`
    )
  })
  it('break with filled optional field', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.add({
      type: 'break',
      time: '1ms',
      strength: 'medium',
    })
    expect(ssmlBuilder.get()).toBe(
      `<speak><break time="1ms" strength="medium"/></speak>`
    )
  })
  it('emphasis', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.add({
      type: 'emphasis',
      level: 'strong',
      value: 'Hello World!',
    })
    expect(ssmlBuilder.get()).toBe(
      `<speak><emphasis level="strong">Hello World!</emphasis></speak>`
    )
  })
  it('prosody without optional field', () => {
    const ssmlBuilder = new SSMLBuilder()

    ssmlBuilder.add({
      type: 'prosody',
      value: 'Hello World!',
    })
    expect(ssmlBuilder.get()).toBe(
      `<speak><prosody rate="default" pitch="default" volume="default">Hello World!</prosody></speak>`
    )
  })
  it('prosody filled optional field', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.add({
      type: 'prosody',
      value: 'Hello World!',
      rate: 'slow',
      pitch: 'high',
      volume: 'soft',
    })
    expect(ssmlBuilder.get()).toBe(
      `<speak><prosody rate="slow" pitch="high" volume="soft">Hello World!</prosody></speak>`
    )
  })
  it('say-as filled optional field', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.add({
      type: 'say-as',
      value: 'Hello World!',
    })
    expect(ssmlBuilder.get()).toBe(
      `<speak><say-as interpret-as="" format="" language="ja-JP">Hello World!</say-as></speak>`
    )
  })
  it('say-as with optional field', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.add({
      type: 'say-as',
      value: 'Hello World!',
      interpretAs: 'currency',
      format: 'yyyymmdd',
      language: 'en-US',
    })
    expect(ssmlBuilder.get()).toBe(
      `<speak><say-as interpret-as="currency" format="yyyymmdd" language="en-US">Hello World!</say-as></speak>`
    )
  })
  it('sub', () => {
    const ssmlBuilder = new SSMLBuilder()

    ssmlBuilder.add({
      type: 'sub',
      alias: 'にっぽんばし',
      value: '日本橋',
    })

    expect(ssmlBuilder.get()).toBe(
      `<speak><sub alias="にっぽんばし">日本橋</sub></speak>`
    )
  })
  it('addSay(sugar syntax)', () => {
    const ssmlBuilder = new SSMLBuilder()

    ssmlBuilder.addSay('Hello addSay World!')

    expect(ssmlBuilder.get()).toBe(`<speak>Hello addSay World!</speak>`)
  })
  it('addBreak(sugar syntax)', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.addBreak('1ms', 'medium')
    expect(ssmlBuilder.get()).toBe(
      `<speak><break time="1ms" strength="medium"/></speak>`
    )
  })
  it('addSay with addBreak(method chaining)', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder.addSay('Hello,').addBreak('1ms', 'medium').addSay('Dolly!')
    expect(ssmlBuilder.get()).toBe(
      `<speak>Hello,<break time="1ms" strength="medium"/>Dolly!</speak>`
    )
  })
  it('clear', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder
      .addSay('Hello!')
      .addBreak('1ms', 'medium')
      .addSay('We will be purged!')
    ssmlBuilder.clear()
    expect(ssmlBuilder.get()).toBe(`<speak></speak>`)
  })
  it('getClear', () => {
    const ssmlBuilder = new SSMLBuilder()
    ssmlBuilder
      .addSay('Hello!')
      .addBreak('1ms', 'medium')
      .addSay('We will be purged!')
    const ssml = ssmlBuilder.getClear()
    expect(ssml).toBe(
      '<speak>Hello!<break time="1ms" strength="medium"/>We will be purged!</speak>'
    )
    expect(ssmlBuilder.get()).toBe(`<speak></speak>`)
  })
})
