export interface Departure {
  time: string;
  realtime?: string;
  line: string;
  direction: string;
  platform?: string;
  via?: string;
  message?: string;
  countdown?: number;
  vehicleType?: string;
}

export interface DepartureBoardResponse {
  stopName: string;
  departures: Departure[];
  messages?: {
    general?: string[];
    stop?: string[];
    line?: string[];
  };
  timestamp: string;
}

export interface DepartureBoardParams {
  stopId: string | string[];
  useRealtime?: boolean;
  maxResults?: number;
  includedMeans?: number[];
  excludedMeans?: number[];
  filterLines?: string[];
  showPlatform?: boolean;
  showVia?: boolean;
  useCountdown?: boolean;
  area?: string[];
  platform?: string[];
} 