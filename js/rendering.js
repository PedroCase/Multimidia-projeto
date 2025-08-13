// rendering.js - desenho do mapa, entidades e loop do jogo
import { getAttackTiles } from './gameplay.js';

let lastTime = 0;

export function gameLoop(timestamp) {
  if (!isPaused) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (player && player.isAttacking) {
      player.attackTimer -= deltaTime;
      if (player.attackTimer <= 0) player.isAttacking = false;
    }

    draw();
  }

  requestAnimationFrame(gameLoop);
}

const TREE_EMOJIS = ['🌲', '🌴', '🌳', '🌳', '🌳', '🎄', '🌲', '🌴', '🌲', '🌴',  '🌳', '🌳', '🌳']
export function draw() {
  if (!player) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
    for (let x = 0; x < MAP_WIDTH_TILES; x++) {
      const tile = map[y][x];
      ctx.fillStyle = getTileColor(tile, salas[currentSala], x, y);
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  ctx.font = EMOJI_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
    for (let x = 0; x < MAP_WIDTH_TILES; x++) {
      const tile = map[y][x];
      const centerX = x * TILE_SIZE + TILE_SIZE / 2;
      const centerY = y * TILE_SIZE + TILE_SIZE / 2 + 1;
      if (tile === TILES.DOOR) { ctx.fillText('🚪', centerX, centerY); }
      else if (tile === TILES.CLOSED_DOOR) { ctx.fillText('🔒', centerX, centerY); }
      else if (tile === TILES.BOSS_DOOR) { ctx.fillText('🪜', centerX, centerY); }
      else if (tile === TILES.KEY) { ctx.fillText('🔑', centerX, centerY); }
      else if (tile === TILES.TREE) { let emo = TREE_EMOJIS[Math.floor((213124^x*y^2145325341+63455)%TREE_EMOJIS.length)]; ctx.fillText(emo, centerX, centerY); }
    }
  }

  items.forEach(item => {
    ctx.font = EMOJI_FONT;
    ctx.fillText(item.symbol, item.x * TILE_SIZE + TILE_SIZE / 2, item.y * TILE_SIZE + TILE_SIZE / 2 + 1);
  });

  npcs.forEach(npc => {
    ctx.font = EMOJI_FONT;
    ctx.fillText('👴', npc.x * TILE_SIZE + TILE_SIZE / 2, npc.y * TILE_SIZE + TILE_SIZE / 2 + 1);
  });

  // Vilas são desenhadas a partir do array "villages" para evitar conflito com chaves
  villages.forEach(v => {
    ctx.font = EMOJI_FONT;
    ctx.fillText('⛺', v.x * TILE_SIZE + TILE_SIZE / 2, v.y * TILE_SIZE + TILE_SIZE / 2 + 1);
  });

  if (player.isAttacking) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--attack-viz-color').trim();
    getAttackTiles().forEach(tile => ctx.fillRect(tile.x * TILE_SIZE, tile.y * TILE_SIZE, TILE_SIZE, TILE_SIZE));
  }

  enemies.forEach(enemy => {
    const centerX = enemy.x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = enemy.y * TILE_SIZE + TILE_SIZE / 2 + 1;
    ctx.font = EMOJI_FONT;
    ctx.fillText(enemy.symbol, centerX, centerY);

    const hpPercentage = enemy.hp / enemy.maxHp;
    const barWidth = TILE_SIZE * 0.8;
    const barX = enemy.x * TILE_SIZE + (TILE_SIZE - barWidth) / 2;
    const barY = enemy.y * TILE_SIZE - 8;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--hp-bar-bg').trim();
    ctx.fillRect(barX, barY, barWidth, 4);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--hp-bar-enemy').trim();
    ctx.fillRect(barX, barY, barWidth * hpPercentage, 4);
  });

  ctx.font = EMOJI_FONT;
  ctx.fillText(PLAYER_EMOJI, player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE + TILE_SIZE / 2 + 1);

  if (activeDialogue) drawSpeechBubble(activeDialogue.npc);
}

