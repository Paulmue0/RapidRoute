<template>
  <div class="favorite-station" :class="{ loading }">
    <div class="header">
      <div class="station-info">
        <h3>{{ favorite.name }}</h3>
        <div class="station-meta">
          <button 
            class="type-switch" 
            :class="favorite.type"
            @click="toggleType"
          >
            <i :class="typeIcon"></i>
            {{ favorite.type }}
          </button>
          <span class="update-interval">Updates every {{ favorite.updateInterval }}s</span>
        </div>
      </div>
      <div class="actions">
        <button 
          class="icon-btn refresh" 
          title="Refresh" 
          @click="refresh"
          :disabled="loading"
        >
          <i class="fas fa-rotate"></i>
        </button>
        <button 
          class="icon-btn delete" 
          title="Remove" 
          @click="$emit('remove')"
          :disabled="loading"
        >
          <i class="fas fa-xmark"></i>
        </button>
      </div>
    </div>

    <div class="departures" v-if="departureData">
      <div class="departure-controls" v-if="departureData.departures.length > 4">
        <button 
          class="nav-btn" 
          :disabled="currentPage === 0"
          @click="changePage(currentPage - 1)"
          title="Show earlier connections"
        >
          <i class="fas fa-chevron-up"></i>
        </button>
        <span class="page-indicator">
          {{ Math.min(currentPage * 4 + 1, departureData.departures.length) }}-{{ Math.min((currentPage + 1) * 4, departureData.departures.length) }}
          of {{ departureData.departures.length }}
        </span>
        <button 
          class="nav-btn" 
          :disabled="(currentPage + 1) * 4 >= departureData.departures.length"
          @click="changePage(currentPage + 1)"
          title="Show later connections"
        >
          <i class="fas fa-chevron-down"></i>
        </button>
      </div>

      <SplitFlapDisplay
        :text="formatDeparturesForDisplay()"
        :letter-count="45"
        :row-count="4"
        class="departure-display"
      />
      
      <div v-if="departureData.messages?.general" class="messages">
        <div v-for="(message, index) in departureData.messages.general" 
             :key="index" 
             class="message">
          {{ message }}
        </div>
      </div>
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
      <button class="retry-btn" @click="refresh">Try Again</button>
    </div>

    <div v-else class="loading-placeholder">
      <div class="loading-animation">
        <!-- Outer ring -->
        <div class="spinner-ring outer"></div>
        <!-- Inner ring -->
        <div class="spinner-ring inner"></div>
      </div>
      <div class="loading-text">
        <span class="primary">Loading {{ favorite.type === 'departure' ? 'departures' : 'arrivals' }}</span>
        <span class="dots"><span>.</span><span>.</span><span>.</span></span>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="modal-overlay" @click="showSettings = false">
      <div class="modal" @click.stop>
        <h3>Station Settings</h3>
        <div class="settings-content">
          <div class="setting-item">
            <label>Update Interval</label>
            <p class="setting-value">30 seconds</p>
          </div>
          <div class="setting-item">
            <label>Display Type</label>
            <p class="setting-value">{{ favorite.type === 'departure' ? 'Departures' : 'Arrivals' }}</p>
          </div>
        </div>
        <div class="modal-actions">
          <button @click="showSettings = false">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { DepartureBoardService } from '../api';
import type { DepartureBoardResponse, Departure } from '../api';
import type { FavoriteStation } from '../types';
import SplitFlapDisplay from './SplitFlapDisplay.vue';

interface ServingLine {
  key: string;
  code: string;
  number: string;
  symbol: string;
  motType: string;
  realtime: boolean;
  direction: string;
  directionFrom: string;
  name: string;
  delay?: number;
}

interface ProcessedDeparture {
  time: string;
  realtime?: string;
  countdown?: number;
  line: string;
  direction: string;
  platform: string;
  via?: string;
  delay?: number;
  message?: string;
  vehicleType?: string;
  monitored: boolean;
  servingLine: ServingLine;
}

interface DepartureBoardResponseWithDelay extends Omit<DepartureBoardResponse, 'departures'> {
  departures: ProcessedDeparture[];
}

const props = defineProps<{
  favorite: FavoriteStation;
}>();

const emit = defineEmits<{
  (e: 'remove'): void;
  (e: 'update', favorite: FavoriteStation): void;
}>();

const departureData = ref<DepartureBoardResponseWithDelay | null>(null);
const error = ref<string | null>(null);
const loading = ref(false);
const showSettings = ref(false);
const currentPage = ref(0);
let updateTimer: number | null = null;

const typeIcon = computed(() => {
  return props.favorite.type === 'departure' 
    ? 'fas fa-arrow-right-from-bracket' 
    : 'fas fa-arrow-right-to-bracket';
});

const toggleType = () => {
  const newType = props.favorite.type === 'departure' ? 'arrival' : 'departure';
  emit('update', { ...props.favorite, type: newType });
  refresh();
};

const formatTime = (time: string, countdown?: number): string => {
  if (countdown !== undefined) {
    return `${time} (${countdown}m)`;
  }
  return time;
};

