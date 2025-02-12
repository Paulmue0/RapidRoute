interface StationRef {
  id: string;
  gid: string;
  omc: string;
  placeID: string;
  place: string;
}

export interface StationPoint {
  usage: string;
  type: string;
  name: string;
  stateless: string;
  ref: StationRef;
}

interface StopFinderResponse {
  message: Array<{
    name: string;
    value: string;
  }>;
  input: {
    input: string;
  };
  points: StationPoint[];
}

export interface Station {
  id: string;
  name: string;
  type: string;
  city: string;
  stateless: string;
}

export interface StationSearchResponse {
  parameters: Array<{
    name: string;
    value: string;
  }>;
  stopFinder: StopFinderResponse;
}

export interface StationSearchParams {
  query: string;
  maxResults?: number;
  type?: 'stop' | 'poi' | 'street';
  radius?: number;
  coordinates?: {
    lat: number;
    lon: number;
  };
} 