import type {
  AnyMessage,
  MethodInfo,
  PartialMessage,
  ServiceType,
} from '@bufbuild/protobuf'
import { Message } from '@bufbuild/protobuf'
import type {
  ContextValues,
  Transport,
  UnaryRequest,
  UnaryResponse,
} from '@connectrpc/connect'
import { Code, ConnectError, createContextValues } from '@connectrpc/connect'
import { GrpcWebTransportOptions } from '@connectrpc/connect-web'
import {
  createClientMethodSerializers,
  createMethodUrl,
  encodeEnvelope,
  runUnaryCall,
} from '@connectrpc/connect/protocol'
import {
  requestHeader,
  trailerFlag,
  trailerParse,
  validateResponse,
  validateTrailer,
} from '@connectrpc/connect/protocol-grpc-web'
import { fetch } from 'expo/fetch'

class AbortError extends Error {
  name = 'AbortError'
}

interface FetchCustomResponse {
  status: number
  headers: Headers
  body: Uint8Array
}

function extractDataChunks(initialData: Uint8Array) {
  let buffer = initialData
  const dataChunks: { flags: number; data: Uint8Array }[] = []

  while (buffer.byteLength >= 5) {
    let length = 0
    const flags = buffer[0]

    for (let i = 1; i < 5; i++) {
      length = (length << 8) + buffer[i]
    }

    const data = buffer.subarray(5, 5 + length)
    buffer = buffer.subarray(5 + length)
    dataChunks.push({ flags, data })
  }

  return dataChunks
}

export function createCustomGrpcWebTransport(
  options: GrpcWebTransportOptions
): Transport {
  const useBinaryFormat = options.useBinaryFormat ?? true
  return {
    async unary<
      I extends Message<I> = AnyMessage,
      O extends Message<O> = AnyMessage
    >(
      service: ServiceType,
      method: MethodInfo<I, O>,
      signal: AbortSignal | undefined,
      timeoutMs: number | undefined,
      header: Headers,
      message: PartialMessage<I>,
      contextValues?: ContextValues
    ): Promise<UnaryResponse<I, O>> {
      const { serialize, parse } = createClientMethodSerializers(
        method,
        useBinaryFormat,
        options.jsonOptions,
        options.binaryOptions
      )

      return await runUnaryCall<I, O>({
        signal,
        interceptors: options.interceptors,
        req: {
          stream: false,
          service,
          method,
          url: createMethodUrl(options.baseUrl, service, method),
          init: {
            method: 'POST',
            mode: 'cors',
          },
          header: requestHeader(useBinaryFormat, timeoutMs, header, false),
          contextValues: contextValues ?? createContextValues(),
          message,
        },
        next: async (req: UnaryRequest<I, O>): Promise<UnaryResponse<I, O>> => {
          async function fetchWithFetchAPI(): Promise<FetchCustomResponse> {
            const headers = new Headers()
            req.header.forEach((value, key) => headers.append(key, value))

            try {
              const response = await fetch(req.url, {
                method: req.init.method ?? 'POST',
                headers: headers,
                body: encodeEnvelope(0, serialize(req.message)),
                signal: req.signal,
              })

              const arrayBuffer = await response.arrayBuffer()
              return {
                status: response.status,
                headers: response.headers,
                body: new Uint8Array(arrayBuffer),
              }
            } catch (error) {
              if (error.name === 'AbortError') {
                throw new AbortError('Request aborted')
              } else {
                throw new Error('Network Error')
              }
            }
          }

          const response = await fetchWithFetchAPI()

          validateResponse(response.status, response.headers)

          const chunks = extractDataChunks(response.body)

          let trailer: Headers | undefined
          let message: O | undefined

          chunks.forEach(({ flags, data }) => {
            if (flags === trailerFlag) {
              if (trailer !== undefined) {
                throw 'extra trailer'
              }
              trailer = trailerParse(data)
              return
            }

            if (message !== undefined) {
              throw 'extra message'
            }

            message = parse(data)
          })

          if (trailer === undefined) {
            throw 'missing trailer'
          }

          validateTrailer(trailer, response.headers)

          if (message === undefined) {
            throw 'missing message'
          }

          return {
            stream: false,
            header: response.headers,
            message,
            trailer,
            service,
            method,
          } satisfies UnaryResponse<I, O>
        },
      })
    },
    stream(..._args: unknown[]) {
      return Promise.reject(
        new ConnectError('streaming is not implemented', Code.Unimplemented)
      )
    },
  }
}
