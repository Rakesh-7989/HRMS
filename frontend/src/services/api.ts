import { API_BASE_URL } from '@/utils/constants';

type ResponseType = 'json' | 'blob' | 'arraybuffer' | 'text';

interface RequestConfig {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  responseType?: ResponseType;
  body?: any;
}

interface ApiResponseData<T = any> {
  data: T;
  status: number;
}

class ApiError extends Error {
  status: number;
  response?: { data: any; status: number };

  constructor(message: string, status: number, responseData?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    if (responseData !== undefined) {
      this.response = { data: responseData, status };
    }
  }
}

export { ApiError };

const buildUrl = (url: string, params?: Record<string, any>): string => {
  const base = `${API_BASE_URL}${url}`;
  if (!params) return base;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `${base}?${qs}` : base;
};

const getToken = (): string | null =>
  localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

const clearAuth = (): void => {
  ['accessToken', 'refreshToken', 'user'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const getErrorMessage = (status: number, data: any): string => {
  const msg = data?.message || data?.error || '';

  if (data?.details && Array.isArray(data.details) && data.details.length > 0) {
    const first = data.details[0];
    if (first?.message) {
      return first.message === 'Required' && first.path
        ? `${first.path.join('.')} is required`
        : first.message;
    }
  }

  const messages: Record<number, string> = {
    400: msg || 'Invalid request. Please check your input.',
    401: msg || 'Session expired. Please log in again.',
    403: msg || 'Access denied. You do not have permission for this action.',
    404: msg || 'Resource not found.',
    422: msg || 'Validation failed. Please check the provided data.',
    429: 'Too many requests. Please slow down and try again later.',
  };

  if (status >= 500) {
    return msg || 'Our servers are experiencing issues. Please try again in a few minutes.';
  }

  return messages[status] || msg || `An unexpected error occurred (Code: ${status})`;
};

const shouldForceLogout = (data: any): boolean => {
  const msg = (data?.message as string) || '';
  return msg.toLowerCase().includes('inactive') || msg.toLowerCase().includes('revoked') || msg.toLowerCase().includes('portal access');
};

const buildHeaders = (config?: RequestConfig): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config?.headers,
  };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const parseBody = async (res: Response, responseType?: ResponseType): Promise<any> => {
  if (responseType === 'blob') return res.blob();
  if (responseType === 'arraybuffer') return res.arrayBuffer();
  if (responseType === 'text') return res.text();
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const request = async <T = any>(
  method: string,
  url: string,
  body?: any,
  config?: RequestConfig,
  isRetry?: boolean,
): Promise<ApiResponseData<T>> => {
  const fullUrl = buildUrl(url, config?.params);

  const headers = buildHeaders(config);
  const isFormData = body instanceof FormData;
  if (isFormData) {
    delete headers['Content-Type'];
  }

  const init: RequestInit = {
    method,
    headers: new Headers(headers),
    ...(body !== undefined && !isFormData ? { body: JSON.stringify(body) } : {}),
    ...(isFormData ? { body } : {}),
  };

  if (config?.timeout) {
    init.signal = AbortSignal.timeout(config.timeout);
  }

  const response = await fetch(fullUrl, init);

  if (response.ok) {
    const data = await parseBody(response, config?.responseType);
    return { data, status: response.status };
  }

  const data = await parseBody(response);
  const isLoginRefresh = url.includes('/auth/login') || url.includes('/auth/refresh');

  if (response.status === 403 && shouldForceLogout(data)) {
    clearAuth();
    window.location.href = '/login';
    throw new ApiError(getErrorMessage(403, data), 403, data);
  }

  if (response.status === 401 && !isLoginRefresh && !isRetry) {
    if (shouldForceLogout(data)) {
      clearAuth();
      window.location.href = '/login';
      throw new ApiError(getErrorMessage(401, data), 401, data);
    }

    const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
          signal: AbortSignal.timeout(15000),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const { accessToken, refreshToken: newRefreshToken } = refreshData;
          const storage = localStorage.getItem('refreshToken') ? localStorage : sessionStorage;
          storage.setItem('accessToken', accessToken);
          storage.setItem('refreshToken', newRefreshToken);
          return request<T>(method, url, body, config, true);
        }
      } catch {
        // refresh failed
      }
    }
    clearAuth();
    window.location.href = '/login';
  }

  const message = getErrorMessage(response.status, data);
  throw new ApiError(message, response.status, data);
};

const api = {
  get: <T = any>(url: string, config?: RequestConfig) =>
    request<T>('GET', url, undefined, config),

  post: <T = any>(url: string, data?: any, config?: RequestConfig) =>
    request<T>('POST', url, data, config),

  put: <T = any>(url: string, data?: any, config?: RequestConfig) =>
    request<T>('PUT', url, data, config),

  patch: <T = any>(url: string, data?: any, config?: RequestConfig) =>
    request<T>('PATCH', url, data, config),

  delete: <T = any>(url: string, config?: RequestConfig) =>
    request<T>('DELETE', url, config?.body, config),
};

export default api;
