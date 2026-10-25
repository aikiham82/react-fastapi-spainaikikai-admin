import * as Sentry from '@sentry/react';

const EMAIL = /(?<![\w.+-])[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+/g;
const QUERY_TOKEN = /([?&]token=)[^&#\s"]+/g;
const PATH_TOKEN = /(\/password-reset\/validate\/)[^/?#\s"]+/g;
const OPAQUE_SEGMENT = /^(?=.*\d)[\w-]{16,}$|^\d+$/;

export const redact = <T>(value: T): T => {
  if (typeof value === 'string') {
    return value
      .replace(EMAIL, '[email]')
      .replace(QUERY_TOKEN, '$1[token]')
      .replace(PATH_TOKEN, '$1[token]') as T;
  }
  if (Array.isArray(value)) return value.map(redact) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)])) as T;
  }
  return value;
};

const routeOf = (url: string): string =>
  url
    .split('?')[0]
    .split('/')
    .map((segment) => (OPAQUE_SEGMENT.test(segment) ? ':id' : segment))
    .join('/');

interface ApiFailure {
  method?: string;
  url?: string;
  status?: number;
  cancelled?: boolean;
}

export const reportApiFailure = ({ method = 'get', url = '', status, cancelled = false }: ApiFailure): void => {
  const isServerFailure = status === undefined || status >= 500;
  if (cancelled || !isServerFailure) return;

  const verb = method.toUpperCase();
  const route = routeOf(url);
  const outcome = status === undefined ? 'network error' : String(status);
  Sentry.captureException(new Error(`API ${verb} ${route} failed: ${outcome}`), {
    tags: { api_method: verb, api_path: route, api_status: outcome },
    fingerprint: ['api-failure', verb, route, outcome],
  });
};

export const initSentry = (dsn: string | undefined, environment?: string): boolean => {
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment,
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
