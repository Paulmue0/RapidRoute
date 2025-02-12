export interface FavoriteStation {
  id: string;
  name: string;
  type: 'departure' | 'arrival';
  updateInterval: number;
} 