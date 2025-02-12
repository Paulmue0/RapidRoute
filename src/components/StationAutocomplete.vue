<template>
  <div class="station-autocomplete">
    <div class="input-wrapper">
      <div class="input-content">
        <input
          ref="inputRef"
          v-model="query"
          type="search"
          placeholder=" "
          :disabled="disabled"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown.enter="handleEnter"
        />
        <label class="floating-label">
          {{ placeholder }}
        </label>
        <div v-if="loading" class="loading-indicator">
          <span class="loading-spinner"></span>
        </div>
      </div>
    </div>
    
    <div v-if="showSuggestions && suggestions.length > 0" class="suggestions">
      <div
        v-for="station in suggestions"
        :key="station.id"
        class="suggestion"
        @mousedown="selectStation(station)"
      >
        <div class="station-name">{{ station.name }}</div>
        <div v-if="station.city" class="station-city">{{ station.city }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { StationService } from '../api/services/stationService';
import type { Station } from '../api/types/station';

const props = withDefaults(defineProps<{
  placeholder?: string;
  disabled?: boolean;
  maxResults?: number;
  useLocation?: boolean;
}>(), {
  placeholder: 'Search for a station...',
  disabled: false,
  maxResults: 10,
  useLocation: false
});

const emit = defineEmits<{
  (e: 'select', station: Station): void;
}>();

const query = ref('');
const suggestions = ref<Station[]>([]);
const loading = ref(false);
const showSuggestions = ref(false);
const inputFocused = ref(false);
const mouseX = ref(0);
const mouseY = ref(0);
const visible = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);
const userLocation = ref<{ lat: number; lon: number } | null>(null);
const coordinates = ref<{ lat: number; lon: number } | null>(null);
const radius = ref(10000);

const backgroundStyle = computed(() => ({
  background: `
    radial-gradient(
      ${visible.value ? '120px' : '0px'} circle at ${mouseX.value}px ${mouseY.value}px,
      rgba(60, 60, 60, 0.5),
      transparent 80%
    )
  `
}));

onMounted(() => {
  if (props.useLocation) {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        userLocation.value = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
      },
      (error) => {
        console.error('Error getting location:', error);
      }
    );
  }
});

const handleMouseMove = (event: MouseEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  
  const target = event.currentTarget as HTMLElement;
  target.style.setProperty('--mouse-x', `${x}%`);
  target.style.setProperty('--mouse-y', `${y}%`);
};

const handleMouseLeave = () => {
  const target = inputRef.value?.parentElement?.parentElement;
  if (target) {
    target.style.setProperty('--mouse-x', '50%');
    target.style.setProperty('--mouse-y', '50%');
  }
};

const handleEnter = () => {
  if (suggestions.value.length > 0) {
    selectStation(suggestions.value[0]);
  }
};

const handleInput = async () => {
  if (query.value.length < 2) {
    suggestions.value = [];
    return;
  }

  loading.value = true;
  try {
    const params = {
      query: query.value,
      maxResults: 5,
      coordinates: coordinates.value || undefined,
      radius: radius.value
    };
    
    const results = await StationService.searchStations(params);
    suggestions.value = results;
  } catch (error) {
    console.error('Failed to search stations:', error);
    suggestions.value = [];
  } finally {
    loading.value = false;
  }
};

const handleFocus = () => {
  showSuggestions.value = true;
  inputFocused.value = true;
};

const handleBlur = () => {
  inputFocused.value = false;
  // Delay hiding suggestions to allow for click events
  setTimeout(() => {
    showSuggestions.value = false;
  }, 200);
};

const selectStation = (station: Station) => {
  emit('select', station);
  query.value = ''; // Clear the input after selection
  suggestions.value = []; // Clear the results
  showSuggestions.value = false;
};
</script>

<style scoped>
.station-autocomplete {
  position: relative;
  width: 100%;
}

.input-wrapper {
  position: relative;
  width: 100%;
}

.input-background {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    transparent,
    transparent
  );
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  transition: all 0.3s ease;
  opacity: 0;
}

.input-wrapper:hover .input-background {
  opacity: 1;
  background: radial-gradient(
    circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgb(60, 60, 60),
    rgb(45, 45, 45) 40%,
    transparent 70%
  );
}

.input-content {
  position: relative;
  width: 100%;
  background: rgb(25, 25, 25);
}

input {
  display: flex;
  width: 100%;
  height: 36px;
  border-radius: 8px;
  border: 1px solid rgb(40, 40, 40);
  background: rgb(25, 25, 25);
  padding: 8px 12px;
  font-size: 0.875rem;
  color: #eee;
  transition: all 0.15s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

input::placeholder {
  color: rgba(150, 150, 150, 0.7);
}

input:focus {
  outline: none;
  border-color: rgb(60, 60, 60);
  box-shadow: 
    0 0 0 3px rgba(60, 60, 60, 0.2),
    0 1px 2px rgba(0, 0, 0, 0.05);
}

input:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Hide browser's search input elements */
input[type="search"]::-webkit-search-cancel-button,
input[type="search"]::-webkit-search-decoration,
input[type="search"]::-webkit-search-results-button,
input[type="search"]::-webkit-search-results-decoration {
  appearance: none;
  -webkit-appearance: none;
}

.floating-label {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(150, 150, 150, 0.7);
  pointer-events: none;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  transform-origin: left top;
  background: rgb(25, 25, 25);
  padding: 0 4px;

}

input:focus ~ .floating-label,
input:not(:placeholder-shown) ~ .floating-label {
  transform: translateY(-26px) scale(0.85);
  color: rgb(100, 100, 100);
}

.loading-indicator {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.loading-spinner {
  display: block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: rgba(150, 150, 150, 0.7);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.suggestions {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  background: rgb(35, 35, 35);
  border-radius: 12px;
  z-index: 1000;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 2px rgba(255, 255, 255, 0.05);
  border: 2px solid rgb(40, 40, 40);
  transform-origin: top;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.suggestion {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgb(40, 40, 40);
  position: relative;
  overflow: hidden;
}

.suggestion:last-child {
  border-bottom: none;
}

.suggestion::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgb(45, 45, 45);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.suggestion:hover::before {
  opacity: 1;
}

.station-name {
  position: relative;
  color: #eee;
  font-weight: 500;
  font-size: 0.9rem;
  transition: transform 0.2s ease;
}

.station-city {
  position: relative;
  font-size: 0.8rem;
  color: #888;
  margin-top: 4px;
  transition: transform 0.2s ease;
}

.suggestion:hover .station-name,
.suggestion:hover .station-city {
  transform: translateX(4px);
}

/* Scrollbar styling */
.suggestions::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.suggestions::-webkit-scrollbar-track {
  background: rgb(30, 30, 30);
}

.suggestions::-webkit-scrollbar-thumb {
  background: rgb(50, 50, 50);
  border-radius: 4px;
}

.suggestions::-webkit-scrollbar-thumb:hover {
  background: rgb(60, 60, 60);
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .input-wrapper {
    height: 44px;
  }

  input {
    font-size: 0.85rem;
  }

  .floating-label {
    font-size: 0.85rem;
  }

  .suggestion {
    padding: 10px 14px;
  }

  .station-name {
    font-size: 0.85rem;
  }

  .station-city {
    font-size: 0.75rem;
  }
}
</style> 