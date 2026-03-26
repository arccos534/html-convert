export interface ApiHandlerRequest extends NodeJS.ReadableStream {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
}

export interface ApiHandlerResponse {
  statusCode: number
  setHeader: (name: string, value: string) => void
  end: (chunk?: string) => void
}

export interface CreateApiHandlerOptions {
  dataDir: string
  jwtSecret: string
}

export function createApiHandler(
  options: CreateApiHandlerOptions,
): (req: ApiHandlerRequest, res: ApiHandlerResponse) => Promise<boolean>
