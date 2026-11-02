export const INVALID_DATA_MESSAGE = 'Hay datos no válidos. Revísalos e inténtalo de nuevo.'

export const readableDetail = (detail: unknown): string | undefined =>
  Array.isArray(detail) ? INVALID_DATA_MESSAGE : (detail as string | undefined)
