<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue';
import { Store } from '@tauri-apps/plugin-store';
import StationAutocomplete from './components/StationAutocomplete.vue';
import FavoriteStation from './components/FavoriteStation.vue';
import type { Station } from './api/types/station';
import type { FavoriteStation as FavoriteStationType } from './types';

// Constants for card stack
const CARD_OFFSET = 10;
const SCALE_FACTOR = 0.06;
const ANIMATION_DURATION = 200; 

// Initialize store with path relative to app data directory
const store = new Store('.settings.dat');
const favorites = ref<FavoriteStationType[]>([]);
const currentPosition = ref(0); // Track position independently
const isLoading = ref(true);
let isAnimating = false;
let scrollTimeout: number | null = null;
let animationTimer: number | null = null;
let accumulatedDelta = 0;
let lastWheelTime = 0;

const hasSeenTutorial = ref(localStorage.getItem('hasSeenTutorial') === 'true');

const showTutorial = computed(() => {
  if (favorites.value.length > 1 && !hasSeenTutorial.value) {
    // Set tutorial as seen after a delay
    setTimeout(() => {
      hasSeenTutorial.value = true;
      localStorage.setItem('hasSeenTutorial', 'true');
    }, 5000); // Hide after 5 seconds
    return true;
  }
  return false;
});

const rotateCards = (direction: 'up' | 'down') => {
  if (favorites.value.length <= 1 || isAnimating) return;
   
  if (animationTimer) {
    window.clearTimeout(animationTimer);
  }
  
  isAnimating = true;
  
  const newFavorites = [...favorites.value];
  if (direction === 'up') {
    // Move the last card to the front
    newFavorites.unshift(newFavorites.pop()!);
    // Update position
    currentPosition.value = (currentPosition.value - 1 + favorites.value.length) % favorites.value.length;
  } else {
    // Move the first card to the back
    newFavorites.push(newFavorites.shift()!);
    // Update position
    currentPosition.value = (currentPosition.value + 1) % favorites.value.length;
  }
  favorites.value = newFavorites;
  
  animationTimer = window.setTimeout(() => {
    isAnimating = false;
    animationTimer = null;
  }, ANIMATION_DURATION);
};

const handleWheel = (event: Event) => {
  const wheelEvent = event as WheelEvent;
  wheelEvent.preventDefault();
  wheelEvent.stopPropagation();
  
  // Immediately return if animation is running or not enough cards
  if (favorites.value.length <= 1 || isAnimating) {
    // Reset accumulated delta when animation is running
    accumulatedDelta = 0;
    if (scrollTimeout) {
      window.clearTimeout(scrollTimeout);
      scrollTimeout = null;
    }
    return;
  }
  
  const now = Date.now();
  // Reset accumulated delta if enough time has passed
  if (now - lastWheelTime > 150) {
    accumulatedDelta = 0;
  }
  lastWheelTime = now;
  
  // Accumulate delta
  accumulatedDelta += Math.abs(wheelEvent.deltaY);
  
  // Clear any existing timeout
  if (scrollTimeout) {
    window.clearTimeout(scrollTimeout);
    scrollTimeout = null;
  }
  
  // Only trigger if we've accumulated enough delta
  if (accumulatedDelta > 50) {
    accumulatedDelta = 0; // Reset after triggering
    rotateCards(wheelEvent.deltaY > 0 ? 'down' : 'up');
    return;
  }
  
  // Set a short timeout to allow for delta accumulation
  scrollTimeout = window.setTimeout(() => {
    if (!isAnimating && accumulatedDelta > 0) {
      rotateCards(wheelEvent.deltaY > 0 ? 'down' : 'up');
      accumulatedDelta = 0;
    }
  }, 50);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (favorites.value.length <= 1) return;
  
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    rotateCards('up');
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    rotateCards('down');
  }
};