export function drawSpeechBubble(npc) {
  const text = npc.dialogue;
  ctx.font = SPEECH_FONT;
  const textWidth = ctx.measureText(text).width;
  const bubbleWidth = textWidth + 20;
  const bubbleHeight = 30;
  let bubbleX = npc.x * TILE_SIZE + TILE_SIZE / 2 - bubbleWidth / 2;
  let bubbleY = npc.y * TILE_SIZE - bubbleHeight - 5;

  if (bubbleX < 0) bubbleX = 0;
  if (bubbleX + bubbleWidth > canvas.width) bubbleX = canvas.width - bubbleWidth;
  if (bubbleY < 0) bubbleY = npc.y * TILE_SIZE + TILE_SIZE;

  const style = getComputedStyle(document.documentElement);
  ctx.fillStyle = style.getPropertyValue('--speech-bubble-bg').trim();
  ctx.strokeStyle = style.getPropertyValue('--speech-bubble-border').trim();
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, [8]);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = style.getPropertyValue('--text-color').trim();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2);
}


const palettes = {
  floor: {
    caverna: ["#57574fff","#525043ff","#6a6a6a"],
    floresta: ["#2f5d34","#4a8a4a","#7fc07f","#5b8a5b"],
    pantano:  ["#394f44","#556e5f","#6f876f","#91a491"],
    deserto:  ["#f1d7a6","#e6c791","#dcc07a","#f6e6b0"],
    ruinas:    ["#8a8a82","#a3a39b","#6f6f67","#b6b6ad"],
  },
  wall: {
    caverna: ["#222","#242223ff","#110c19ff"],
    floresta: ["#253f25","#2a4d2a","#354e35"],
    pantano:  ["#273538","#304646","#2b3b3c"],
    deserto:  ["#c9a77d","#b69162","#a57e4f"],
    ruinas:    ["#525252","#646464","#4a4a4a"],
  },
  tree: {
    floresta: ["#1f6f1f","#2b7a2b","#196619"],
    pantano:  ["#355c3a","#4d6b46","#5e7a55"],
    deserto:  ["#7b6b32","#987f3f","#6a5b2a"],
    ruinas:    ["#3e5a3e","#567556"]
  },
  water: {
    default: ["#336677","#2a5767ff","#335e77ff"],
    pantano:  ["#336677","#2a5767ff","#335e77ff"],
    caverna:  ["#336677","#2a5767ff","#335e77ff"]
  },
  mud:   ["#463b3bff","#483d3dff","#423d3bff"],
  sand:  ["#ffe4a1","#ffedb8","#f7d98b"],
  rock:  ["#555","#666","#4a4a4a","#777"],
  brick:  ["#aa7f4d", "#bf8f5e", "#9a6f3d"],
};

function hashXY(x, y){
  x = x|0; y = y|0;
  return ((x^412534325 *(y+56436)) + 1872421) ^ x ^ y;
}

// Escolhe cor da paleta de forma determinística por (X,Y)
function chooseFromPalette(type, bioma = null, X = 0, Y = 0) {
  const entry = palettes[type];
  if (!entry) return "#000000";
  const arr = Array.isArray(entry) ? entry : (entry[bioma] || entry.default || Object.values(entry).flat());
  if (!arr || !arr.length) return "#000000";
  return arr[(hashXY(X, Y) >>> 0) % arr.length];
}

// getTileColor compacto
function getTileColor(tile, sala, X = 0, Y = 0) {
  switch (tile) {
    case TILES.WALL:        return chooseFromPalette("wall",  sala.bioma, X, Y) || "#444";
    case TILES.FLOOR:       return chooseFromPalette("floor", sala.bioma, X, Y) || "#888";
    case TILES.TREE:        return chooseFromPalette("tree",  sala.bioma, X, Y) || "#228b22";
    case TILES.WATER:       return chooseFromPalette("water", sala.bioma, X, Y) || "#2a6b82"
    case TILES.MUD:         return chooseFromPalette("mud",   sala.bioma, X, Y) || "#553333";
    case TILES.SAND:        return chooseFromPalette("sand",  sala.bioma, X, Y) || "#ffe4a1";
    case TILES.ROCK:        return chooseFromPalette("rock",  sala.bioma, X, Y) || "#555";
    case TILES.BRICK:       return chooseFromPalette("brick", sala.bioma, X, Y) || "#aa7f4d";
    case TILES.RUBBLE:      return chooseFromPalette("floor", sala.bioma, X, Y) || "#888";
    case TILES.LAVA:        return "#cc3300";
    case TILES.ASH:         return "#666";
    case TILES.DOOR:        return chooseFromPalette("wall",  sala.bioma, X, Y) || "#d29b48";
    case TILES.CLOSED_DOOR: return chooseFromPalette("wall",  sala.bioma, X, Y) || "#b71b1b";
    case TILES.KEY:         return chooseFromPalette("floor", sala.bioma, X, Y) || "#888";
    default:                return "#ff00ff"; // debug
  }
}
