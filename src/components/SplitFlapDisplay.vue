<!-- SplitFlapDisplay.vue -->
<template>
  <div class="departure-board">
    <div class="row" v-for="(row, rowIndex) in rows" :key="rowIndex">
      <span
        v-for="(letter, letterIndex) in row"
        :key="letterIndex"
        class="letter"
      >
        <span class="flap top">
          <span class="text">{{ letter.currentChar }}</span>
        </span>
        <span class="flap bottom">
          <span class="text">{{ letter.currentChar }}</span>
        </span>
        <span class="fold">
          <span class="flap falling" ref="falling">
            <span class="text" ref="fallingText">{{ letter.fallingChar }}</span>
          </span>
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue';

const LETTERS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,':()&!?+-";
const DROP_TIME = 20;

interface Letter {
  currentChar: string;
  fallingChar: string;
  index: number;
  interval: number | null;
  stopAt: number | null;
}

const props = withDefaults(defineProps<{
  text: string | string[];
  letterCount?: number;
  rowCount?: number;
}>(), {
  letterCount: 25,
  rowCount: 1
});

const rows = ref<Letter[][]>([]);

const processText = (text: string | string[]) => {
  const textRows = Array.isArray(text) ? text : [text];
  const result: Letter[][] = [];
  
  // Create rows based on rowCount
  for (let r = 0; r < props.rowCount; r++) {
    const row: Letter[] = [];
    for (let l = 0; l < props.letterCount; l++) {
      row.push({
        currentChar: ' ',
        fallingChar: ' ',
        index: 0,
        interval: null,
        stopAt: null
      });
    }
    result.push(row);
  }
  
  return result;
};

const tickLetter = (rowIndex: number, letterIndex: number) => {
  const letter = rows.value[rowIndex][letterIndex];
  const oldValue = LETTERS.charAt(letter.index);
  
  letter.index = (letter.index + 1) % LETTERS.length;
  const newValue = LETTERS.charAt(letter.index);

  // Get DOM elements
  const falling = document.querySelectorAll('.row')[rowIndex]
    .querySelectorAll('.falling')[letterIndex] as HTMLElement;
  const fallingText = falling.querySelector('.text') as HTMLElement;
  const topText = document.querySelectorAll('.row')[rowIndex]
    .querySelectorAll('.top .text')[letterIndex] as HTMLElement;
  const bottomText = document.querySelectorAll('.row')[rowIndex]
    .querySelectorAll('.bottom .text')[letterIndex] as HTMLElement;

  // Set transition duration
  fallingText.style.webkitTransitionDuration = 
  fallingText.style.transitionDuration = `${DROP_TIME * 0.5}ms`;
  
  // First phase
  fallingText.innerHTML = oldValue;
  falling.style.display = 'block';
  topText.innerHTML = newValue;

  // Start falling animation
  setTimeout(() => {
    fallingText.style.webkitTransitionTimingFunction = 
    fallingText.style.transitionTimingFunction = 'ease-in';
    
    fallingText.style.webkitTransform = 
    fallingText.style.transform = 'scaleY(0)';
  }, 1);

  // Mid-flip
  setTimeout(() => {
    fallingText.innerHTML = newValue;
    falling.style.top = '-0.03em';
    falling.style.bottom = 'auto';
    fallingText.style.top = '-0.65em';
    
    fallingText.style.webkitTransitionTimingFunction = 
    fallingText.style.transitionTimingFunction = 'ease-out';
    
    fallingText.style.webkitTransform = 
    fallingText.style.transform = 'scaleY(1)';
  }, DROP_TIME / 2);

  // End flip
  setTimeout(() => {
    bottomText.innerHTML = newValue;
    falling.style.display = 'none';
    falling.style.top = 'auto';
    falling.style.bottom = '0';
    fallingText.style.top = '0';

    if (letter.index === letter.stopAt) {
      clearInterval(letter.interval!);
      letter.interval = null;
    }
  }, DROP_TIME);
};

const spinLetter = (rowIndex: number, letterIndex: number) => {
  const letter = rows.value[rowIndex][letterIndex];
  if (letter.interval) return;
  
  letter.interval = window.setInterval(() => {
    tickLetter(rowIndex, letterIndex);
  }, DROP_TIME * 1.1);
};

const setLetterValue = (rowIndex: number, letterIndex: number, value: string) => {
  const letter = rows.value[rowIndex][letterIndex];
  letter.stopAt = LETTERS.indexOf(value);
  
  if (letter.stopAt < 0) letter.stopAt = 0;
  if (!letter.interval && letter.index !== letter.stopAt) {
    spinLetter(rowIndex, letterIndex);
  }
};