// Watch scroll position
onMounted(async () => {
  console.log('Component mounted, setting up listeners');
  
  // Wait for the next DOM update cycle
  await nextTick();
  
  const stackElement = document.querySelector('.favorites-stack');
  console.log('Stack element found:', !!stackElement);
  
  if (stackElement) {
    stackElement.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeydown);
    console.log('Event listeners attached');
    
    // Touch events
    let touchStartY = 0;
    
    stackElement.addEventListener('touchstart', ((e: Event) => {
      const touchEvent = e as TouchEvent;
      touchStartY = touchEvent.touches[0].clientY;
      e.preventDefault();
    }) as EventListener, { passive: false });
    
    stackElement.addEventListener('touchmove', ((e: Event) => {
      const touchEvent = e as TouchEvent;
      const touchCurrentY = touchEvent.touches[0].clientY;
      const deltaY = touchCurrentY - touchStartY;
      
      if (Math.abs(deltaY) > 50) { // Add threshold for touch movement
        rotateCards(deltaY > 0 ? 'down' : 'up');
        touchStartY = touchCurrentY; // Reset touch start position
      }
      e.preventDefault();
    }) as EventListener, { passive: false });
  }
});

onUnmounted(() => {
  const stackElement = document.querySelector('.favorites-stack');
  if (stackElement) {
    stackElement.removeEventListener('wheel', handleWheel as EventListener);
    window.removeEventListener('keydown', handleKeydown);
  }
  if (scrollTimeout) {
    window.clearTimeout(scrollTimeout);
  }
  if (animationTimer) {
    window.clearTimeout(animationTimer);
  }
});

const visibleFavorites = computed(() => {
  if (!favorites.value.length) return [];
  return [...favorites.value];
});

// Load favorites from store
onMounted(async () => {
  isLoading.value = true;
  try {
    // Check if we're in a Tauri environment
    if ('__TAURI__' in window) {
      await store.load(); // Load the store first
      const storedFavorites = await store.get('favorites');
      console.log('Loaded favorites:', storedFavorites);
      if (storedFavorites) {
        favorites.value = storedFavorites as FavoriteStationType[];
      } else {
        // Initialize favorites in store if not present
        await store.set('favorites', []);
        await store.save();
      }
    } else {
      // Fallback for development without Tauri
      console.warn('Tauri Store API not available - using memory storage');
      const storedFavorites = localStorage.getItem('favorites');
      if (storedFavorites) {
        favorites.value = JSON.parse(storedFavorites);
      } else {
        localStorage.setItem('favorites', JSON.stringify([]));
      }
    }
  } catch (error) {
    console.error('Error loading favorites:', error);
    // Initialize with empty array on error
    favorites.value = [];
  } finally {
    isLoading.value = false;
  }
});

const handleStationSelected = async (station: Station) => {
  console.log('Station selected:', station);
  
  const favorite: FavoriteStationType = {
    id: station.id,
    name: station.name,
    type: 'departure',
    updateInterval: 30 // Fixed to 30 seconds
  };

  console.log('Adding favorite:', favorite);
  favorites.value.unshift(favorite);
  
  try {
    if ('__TAURI__' in window) {
      console.log('Saving to Tauri store:', favorites.value);
      await store.set('favorites', favorites.value);
      await store.save();
    } else {
      console.log('Saving to localStorage:', favorites.value);
      localStorage.setItem('favorites', JSON.stringify(favorites.value));
    }
  } catch (error) {
    console.error('Error saving favorites:', error);
  }
};

