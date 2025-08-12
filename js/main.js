// main.js - bootstrap do jogo modular JS puro
import { gameLoop } from './rendering.js';
import { initLevel } from './level.js';
import { setupControls } from './controls.js';
import { showModal } from './ui.js';

function bootstrap() {
  // Bind dos elementos DOM globais (mantém API original)
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  hpValueEl = document.getElementById('hp-value');
  hpBarEl = document.getElementById('hp-bar');
  attackValueEl = document.getElementById('attack-value');
  attackPatternEl = document.getElementById('attack-pattern-value');
  classNameEl = document.getElementById('class-name');
  inventoryListEl = document.getElementById('inventory-list');
  dungeonLevelEl = document.getElementById('dungeon-level');
  logListEl = document.getElementById('log-list');
  modalEl = document.getElementById('modal');
  modalTextEl = document.getElementById('modal-text');
  modalButton = document.getElementById('modal-button');
  pauseOverlay = document.getElementById('pause-overlay');
  resumeButton = document.getElementById('resume-button');
  pauseButton = document.getElementById('pause-button');

  // Dimensões iniciais baseadas no estado default
  canvas.width = MAP_WIDTH_TILES * TILE_SIZE;
  canvas.height = MAP_HEIGHT_TILES * TILE_SIZE;

  setupControls();

  showModal("Bem-vindo ao Labirinto Infinito! Use WASD/Setas para mover e Espaço para atacar.");
  initLevel();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', bootstrap);
