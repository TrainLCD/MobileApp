import { useEffect, useState } from 'react'

function useLazyPrevious<T>(value: T, shouldUpdate: boolean): T {
  const [val, setVal] = useState<T>(value)
  useEffect(() => {
    if (shouldUpdate) {
      setVal((prev) => (prev === value ? prev : value))
    }
  }, [shouldUpdate, value])
  return val
}

export default useLazyPrevious