const handleRemoveFavorite = async (index: number) => {
  console.log('Removing favorite at index:', index);
  favorites.value.splice(index, 1);
  
  try {
    if ('__TAURI__' in window) {
      console.log('Saving to Tauri store after remove:', favorites.value);
      await store.set('favorites', favorites.value);
      await store.save();
    } else {
      console.log('Saving to localStorage after remove:', favorites.value);
      localStorage.setItem('favorites', JSON.stringify(favorites.value));
    }
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
};

const handleUpdateFavorite = async (updatedFavorite: FavoriteStationType) => {
  const index = favorites.value.findIndex(f => f.id === updatedFavorite.id);
  if (index === -1) return;
  
  favorites.value[index] = updatedFavorite;
  
  try {
    if ('__TAURI__' in window) {
      console.log('Saving to Tauri store:', favorites.value);
      await store.set('favorites', favorites.value);
      await store.save();
    } else {
      console.log('Saving to localStorage:', favorites.value);
      localStorage.setItem('favorites', JSON.stringify(favorites.value));
    }
  } catch (error) {
    console.error('Error updating favorite:', error);
  }
};
</script>

<template>
  <div class="menubar-app">
    <div class="content">
      <div class="search-bar">
        <StationAutocomplete
          placeholder="Search for a station..."
          @select="handleStationSelected"
        >
          <template #prefix>
            <i class="fas fa-magnifying-glass"></i>
          </template>
        </StationAutocomplete>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="loading-content">
          <div class="loading-spinner-container">
            <div class="loading-spinner"></div>
          </div>
          <p class="loading-text">Loading your stations</p>
          <p class="loading-subtext">Please wait a moment</p>
        </div>
      </div>

      <div v-else-if="favorites.length === 0" class="empty-state">
        <div class="empty-state-content">
          <i class="fas fa-train-subway text-4xl mb-4 opacity-60"></i>
          <p class="title">No stations monitored</p>
          <p class="hint">Use the search bar above to add your first station</p>
        </div>
      </div>

      <div v-else class="favorites-container">
        <div class="favorites-stack">
          <FavoriteStation
            v-for="(favorite, index) in favorites"
            :key="favorite.id"
            :favorite="favorite"
            :style="{
              position: 'absolute',
              transformOrigin: 'top center',
              transform: `translateY(${index * -CARD_OFFSET}px) scale(${1 - index * SCALE_FACTOR})`,
              opacity: 1 - (index * 0.15),
              zIndex: favorites.length - index,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              backgroundColor: 'rgb(25, 25, 25)',
              borderRadius: '24px',
              padding: '24px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: `
                0 4px 6px -1px rgba(0, 0, 0, 0.1),
                0 2px 4px -1px rgba(0, 0, 0, 0.06),
                0 0 0 1px rgba(255, 255, 255, 0.05)
              `,
            }"
            :is-active="index === 0"
            @remove="() => handleRemoveFavorite(index)"
            @update="handleUpdateFavorite"
          />
          
          <!-- Navigation buttons and indicators -->
          <div class="nav-container" v-if="favorites.length > 1">
            <!-- Stack indicator -->
            <div class="stack-indicator">
              <div 
                v-for="i in favorites.length" 
                :key="i"
                class="indicator-dot"
                :class="{ active: (i - 1) === currentPosition }"
              ></div>
            </div>
          </div>

          <!-- Bottom navigation -->
          <div class="bottom-nav" v-if="favorites.length > 1">
            <!-- Tutorial hint -->
            <Transition name="fade">
              <div v-if="showTutorial" class="tutorial-hint">
                <span>Scroll or use ↑↓ keys to browse</span>
                <div class="tutorial-icons">
                  <i class="fas fa-mouse"></i>
                  <i class="fas fa-keyboard"></i>
                </div>
              </div>
            </Transition>

            <div class="nav-buttons">
              <button 
                class="nav-btn prev" 
                @click="rotateCards('up')"
              >
                <i class="fas fa-chevron-up"></i>
              </button>
              <button 
                class="nav-btn next" 
                @click="rotateCards('down')"
              >
                <i class="fas fa-chevron-down"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menubar-app {
  width: 100%;
  height: 100vh;
  background: rgb(25, 25, 25);
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.content {
  flex: 1;
  overflow: hidden;
  padding: 8px 0;
  background: rgb(25, 25, 25);
  display: flex;
  flex-direction: column;
  position: relative;
}

.search-bar {
  margin: 0 8px 8px;
  padding-bottom: 8px;
  border-bottom: 2px solid rgb(40, 40, 40);
  position: sticky;
  top: 0;
  background: rgb(25, 25, 25);
  z-index: 10;
}

.favorites-container {
  position: relative;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.75rem;
  min-height: 300px;
  overflow: hidden;
}

.favorites-stack {
  position: relative;
  width: 100%;
  max-width: 440px;
  height: min(350px, 70vh);
  margin: 0 auto;
  padding: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: visible;
  touch-action: none;
  user-select: none;
  perspective: 2000px;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.75rem;
  color: rgba(255, 255, 255, 0.8);
  min-height: 300px;
  overflow: hidden;
}

.empty-state-content {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.75rem;
  border-radius: 24px;
  text-align: center;
  max-width: 460px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.empty-state .title {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
}

.empty-state .hint {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgb(30, 30, 30);
}

::-webkit-scrollbar-thumb {
  background: rgb(50, 50, 50);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgb(60, 60, 60);
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .menubar-app {
    border-radius: 12px;
  }

  .content {
    padding: 8px;
  }

  .search-bar {
    margin-bottom: 8px;
    padding-bottom: 8px;
  }

  .favorites-stack {
    padding: 8px;
  }

  .nav-container {
    right: 8px;
    transform: translateY(-50%) scale(0.9);
  }
  
  .stack-indicator {
    padding: 6px 3px;
  }
  
  .indicator-dot {
    width: 5px;
    height: 5px;
  }

  .bottom-nav {
    bottom: 8px;
  }

  .tutorial-hint {
    display: none;
  }

  .nav-buttons {
    padding: 3px;
    gap: 6px;
  }

  .nav-btn {
    width: 24px;
    height: 24px;
    font-size: 0.7rem;
  }
}

.nav-container {
  position: absolute;
  right: -48px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 100;
}

.bottom-nav {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 100;
}

.nav-buttons {
  display: flex;
  flex-direction: row;
  gap: 6px;
  background: rgba(0, 0, 0, 0.85);
  padding: 4px;
  border-radius: 10px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stack-indicator {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 3px;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.indicator-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transition: all 0.2s ease;
}

.indicator-dot.active {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.2);
}

.tutorial-hint {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.85);
  padding: 6px 12px;
  border-radius: 12px;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  white-space: nowrap;
}

.tutorial-icons {
  display: flex;
  gap: 6px;
  opacity: 0.7;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Update FavoriteStation styling in the parent component */
:deep(.favorite-station) {
  width: 100%;
  max-width: 460px;
  min-height: min(320px, 60vh);
  height: auto;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgb(25, 25, 25);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
}

:deep(.favorite-station.active) {
  transform: none;
}

/* Add this to make the split flap display wider */
:deep(.favorite-station .departures) {
  margin: 0 -16px;
  padding: 0 0px;
  width: calc(100% + 32px);
  overflow-x: hidden;
}

/* Add this to ensure the split flap display has its own transform context */
:deep(.departure-board) {
  transform-style: preserve-3d;
  perspective: 1000px;
  transform: translateZ(0);
  backface-visibility: hidden;
  position: relative;
  z-index: 1;
}

/* Loading state styles */
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.75rem;
  min-height: 300px;
  overflow: hidden;
}

.loading-content {
  background: rgba(255, 255, 255, 0.05);
  padding: 2rem;
  border-radius: 24px;
  text-align: center;
  max-width: 460px;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.loading-spinner-container {
  width: 48px;
  height: 48px;
  position: relative;
  margin-bottom: 0.5rem;
}

.loading-spinner {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: rgba(255, 255, 255, 0.9);
  animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.loading-spinner::before {
  content: '';
  position: absolute;
  inset: -6px;
  border: 2px solid transparent;
  border-radius: 50%;
  border-top-color: rgba(255, 255, 255, 0.2);
  animation: spin 2s linear infinite;
}

.loading-text {
  font-size: 1.1rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

.loading-subtext {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Adjust max-width for better fit */
.favorites-stack, .empty-state-content, :deep(.favorite-station) {
  max-width: 440px;
}

.nav-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.75rem;
  padding: 0;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 1);
  transform: translateY(-1px);
}

.nav-btn:active:not(:disabled) {
  transform: translateY(0);
  background: rgba(255, 255, 255, 0.15);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