const setValue = (value: string | string[]) => {
  const values = Array.isArray(value) ? value : [value];
  
  // Clear any existing intervals
  rows.value.forEach((row, r) => {
    row.forEach((letter) => {
      if (letter.interval) {
        clearInterval(letter.interval);
        letter.interval = null;
      }
    });
  });

  // Set new values with minimal row offset
  values.forEach((rowText, rowIndex) => {
    if (rowIndex >= props.rowCount) return; // Skip if we have more texts than rows
    
    const text = rowText.toUpperCase();
    const rowStartDelay = rowIndex * 5; // Tiny 5ms offset between rows
    
    for (let i = 0; i < props.letterCount; i++) {
      const letterValue = text.charAt(i) || ' ';
      const letterDelay = i * 50; // 20ms between letters in same row
      
      setTimeout(() => {
        setLetterValue(rowIndex, i, letterValue);
      }, rowStartDelay + letterDelay);
    }
  });
};

// Initialize board
onMounted(async () => {
  rows.value = processText(" ".repeat(props.letterCount));
  await nextTick();
  setValue(props.text);
});

// Update when text or rowCount changes
watch([() => props.text, () => props.rowCount], ([newText, newRowCount]) => {
  if (rows.value.length !== newRowCount) {
    rows.value = processText(" ".repeat(props.letterCount));
  }
  setValue(newText);
});
</script>

<style scoped>
.departure-board {
  padding: 0.36em;
  display: inline-block;
  line-height: 1.3em;
  background: rgb(30, 30, 30);
  -webkit-border-radius: 0.21em;
  -moz-border-radius: 0.21em;
  border-radius: 0.21em;
  color: #eee;
  font-family: Helvetica;
}

.row {
  display: block;
  white-space: nowrap;
  margin: 0.3em 0;
}

.letter {
  display: inline-block;
  width: 1em;
  margin: 0 0.1em;
  height: 1.3em;
  text-align: center;
  position: relative;
  -webkit-box-shadow: 
    inset 0 -0.07em 0 rgba(50, 50, 50, 0.7),
    inset 0 -0.14em 0 rgba(0, 0, 0, 0.7),
    inset 0.14em 0 0.28em rgba(0, 0, 0, 0.9),
    inset -0.14em 0 0.28em rgba(0, 0, 0, 0.9),
    0 0.07em 0 rgba(255, 255, 255, 0.2);
  -moz-box-shadow: 
    inset 0 -0.07em 0 rgba(50, 50, 50, 0.7),
    inset 0 -0.14em 0 rgba(0, 0, 0, 0.7),
    inset 0.14em 0 0.28em rgba(0, 0, 0, 0.9),
    inset -0.14em 0 0.28em rgba(0, 0, 0, 0.9),
    0 0.07em 0 rgba(255, 255, 255, 0.2);
  -o-box-shadow: 
    inset 0 -0.07em 0 rgba(50, 50, 50, 0.7),
    inset 0 -0.14em 0 rgba(0, 0, 0, 0.7),
    inset 0.14em 0 0.28em rgba(0, 0, 0, 0.9),
    inset -0.14em 0 0.28em rgba(0, 0, 0, 0.9),
    0 0.07em 0 rgba(255, 255, 255, 0.2);
  box-shadow: 
    inset 0 -0.07em 0 rgba(50, 50, 50, 0.7),
    inset 0 -0.14em 0 rgba(0, 0, 0, 0.7),
    inset 0.14em 0 0.28em rgba(0, 0, 0, 0.9),
    inset -0.14em 0 0.28em rgba(0, 0, 0, 0.9),
    0 0.07em 0 rgba(255, 255, 255, 0.2);
}

.letter::before {
  border-top: 0.07em solid rgba(0, 0, 0, 0.4);
  border-bottom: 0.07em solid rgba(255, 255, 255, 0.08);
  height: 0;
  position: relative;
  width: 100%;
  left: 0;
  top: 0.62em;
  content: " ";
  display: block;
  z-index: 2;
  -moz-transform: translate(0, -0.05em);
  -o-transform: translate(0, -0.1em);
}

.fold {
  display: block;
  position: absolute;
  height: 0;
  top: 0.65em;
}

.flap {
  display: block;
  position: absolute;
  top: 0;
  width: 1em;
  height: 0.65em;
  margin: 0;
  overflow: hidden;
}

.text {
  width: 100%;
}

.bottom {
  top: 0.65em;
}

.bottom .text {
  position: relative;
  top: -0.65em;
}

.falling {
  display: none;
  bottom: 0;
  top: auto;
}

.falling .text {
  -webkit-backface-visibility: hidden;
  border-top: 0.03em solid #444;
  border-bottom: 0.03em solid #444;
  background: #000;
  display: block;
  position: relative;
  -webkit-transform: scaleY(1);
  -moz-transform: scaleY(1);
  -o-transform: scaleY(1);
  transform: scaleY(1);
  -webkit-transition: -webkit-transform linear;
  -moz-transition: -moz-transform linear;
  -o-transition: -o-transform linear;
  transition: transform linear;
}
</style> 