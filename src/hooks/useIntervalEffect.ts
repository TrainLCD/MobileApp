import { useCallback, useEffect, useState } from 'react'

const useIntervalEffect = (
  handler: () => void,
  timeout: number
): {
  intervalId: number | undefined
  isPausing: boolean
  pause: () => void
} => {
  const [intervalId, setIntervalId] = useState<number>()
  const [isPausing, setIsPausing] = useState(false)

  useEffect(() => {
    if (isPausing) {
      return () => undefined
    }

    const id = setInterval(handler, timeout)
    setIntervalId(id)

    return () => clearInterval(id)
  }, [handler, isPausing, timeout])

  const pause = useCallback(() => {
    if (intervalId) {
      clearTimeout(intervalId)
    }
    setIsPausing(true)
    const id = setTimeout(() => {
      setIsPausing(false)
    }, intervalId)

    return () => clearTimeout(id)
  }, [intervalId])

  return { intervalId, isPausing, pause }
}

export default useIntervalEffect
