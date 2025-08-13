// Estado e constantes globais em JS clássico (não-módulo) para manter compatibilidade
// com o gerador de mapa original (mapa/geracao.js) e evitar alterar sua API.

// Pausa
var isPaused = false;

// Canvas
var canvas = null;
var ctx = null;

// Tamanho do tile e dimensões do mapa (ajustados ao carregar cada sala)
var TILE_SIZE = 20;
var MAP_WIDTH_TILES = 30;
var MAP_HEIGHT_TILES = 30;

// Constantes de jogo
var PLAYER_EMOJI = '🧔🏿';
var ENEMY_TYPES = {
  GRUNT:   { symbols: ['👺','💀', '🧟‍♂️', '👻'], hp: 10,  attack: 2, ai: 'melee',   fov: 6,  moveCooldown: 0 },
  TANK:    { symbols: ['🗿', '🦍'], hp: 30,  attack: 1, ai: 'melee',   fov: 5,  moveCooldown: 1 },
  BRUTE:   { symbols: ['🦖','🐻','🦁'],  hp: 40,  attack: 2, ai: 'melee',   fov: 5,  moveCooldown: 2 },
  ASSASSIN:{ symbols: ['🧛🏻‍♀️','🦂','🧛🏻‍♀️','🦂', '🧛🏻‍♀️','🦂','🧛🏻‍♀️','🦂', '🐇'],  hp: 8,   attack: 4, ai: 'melee',   fov: 9,  moveCooldown: 0 },
  BOSS:    { symbols: ['🐲', '👹'],  hp: 100, attack: 5, ai: 'melee',   fov: 8,  moveCooldown: 0 },
  RANGED:  { symbols: ['🏹'], hp: 14,  attack: 3, ai: 'ranged',  fov: 10, moveCooldown: 0, range: 6 },
  MAGE:    { symbols: ['🧙‍♀️'],hp: 12,  attack: 4, ai: 'ranged',  fov: 12, moveCooldown: 1, range: 7 },
  SPAWNER: { symbols: ['👥','🥚'], hp: 22,  attack: 0, ai: 'spawner', fov: 6,  moveCooldown: 2, spawnRate: 3 }
};
var SPEECH_FONT = "10px 'Press Start 2P'";
var EMOJI_FONT = "18px sans-serif";

// Estado de jogo
var map; // matriz de tiles
var player; // {x, y, isAttacking, attackTimer}
var enemies; // []
var items; // []
var villages; // []
var npcs; // []
var dungeonLevel = 1;
var activeDialogue = null;

// Salas (do gerador)
var salas = [];
var currentSala = 0;

// Estado do jogador
var playerState = {
  maxHp: 100, hp: 100,
  attack: 5,
  inventory: [], keys: 0,
  equippedItem: { 
    name: "Espada", 
    type: "equipamento", 
    effect: { attackPattern: 'default' }, 
    symbol: '⚔️' 
  },
  attackPattern: 'default',
  lastDirection: { x: 0, y: 1 }
};

// Log de mensagens
var messageLog = [];

// Elementos de UI (preenchidos no bootstrap)
var hpValueEl, hpBarEl, attackValueEl, equippedItemEl,
    inventoryListEl, dungeonLevelEl, logListEl, modalEl, modalTextEl, modalButton,
    pauseOverlay, resumeButton, pauseButton, restartButton;

// Áudio
var sounds;
var audioInitialized = false;
