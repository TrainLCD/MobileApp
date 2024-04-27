import { useMemo } from 'react'
import { useLoopLine } from './useLoopLine'
import { useNextStation } from './useNextStation'

const useCanGoForward = (): boolean => {
  const nextStation = useNextStation()

  const { isLoopLine } = useLoopLine()

  const canGoForward = useMemo(() => {
    if (isLoopLine) {
      return true
    }

    return !!nextStation
  }, [isLoopLine, nextStation])

  return canGoForward
}

export default useCanGoForward
