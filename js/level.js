// level.js - carregamento de salas e progressão
import { placeEntities } from './gameplay.js';
import { addLog, showModal } from './ui.js';

export function initLevel() {
  const seed = Math.floor(Date.now() / 10);
  salas = gerarMapa(seed); // do arquivo original (não alterado)
  currentSala = 0;
  loadSala(0);
}

export function loadSala(id) {
  const sala = salas[id];
  MAP_WIDTH_TILES = sala.map[0].length;
  MAP_HEIGHT_TILES = sala.map.length;
  canvas.width = MAP_WIDTH_TILES * TILE_SIZE;
  canvas.height = MAP_HEIGHT_TILES * TILE_SIZE;

  // Sempre reconstroi o mapa base a partir do gerador
  map = sala.map.map(r => r.slice());

  // Se já houver estado salvo desta sala, restaura
  if (sala._state) {
    enemies = sala._state.enemies.map(e => ({ ...e }));
    items = sala._state.items.map(i => ({ ...i }));
    npcs = sala._state.npcs.map(n => ({ ...n }));
    villages = sala._state.villages.map(v => ({ ...v }));

    // Restaura chave se não tiver sido pega
    if (sala._state.key && !sala._state.key.picked) {
      const { x, y } = sala._state.key.pos;
      map[y][x] = TILES.KEY;
    }
  } else {
    // Primeira visita: gera entidades e salva estado inicial
    placeEntities();

    // Descobre onde a chave foi colocada (se houver)
    let keyPos = null;
    for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
      for (let x = 0; x < MAP_WIDTH_TILES; x++) {
        if (map[y][x] === TILES.KEY) { keyPos = { x, y }; break; }
      }
      if (keyPos) break;
    }

    sala._state = {
      enemies: enemies.map(e => ({ ...e })),
      items: items.map(i => ({ ...i })),
      npcs: npcs.map(n => ({ ...n })),
      villages: villages.map(v => ({ ...v })),
      key: keyPos ? { pos: keyPos, picked: false } : null,
      openDoors: [],
    };
  }
}

export function nextLevel() {
  dungeonLevel++;
  addLog("O chão treme... o labirinto se reconfigura!");
  if (audioInitialized) sounds.nextLevel.triggerAttackRelease("C4", "2n");
  init(); // Mantém a assinatura original; definimos init() abaixo
}

export function gameOver() {
  showModal(`Você foi derrotado no nível ${dungeonLevel}... O ciclo recomeça.`, true);
  resetGame();
}

function resetGame() {
  dungeonLevel = 1;
  playerState.maxHp = 100;
  playerState.hp = 100;
  playerState.attack = 5;
  playerState.inventory = [];
  playerState.keys = 0;
  playerState.className = "Aventureiro";
  playerState.attackPattern = 'default';
  messageLog.length = 0;
  init();
}

// Compatibilidade: algumas partes chamam init(); delegamos para initLevel()
export function saveCurrentSalaState() {
  const sala = salas[currentSala];
  if (!sala) return;
  if (!sala._state) sala._state = {};

  sala._state.enemies = enemies.map(e => ({ ...e }));
  sala._state.items = items.map(i => ({ ...i }));
  sala._state.npcs = npcs.map(n => ({ ...n }));
  sala._state.villages = villages.map(v => ({ ...v }));

  if (sala._state.key) {
    const { x, y } = sala._state.key.pos;
    sala._state.key.picked = map[y][x] !== TILES.KEY;
  }

  // Persistir portas abertas (viram piso)
  try {
    const opened = (salas[currentSala].portas || []).filter(p => map[p.y][p.x] === TILES.FLOOR);
    sala._state.openDoors = opened.map(({ x, y }) => ({ x, y }));
  } catch (_) { /* no-op */ }
}

export function init() { initLevel(); }
