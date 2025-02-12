import { fetchApi } from '../utils/apiUtils';
import type { RouteParams, RouteResponse } from '../types/route';

export class RouteService {
  private static readonly ENDPOINT = '/XSLT_TRIP_REQUEST2';

  private static transformParams(params: RouteParams): Record<string, any> {
    const transformedParams: Record<string, any> = {
      name_origin: params.origin,
      name_destination: params.destination,
      outputFormat: 'json',
    };

    if (params.date) {
      transformedParams.itdDate = params.date;
    }

    if (params.time) {
      transformedParams.itdTime = params.time;
    }

    if (params.isArrival) {
      transformedParams.itdTripDateTimeDepArr = 'arr';
    }

    if (params.useRealtime) {
      transformedParams.useRealtime = 1;
    }

    if (params.tripMode) {
      transformedParams.itdTripMode = params.tripMode;
    }

    return transformedParams;
  }

  public static async getRoute(params: RouteParams): Promise<RouteResponse> {
    const transformedParams = this.transformParams(params);
    return fetchApi<RouteResponse>(this.ENDPOINT, transformedParams);
  }
} 