const formatDeparturesForDisplay = () => {
  if (!departureData.value?.departures) return [];

  const startIdx = currentPage.value * 4;
  const rows = departureData.value.departures
    .slice(startIdx, startIdx + 4)
    .map(departure => {
      const time = departure.time.padEnd(5, ' ');
      const delay = departure.monitored && departure.delay ? `+${departure.delay}` : '';
      const delayPadded = delay.padStart(3, ' ');
      const countdown = departure.countdown !== undefined ? `${departure.countdown}m`.padStart(3, ' ') : '   ';
      const line = departure.line.padEnd(4, ' ');
      const platform = departure.platform ? `${departure.platform}`.padStart(2, ' ') : '  ';
      const direction = departure.direction.substring(0, 20);
      
      // Add special character to mark where delay starts for styling
      const timeWithDelay = delay ? `${time}§${delayPadded}` : `${time}   `;
      return `${timeWithDelay} ${countdown} ${line}${platform} ${direction}`;
    });

  // Pad with empty rows if we have less than 4 departures
  while (rows.length < 4) {
    rows.push(' '.repeat(45));
  }
  
  return rows; // Return array of strings instead of joined string
};

const changePage = async (newPage: number) => {
  if (newPage === currentPage.value) return;
  currentPage.value = newPage;
};

const loadDepartures = async () => {
  if (loading.value) return;
  
  loading.value = true;
  error.value = null;
  currentPage.value = 0;
  
  try {
    const response = await DepartureBoardService.getDepartureBoard({
      stopId: props.favorite.id,
      useRealtime: true,
      showPlatform: true,
      useCountdown: true,
      maxResults: 12
    });

    // The response is already properly formatted from the service
    departureData.value = response as DepartureBoardResponseWithDelay;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load departures';
  } finally {
    loading.value = false;
  }
};

const refresh = () => {
  loadDepartures();
};

const startUpdateTimer = () => {
  updateTimer = window.setInterval(() => {
    loadDepartures();
  }, props.favorite.updateInterval * 1000);
};

onMounted(() => {
  loadDepartures();
  startUpdateTimer();
});

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }
});
</script>

<style scoped>
.favorite-station {
  background: rgb(30, 30, 30);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 1px 2px rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}

.favorite-station.loading {
  opacity: 0.7;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgb(40, 40, 40);
}

.station-info h3 {
  margin: 0 0 6px 0;
  font-size: 0.95rem;
  color: #eee;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.station-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.type-switch {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgb(40, 40, 40);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.type-switch i {
  font-size: 0.9rem;
  opacity: 0.7;
}

.type-switch.departure {
  color: #4fc3f7;
}

.type-switch.arrival {
  color: #81c784;
}

.type-switch:hover {
  background: rgb(45, 45, 45);
  transform: translateY(-1px);
}

.update-interval {
  font-size: 0.8rem;
  color: #888;
}

.actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  transition: all 0.2s;
  background: rgb(40, 40, 40);
  color: #888;
}

.icon-btn:hover:not(:disabled) {
  background: rgb(45, 45, 45);
  color: #eee;
  transform: translateY(-1px);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn.delete:hover:not(:disabled) {
  background: #e53935;
  color: #fff;
}

.messages {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 2px solid rgb(40, 40, 40);
}

.message {
  padding: 8px 12px;
  font-size: 0.85rem;
  margin-bottom: 6px;
}

.error {
  padding: 12px;
  font-size: 0.85rem;
}

.retry-btn {
  padding: 6px 12px;
  background: #ef5350;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.retry-btn:hover {
  background: #e53935;
  transform: translateY(-1px);
}

.loading-placeholder {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  min-height: 200px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  backdrop-filter: blur(8px);
}

.loading-animation {
  position: relative;
  width: 48px;
  height: 48px;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2.5px solid transparent;
  animation: spin linear infinite;
}

.spinner-ring.outer {
  border-top-color: rgba(255, 255, 255, 0.8);
  animation-duration: 1.5s;
}

.spinner-ring.inner {
  inset: 6px;
  border-top-color: rgba(255, 255, 255, 0.3);
  animation-duration: 2.5s;
}

.loading-text {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.loading-text .primary {
  font-weight: 500;
}

.loading-text .dots {
  display: flex;
}

.loading-text .dots span {
  animation: dots 1.4s infinite;
  animation-fill-mode: both;
  margin: 0 1px;
  font-weight: 600;
}

.loading-text .dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-text .dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes dots {
  0% { opacity: 0.4; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-4px); }
  100% { opacity: 0.4; transform: translateY(0); }
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .favorite-station {
    padding: 16px;
    margin-bottom: 12px;
  }

  .station-info h3 {
    font-size: 1rem;
  }

  .type-switch {
    padding: 4px 8px;
    font-size: 0.75rem;
  }

  .icon-btn {
    width: 28px;
    height: 28px;
    font-size: 1.1rem;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  .favorite-station {
    padding: 18px;
  }
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: rgb(35, 35, 35);
  border-radius: 8px;
  padding: 20px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.modal h3 {
  margin: 0 0 16px 0;
  color: #eee;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-bottom: 12px;
  border-bottom: 1px solid rgb(50, 50, 50);
}

.settings-content {
  margin-bottom: 20px;
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item label {
  display: block;
  color: #888;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.setting-value {
  color: #eee;
  font-size: 0.9rem;
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
}

.modal-actions button {
  padding: 8px 16px;
  background: rgb(50, 50, 50);
  color: #eee;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.modal-actions button:hover {
  background: rgb(60, 60, 60);
}

.departure-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 6px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  backdrop-filter: blur(8px);
}

.departure-controls .nav-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.departure-controls .nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.departure-controls .nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.departure-controls .page-indicator {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  min-width: 80px;
  text-align: center;
}

.departure-display :deep(.letter) {
  transition: color 0.3s ease;
}

/* Style for delayed times - will be applied in SplitFlapDisplay */
.departure-display :deep(.letter.delayed) {
  color: #ff4444;
}
</style> 