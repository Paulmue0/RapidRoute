export interface RouteSegment {
  departure: {
    time: string;
    station: string;
    platform?: string;
  };
  arrival: {
    time: string;
    station: string;
    platform?: string;
  };
  line?: string;
  direction?: string;
  means?: string;
  duration?: string;
  realtime?: boolean;
}

export interface Route {
  duration: string;
  fare?: string;
  segments: RouteSegment[];
  changes: number;
}

export interface RouteResponse {
  routes: Route[];
  timestamp: string;
}

export interface RouteParams {
  origin: string;
  destination: string;
  date?: string; // Format: YYYYMMDD
  time?: string; // Format: HHMM
  isArrival?: boolean;
  useRealtime?: boolean;
  tripMode?: 'shortest' | 'leastChanges';
} 