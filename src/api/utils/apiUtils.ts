import { getApiConfig } from '../config/apiConfig';

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const buildQueryString = (params: Record<string, any>): string => {
  const query = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value
          .map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
          .join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
  return query ? `?${query}` : '';
};

export const fetchApi = async <T>(
  endpoint: string,
  params: Record<string, any> = {}
): Promise<T> => {
  const config = getApiConfig();
  const mergedParams = { ...config.defaultParams, ...params };
  const url = `${config.baseUrl}${endpoint}${buildQueryString(mergedParams)}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.statusText,
        `API request failed: ${response.statusText}`
      );
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      500,
      'Internal Error',
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}; 