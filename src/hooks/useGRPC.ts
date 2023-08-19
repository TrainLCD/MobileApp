import { useEffect, useMemo } from 'react'
import { useRecoilState, useRecoilValue } from 'recoil'
import { StationAPIClient } from '../gen/StationapiServiceClientPb'
import devState from '../store/atoms/dev'
import grpcState from '../store/atoms/grpc'

const useGRPC = () => {
  const [{ cachedClient }, setGRPC] = useRecoilState(grpcState)
  const { devMode } = useRecoilValue(devState)

  const apiUrl = useMemo(() => 'https://grpc.trainlcd.app', [devMode])

  useEffect(() => {
    if (cachedClient || !apiUrl) {
      return
    }

    const client = new StationAPIClient(apiUrl)
    setGRPC((prev) => ({
      ...prev,
      cachedClient: client,
    }))
  }, [apiUrl, cachedClient, setGRPC])

  return cachedClient
}

export default useGRPC
