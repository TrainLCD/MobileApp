import { act, renderHook } from '@testing-library/react-hooks'
import useSSML from '../../src/hooks/useSSML'

describe('hooks/useSSML', () => {
  it('single say', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'say',
        value: 'Hello World',
      })
    })
    expect(result.current.get()).toBe('<speak>Hello World</speak>')
  })
  it('double say', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'say',
        value: 'Hello',
      })
      result.current.add({
        type: 'say',
        value: 'World',
      })
    })
    expect(result.current.get()).toBe('<speak>HelloWorld</speak>')
  })
  it('voice without optional field', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'voice',
        value: 'Hello',
      })
    })
    expect(result.current.get()).toBe(
      `<speak><voice language="ja-JP" gender="neutral" name="ja-JP-Standard-B">Hello</voice></speak>`
    )
  })
  it('voice with filled optional field', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'voice',
        name: 'ja-JP-Standard-B',
        language: 'ja-JP',
        value: 'Hello',
        gender: 'male',
      })
    })
    expect(result.current.get()).toBe(
      `<speak><voice language="ja-JP" gender="male" name="ja-JP-Standard-B">Hello</voice></speak>`
    )
  })
  it('break without optional field', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'break',
      })
    })
    expect(result.current.get()).toBe(
      `<speak><break time="0ms" strength="medium"/></speak>`
    )
  })
  it('break with filled optional field', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'break',
        time: '1ms',
        strength: 'medium',
      })
    })
    expect(result.current.get()).toBe(
      `<speak><break time="1ms" strength="medium"/></speak>`
    )
  })
  it('emphasis', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'emphasis',
        level: 'strong',
        value: 'Hello World!',
      })
    })
    expect(result.current.get()).toBe(
      `<speak><emphasis level="strong">Hello World!</emphasis></speak>`
    )
  })
  it('prosody without optional field', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'prosody',
        value: 'Hello World!',
      })
    })
    expect(result.current.get()).toBe(
      `<speak><prosody rate="default" pitch="default" volume="default">Hello World!</prosody></speak>`
    )
  })
  it('prosody filled optional field', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'prosody',
        value: 'Hello World!',
        rate: 'slow',
        pitch: 'high',
        volume: 'soft',
      })
    })
    expect(result.current.get()).toBe(
      `<speak><prosody rate="slow" pitch="high" volume="soft">Hello World!</prosody></speak>`
    )
  })
  it('say-as filled optional field', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'say-as',
        value: 'Hello World!',
      })
    })
    expect(result.current.get()).toBe(
      `<speak><say-as interpret-as="" format="" language="ja-JP">Hello World!</say-as></speak>`
    )
  })
  it('say-as with optional field', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'say-as',
        value: 'Hello World!',
        interpretAs: 'currency',
        format: 'yyyymmdd',
        language: 'en-US',
      })
    })
    expect(result.current.get()).toBe(
      `<speak><say-as interpret-as="currency" format="yyyymmdd" language="en-US">Hello World!</say-as></speak>`
    )
  })
  it('sub', () => {
    const { result } = renderHook(() => useSSML())
    act(() => {
      result.current.add({
        type: 'sub',
        alias: 'にっぽんばし',
        value: '日本橋',
      })
    })
    expect(result.current.get()).toBe(
      `<speak><sub alias="にっぽんばし">日本橋</sub></speak>`
    )
  })
})
