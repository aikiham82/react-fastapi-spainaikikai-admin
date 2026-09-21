import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { appStorage } from './appStorage'


export const getToken = () => {
  const { local } = appStorage()
  // Try access_token first, then fall back to jwt from cookies if needed
  const token = local.getString('access_token') || document.cookie
    .split('; ')
    .find(row => row.startsWith('jwt='))
    ?.split('=')[1]
  
  return token
}

const client = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  baseURL: import.meta.env.VITE_API_URL
})

// Add a request interceptor to dynamically set the token for each request
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: unknown) => {
    return Promise.reject(error)
  }
)

export interface ApiError {
  message: string
  detail?: string
  status?: number
  requestUrl?: string
  method?: string
  params?: unknown
  token?: string | null
  body?: unknown
}

interface ErrorResponse {
  error?: string
  // FastAPI raises HTTPException with a `detail` payload
  detail?: string
}

export const apiClient = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await client.get<T>(url, config)
      return response.data
    } catch (error) {
      throw handleError(error as AxiosError<ErrorResponse>)
    }
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await client.post<T>(url, data, config)
      return response.data
    } catch (error) {
      throw handleError(error as AxiosError<ErrorResponse>)
    }
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await client.put<T>(url, data, config)
      return response.data
    } catch (error) {
      throw handleError(error as AxiosError<ErrorResponse>)
    }
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await client.patch<T>(url, data, config)
      return response.data
    } catch (error) {
      throw handleError(error as AxiosError<ErrorResponse>)
    }
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await client.delete<T>(url, config)
      return response.data
    } catch (error) {
      throw handleError(error as AxiosError<ErrorResponse>)
    }
  }
}

function handleError(error: AxiosError<ErrorResponse>): ApiError {
  const { message, response, request } = error


  const isLoginAttempt = error.config?.url?.includes('/auth/login')

  if (response?.status === 401 && !isLoginAttempt) {
    // Clear local storage and cookies
    appStorage().local.remove('access_token')
    localStorage.clear();
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    // Redirect to login
    window.location.href = '/login';
  }

  return {
    message: message,
    detail: response?.data?.detail,
    status: response?.status,
    requestUrl: request?.responseURL,
    method: response?.config?.method,
    params: response?.config?.params,
  }
} 
