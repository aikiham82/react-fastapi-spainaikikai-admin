interface ApiLikeError {
  detail?: unknown;
  status?: number;
}

export const errorMessage = (error: ApiLikeError, fallback: string): string => {
  return typeof error?.detail === 'string' ? error.detail : fallback;
};
