import { useCallback, useEffect, useRef, useState } from 'react'

const useIntervalEffect = (
  handler: () => void,
  timeout: number
): {
  isPausing: boolean
  pause: () => void
} => {
  const intervalId = useRef<number>()
  const [isPausing, setIsPausing] = useState(false)

  useEffect(() => {
    if (isPausing) {
      return () => undefined
    }

    const id = setInterval(handler, timeout)
    intervalId.current = id

    return () => clearInterval(id)
  }, [handler, isPausing, timeout])

  const pause = useCallback(() => {
    setIsPausing(true)
    const id = setTimeout(() => {
      setIsPausing(false)
    }, timeout)

    return () => clearTimeout(id)
  }, [timeout])

  return { isPausing, pause }
}

export default useIntervalEffect
