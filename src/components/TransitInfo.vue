<template>
  <div class="transit-info">
    <div class="section">
      <div class="station-search">
        <StationAutocomplete
          placeholder="Enter a station name"
          :disabled="loadingDepartures"
          @select="handleStationSelected"
        >
          <template #prefix>
            <i class="fas fa-magnifying-glass"></i>
          </template>
        </StationAutocomplete>
      </div>
      
      <div v-if="departures" class="departures">
        <h3><i class="fas fa-location-dot"></i> {{ departures.stopName }}</h3>
        <div v-for="departure in departures.departures" :key="departure.time" class="departure-item">
          <span class="time">
            <i class="far fa-clock"></i>
            {{ departure.time }}
          </span>
          <span class="line">
            <i :class="getVehicleIcon(departure.vehicleType)"></i>
            {{ departure.line }}
          </span>
          <span class="direction">
            <i class="fas fa-arrow-right"></i>
            {{ departure.direction }}
          </span>
          <span v-if="departure.platform" class="platform">
            <i class="fas fa-sign"></i>
            {{ departure.platform }}
          </span>
        </div>
      </div>
      
      <div v-if="departureError" class="error">
        <i class="fas fa-circle-exclamation"></i>
        {{ departureError }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DepartureBoardService } from '../api';
import type { DepartureBoardResponse } from '../api';
import type { Station } from '../api/types/station';
import StationAutocomplete from './StationAutocomplete.vue';

const emit = defineEmits<{
  (e: 'departure-data', data: DepartureBoardResponse): void;
  (e: 'station-selected', station: Station): void;
}>();

// Departure board state
const departures = ref<DepartureBoardResponse | null>(null);
const loadingDepartures = ref(false);
const departureError = ref<string | null>(null);

// Handle station selection for departure board
const handleStationSelected = async (station: Station) => {
  emit('station-selected', station);
  loadDepartures(station.id);
};

// Load departures for selected station
const loadDepartures = async (stationId: string) => {
  loadingDepartures.value = true;
  departureError.value = null;
  
  try {
    const response = await DepartureBoardService.getDepartureBoard({
      stopId: stationId,
      useRealtime: true,
      showPlatform: true
    });
    departures.value = response;
    emit('departure-data', response);
  } catch (error) {
    departureError.value = error instanceof Error ? error.message : 'Failed to load departures';
  } finally {
    loadingDepartures.value = false;
  }
};

const getVehicleIcon = (type?: string): string => {
  switch (type?.toLowerCase()) {
    case 'bus':
      return 'fas fa-bus';
    case 'tram':
      return 'fas fa-train-tram';
    case 'subway':
      return 'fas fa-train-subway';
    case 'train':
      return 'fas fa-train';
    default:
      return 'fas fa-train';
  }
};
</script>

<style scoped>
.transit-info {
  padding: 0;
}

.section {
  background: rgb(30, 30, 30);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 1px 2px rgba(255, 255, 255, 0.05);
}

.station-search {
  margin-bottom: 20px;
}

.departures {
  background: rgb(35, 35, 35);
  border-radius: 4px;
  padding: 16px;
}

.departures h3 {
  margin: 0 0 16px 0;
  color: #eee;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.departure-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
}

.time {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: bold;
  color: #4fc3f7;
  min-width: 60px;
}

.line {
  display: flex;
  align-items: center;
  background: rgb(50, 50, 50);
  padding: 4px 12px;
}

.line i {
  margin-right: 6px;
}

.direction {
  color: #eee;
  font-weight: 500;
  flex: 1;
}

.platform {
  color: #81c784;
  font-size: 0.9rem;
  padding: 4px 8px;
  background: rgb(45, 45, 45);
  border-radius: 4px;
}

.error {
  color: #ef5350;
  padding: 16px;
  background: rgba(239, 83, 80, 0.1);
  border-radius: 4px;
  font-size: 0.9rem;
  margin-top: 12px;
  border-left: 3px solid #ef5350;
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .section {
    padding: 16px;
    margin-bottom: 16px;
  }

  .departure-item {
    padding: 10px;
  }
  
  i {
    margin-right: 0.3em;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  .section {
    padding: 18px;
  }

  .departure-item {
    padding: 10px;
  }
}

i {
  opacity: 0.7;
  margin-right: 0.5em;
  width: 1.2em;
  text-align: center;
}
</style> 