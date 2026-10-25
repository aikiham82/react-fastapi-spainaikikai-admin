import * as Sentry from '@sentry/react';

const EMAIL = /(?<![\w.+-])[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+/g;
const RESET_TOKEN = /([?&]token=)[^&#\s"]+/g;

export const redact = <T>(value: T): T => {
  if (typeof value === 'string') {
    return value.replace(EMAIL, '[email]').replace(RESET_TOKEN, '$1[token]') as T;
  }
  if (Array.isArray(value)) return value.map(redact) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)])) as T;
  }
  return value;
};

interface ApiFailure {
  method?: string;
  url?: string;
  status?: number;
}

// A 4xx is the API answering; only a lost request or a 5xx means the user hit a failure.
export const reportApiFailure = ({ method = 'get', url = '', status }: ApiFailure): void => {
  if (status !== undefined && status < 500) return;

  const verb = method.toUpperCase();
  const path = url.split('?')[0];
  const outcome = status === undefined ? 'network error' : String(status);
  Sentry.captureException(new Error(`API ${verb} ${path} failed: ${outcome}`), {
    tags: { api_method: verb, api_path: path, api_status: outcome },
    fingerprint: ['api-failure', verb, path, outcome],
  });
};

export const initSentry = (dsn: string | undefined, environment?: string): boolean => {
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment,
    // SDK v11 collects personal data unless told otherwise; club members' data must not leave.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    beforeSend: (event) => redact(event),
    beforeBreadcrumb: (breadcrumb) => redact(breadcrumb),
  });
  return true;
};
