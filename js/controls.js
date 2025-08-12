// controls.js - teclado e botões de pausa
import { initAudio } from './audio.js';
import { movePlayer, playerAttack } from './gameplay.js';
import { togglePause } from './ui.js';

export function setupControls() {
  pauseButton.addEventListener('click', togglePause);
  resumeButton.addEventListener('click', togglePause);

  window.addEventListener('keydown', (e) => {
    initAudio();
    if (modalEl.style.display === 'flex') return;

    if (e.key === 'Escape') {
      togglePause();
      return;
    }

    if (isPaused) return;

    switch (e.key) {
      case 'ArrowUp': case 'w': movePlayer(0, -1); break;
      case 'ArrowDown': case 's': movePlayer(0, 1); break;
      case 'ArrowLeft': case 'a': movePlayer(-1, 0); break;
      case 'ArrowRight': case 'd': movePlayer(1, 0); break;
      case ' ': case 'Enter': playerAttack(); break;
    }
  });
}
