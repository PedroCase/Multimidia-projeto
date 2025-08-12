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

export function draw() {
  if (!player) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
    for (let x = 0; x < MAP_WIDTH_TILES; x++) {
      const tile = map[y][x];
      ctx.fillStyle = getTileColor(tile, salas[currentSala]);
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
      else if (tile === TILES.KEY) { ctx.fillText('🔑', centerX, centerY); }
    }
  }

  items.forEach(item => {
    ctx.font = EMOJI_FONT;
    ctx.fillText(item.symbol, item.x * TILE_SIZE + TILE_SIZE / 2, item.y * TILE_SIZE + TILE_SIZE / 2 + 1);
  });

  npcs.forEach(npc => {
    ctx.font = EMOJI_FONT;
    ctx.fillText('🧙', npc.x * TILE_SIZE + TILE_SIZE / 2, npc.y * TILE_SIZE + TILE_SIZE / 2 + 1);
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
