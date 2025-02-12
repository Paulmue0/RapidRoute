import { fetchApi } from '../utils/apiUtils';
import type { StationSearchParams, StationSearchResponse, Station, StationPoint } from '../types/station';

export class StationService {
  private static readonly ENDPOINT = '/XML_STOPFINDER_REQUEST';

  private static transformParams(params: StationSearchParams): Record<string, any> {
    const transformedParams: Record<string, any> = {
      outputFormat: 'json',
      language: 'de',
      locationServerActive: 1,
      stateless: 1,
      type_sf: params.type || 'stop',
      name_sf: params.query,
    };

    if (params.maxResults) {
      transformedParams.anyMaxSizeHitList = params.maxResults;
    }

    if (params.coordinates) {
      transformedParams.coordOutputFormat = 'WGS84[DD.ddddd]';
      transformedParams.coord = `${params.coordinates.lon}:${params.coordinates.lat}`;
      
      if (params.radius) {
        transformedParams.radius_sf = params.radius;
      }
    }

    return transformedParams;
  }

  private static transformResponseToStations(response: StationSearchResponse): Station[] {
    try {
      // Debug log the raw response
      console.log('Raw API Response:', JSON.stringify(response, null, 2));

      // Check if response and stopFinder exist
      if (!response?.stopFinder) {
        console.warn('Invalid response structure: missing stopFinder', response);
        return [];
      }

      // Get points from the response
      const points = response.stopFinder.points;
      
      // If no points found, return empty array
      if (!points || !Array.isArray(points)) {
        console.warn('No valid points found in response. Response structure:', response.stopFinder);
        return [];
      }

      // Map the points to stations
      return points.map(point => {
        console.log('Processing point:', point);
        return {
          id: point.ref.id,
          name: point.name,
          type: point.type,
          city: point.ref.place,
          stateless: point.stateless
        };
      });
    } catch (error) {
      console.error('Error transforming station response:', error);
      return [];
    }
  }

  public static async searchStations(params: StationSearchParams): Promise<Station[]> {
    try {
      console.log('Searching stations with params:', params);
      const transformedParams = this.transformParams(params);
      console.log('Transformed params:', transformedParams);
      const response = await fetchApi<StationSearchResponse>(this.ENDPOINT, transformedParams);
      return this.transformResponseToStations(response);
    } catch (error) {
      console.error('Error in searchStations:', error);
      return [];
    }
  }

  public static async searchStationsWithDebounce(
    params: StationSearchParams,
    debounceMs: number = 300
  ): Promise<Station[]> {
    return new Promise((resolve, reject) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(async () => {
        try {
          const result = await this.searchStations(params);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, debounceMs);
    });
  }

  private static debounceTimer: ReturnType<typeof setTimeout> | null = null;
} 