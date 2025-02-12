import { fetchApi } from '../utils/apiUtils';
import type { DepartureBoardParams, DepartureBoardResponse } from '../types/departureBoard';

export class DepartureBoardService {
  private static readonly ENDPOINT = '/XSLT_DM_REQUEST';

  private static transformParams(params: DepartureBoardParams): Record<string, any> {
    const transformedParams: Record<string, any> = {
      outputFormat: 'json',
      language: 'de',
      stateless: 1,
      mode: 'direct',
      type_dm: 'stop',
      name_dm: params.stopId,
      limit: params.maxResults || 10,
      useRealtime: 1,
      locationServerActive: 1
    };

    if (params.useRealtime) {
      transformedParams.itdDateTimeDepArr = 'dep';
      transformedParams.itdLPxx_useRealtime = 1;
    }

    if (params.useCountdown) {
      transformedParams.itdLPxx_showTimeMode = 'countdown';
    }

    if (params.showPlatform) {
      transformedParams.itdLPxx_showPlatform = 1;
    }

    if (params.showVia) {
      transformedParams.itdLPxx_showVia = 1;
    }

    if (params.includedMeans?.length) {
      transformedParams.includedMeans = params.includedMeans;
    }

    if (params.excludedMeans?.length) {
      transformedParams.excludedMeans = params.excludedMeans;
    }

    if (params.filterLines?.length) {
      transformedParams.line = params.filterLines.join('|');
    }

    return transformedParams;
  }

  private static transformResponse(response: any): DepartureBoardResponse {
    try {
      console.log('Raw departure board response:', response);

      if (!response?.departureList) {
        throw new Error('Invalid response format: missing departureList');
      }

      const departures = response.departureList.map((dep: any) => ({
        time: dep.dateTime?.time || formatTime(dep.dateTime) || '',
        realtime: dep.realDateTime ? formatTime(dep.realDateTime) : undefined,
        countdown: dep.countdown ? parseInt(dep.countdown) : undefined,
        line: dep.servingLine?.number || dep.servingLine?.symbol || '',
        direction: dep.servingLine?.direction || '',
        platform: dep.platform || '',
        via: dep.servingLine?.via || '',
        delay: dep.servingLine?.delay ? parseInt(dep.servingLine.delay) : undefined,
        message: dep.servingLine?.message || '',
        vehicleType: dep.servingLine?.motType || '',
        monitored: dep.realtimeTripStatus === 'MONITORED',
        servingLine: {
          key: dep.servingLine?.key || '',
          code: dep.servingLine?.code || '',
          number: dep.servingLine?.number || '',
          symbol: dep.servingLine?.symbol || '',
          motType: dep.servingLine?.motType || '',
          realtime: dep.servingLine?.realtime === '1',
          direction: dep.servingLine?.direction || '',
          directionFrom: dep.servingLine?.directionFrom || '',
          name: dep.servingLine?.name || '',
          delay: dep.servingLine?.delay ? parseInt(dep.servingLine.delay) : undefined
        }
      }));

      return {
        stopName: response.stopName || '',
        departures,
        messages: {
          general: response.generalMessages?.map((msg: any) => msg.content) || [],
          stop: response.stopMessages?.map((msg: any) => msg.content) || [],
          line: response.lineMessages?.map((msg: any) => msg.content) || []
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error transforming departure board response:', error);
      throw error;
    }
  }

  public static async getDepartureBoard(
    params: DepartureBoardParams
  ): Promise<DepartureBoardResponse> {
    try {
      console.log('Getting departure board with params:', params);
      const transformedParams = this.transformParams(params);
      console.log('Transformed params:', transformedParams);
      const response = await fetchApi(this.ENDPOINT, transformedParams);
      return this.transformResponse(response);
    } catch (error) {
      console.error('Error getting departure board:', error);
      throw error;
    }
  }

  public static async getMultiStopDepartureBoard(
    params: Omit<DepartureBoardParams, 'stopId'> & { stopIds: string[] }
  ): Promise<DepartureBoardResponse> {
    return this.getDepartureBoard({
      ...params,
      stopId: params.stopIds[0] // For now, just use the first stop ID
    });
  }
}

// Helper function to format time from dateTime object
function formatTime(dateTime: any): string {
  if (!dateTime || !dateTime.hour || !dateTime.minute) return '';
  return `${dateTime.hour.padStart(2, '0')}:${dateTime.minute.padStart(2, '0')}`;
} 