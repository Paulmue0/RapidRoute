export interface ApiConfig {
  baseUrl: string;
  defaultParams: {
    mode: string;
    stateless: number;
    sRaLP: number;
    locationServerActive: number;
    outputFormat: string;
  };
}

export const defaultConfig: ApiConfig = {
  baseUrl: 'https://www.efa-bw.de/rtMonitor',
  defaultParams: {
    mode: 'direct',
    stateless: 1,
    sRaLP: 1,
    locationServerActive: 1,
    outputFormat: 'json',
  },
};

export const getApiConfig = (): ApiConfig => {
  return defaultConfig;
}; 