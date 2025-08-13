// gameplay.js - movimentação, combate e interações
import { addLog, updateUI, showModal } from './ui.js';
import { gameOver, loadSala, saveCurrentSalaState } from './level.js';

function getFloorPositions() {
  const floorPositions = [];
  for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
    for (let x = 0; x < MAP_WIDTH_TILES; x++) {
      if (floorTiles.has(map[y][x])) floorPositions.push({ x, y });
    }
  }
  return floorPositions;
}

export function placeEntities() {
  const floorPositions = getFloorPositions();

  const playerPos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
  player = { x: playerPos.x, y: playerPos.y, isAttacking: false, attackTimer: 0 };

  enemies = [];
  if (dungeonLevel % 5 === 0) {
    addLog("Um arrepio percorre sua espinha... Uma presença poderosa está aqui!");
    const pos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
    const bossData = ENEMY_TYPES.BOSS;
    const bossSymbol = (bossData.symbols || [bossData.symbol])[0];
    enemies.push({
      ...pos,
      type: 'BOSS',
      symbol: bossSymbol,
      ai: bossData.ai || 'melee',
      hp: bossData.hp * dungeonLevel,
      maxHp: bossData.hp * dungeonLevel,
      attack: bossData.attack + dungeonLevel,
      fov: bossData.fov || 8,
      range: bossData.range || 0,
      moveCooldown: bossData.moveCooldown || 0,
      cooldown: 0
    });
  } else {
    const numEnemies = 3 + dungeonLevel;
    for (let i = 0; i < numEnemies; i++) {
      if (floorPositions.length === 0) break;
      const pos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
      const roll = Math.random();
      let type = 'GRUNT';
      if (roll > 0.9) type = 'SPAWNER';
      else if (roll > 0.8) type = 'MAGE';
      else if (roll > 0.65) type = 'RANGED';
      else if (roll > 0.5) type = 'ASSASSIN';
      else if (roll > 0.35) type = 'TANK';

      const proto = ENEMY_TYPES[type];
      const symbolList = proto.symbols || [proto.symbol || '👾'];
      const symbol = symbolList[Math.floor(Math.random() * symbolList.length)];
      const hpBase = Math.max(1, proto.hp + Math.floor(dungeonLevel * 1.5));
      const attackBase = Math.max(1, (proto.attack ?? 1) + Math.floor(dungeonLevel / 2));

      enemies.push({
        ...pos,
        type,
        ai: proto.ai || 'melee',
        symbol,
        hp: hpBase,
        maxHp: hpBase,
        attack: attackBase,
        fov: proto.fov || 6,
        range: proto.range || 0,
        moveCooldown: proto.moveCooldown || 0,
        cooldown: 0,
        spawnRate: proto.spawnRate || 0,
        spawnCooldown: proto.spawnRate ? proto.spawnRate : 0
      });
    }
  }

  items = [];
  const possibleItems = [
    { name: "Espada", type: "equipamento", effect: { maxHp: 100, attackPattern: 'default' }, symbol: '⚔️' },
    { name: "Tomo Arcano", type: "equipamento", effect: { maxHp: 100, attackPattern: 'magic' }, symbol: '📖' },
    { name: "Escudo", type: "equipamento", effect: { maxHp: 150, attackPattern: 'shield' }, symbol: '🛡️' },
    { name: "Poção de Cura", type: "consumivel", effect: { heal: 25 }, symbol: '🧪' },
    { name: "Lança", type: "equipamento", effect: { maxHp: 100, attackPattern: 'line' }, symbol: '🔱' },
    { name: "Mangual", type: "equipamento", effect: { maxHp: 100, attackPattern: 'wide' }, symbol: '⛓️' }
  ];
  const numItems = 2 + Math.floor(dungeonLevel / 3);
  for (let i = 0; i < numItems; i++) {
    if (floorPositions.length === 0) break;
    const pos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
    const itemProto = possibleItems[Math.floor(Math.random() * possibleItems.length)];
    items.push({ ...itemProto, ...pos });
  }

  npcs = [];
  const numNpcs = Math.random() > 0.3 ? 1 : 0;
  if (numNpcs > 0 && floorPositions.length > 0) {
    const pos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
    npcs.push({ ...pos });
  }

  // Entidades de acampamento (vilas) ficam fora do mapa base para evitar conflito com KEY
  villages = [];

  if (floorPositions.length > 1) {
    const keyPos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
    map[keyPos.y][keyPos.x] = TILES.KEY;
  }

  if (Math.random() < 0.3 && floorPositions.length > 0) {
    const villagePos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
    villages.push({ ...villagePos });
  }
}

export function movePlayer(dx, dy) {
  if (player.isAttacking) return;

  if (dx !== 0 || dy !== 0) playerState.lastDirection = { x: dx, y: dy };

  const newX = player.x + dx;
  const newY = player.y + dy;

  if (enemies.some(e => e.x === newX && e.y === newY)) return;

  if (newX < 0 || newX >= MAP_WIDTH_TILES || newY < 0 || newY >= MAP_HEIGHT_TILES) return;

  const targetTile = map[newY][newX];

  if (floorTiles.has(targetTile) || targetTile === TILES.KEY || targetTile === TILES.VILLAGE) {
    player.x = newX;
    player.y = newY;
    handleInteractions();
    checkNpcInteraction();
    moveEnemies();
    updateUI();
  } 
  else if (targetTile === TILES.DOOR) {
    // Porta pode ser trancada ou não; usar mapeamento por porta->vizinha
    const viz = salas[currentSala].getVizinha(newX, newY);
    const outroLado = viz.sala.getPortaToViz(currentSala);
    
    // Porta destrancada: transita sem consumir chave
    const prevSala = currentSala;
    currentSala = viz.sala.id;
    loadSala(currentSala);
    if (audioInitialized) sounds.door.triggerAttackRelease("8n");
    if (outroLado) { player.x = outroLado.x; player.y = outroLado.y; }
    addLog(`Você atravessou a porta para a sala ${viz.sala.id}.`);
    updateUI();
    return;
  } 
  else if(targetTile === TILES.CLOSED_DOOR)
  {
    const viz = salas[currentSala].getVizinha(newX, newY);
    const outroLado = viz.sala.getPortaToViz(currentSala);

      if (playerState.keys > 0) {
        // Abrir porta na sala atual
        map[newY][newX] = TILES.DOOR;
        if (!salas[currentSala]._state) salas[currentSala]._state = { openDoors: [] };
        salas[currentSala]._state.openDoors = Array.from(new Set([...(salas[currentSala]._state.openDoors || []).map(p => `${p.x},${p.y}`), `${newX},${newY}`])).map(s => ({ x: +s.split(',')[0], y: +s.split(',')[1] }));

        // Salva estado e consome chave
        saveCurrentSalaState();
        playerState.keys--;

        // Transição
        const prevSala = currentSala;
        currentSala = viz.sala.id;
        loadSala(currentSala);
        if (audioInitialized) sounds.door.triggerAttackRelease("8n");

        // Abre a porta correspondente na sala de destino
        if (outroLado) {
          map[outroLado.y][outroLado.x] = TILES.DOOR;
          if (!salas[currentSala]._state) salas[currentSala]._state = { openDoors: [] };
          salas[currentSala]._state.openDoors = Array.from(new Set([...(salas[currentSala]._state.openDoors || []).map(p => `${p.x},${p.y}`), `${outroLado.x},${outroLado.y}`])).map(s => ({ x: +s.split(',')[0], y: +s.split(',')[1] }));
          saveCurrentSalaState();
        }

        if (salas[currentSala].final) {
          addLog("Você usou a 🔑 e foi para outro mundo!!!");
          initLevel();
        } else {
          addLog(`Você usou a 🔑 e entrou na sala ${viz.sala.id}!!!`);
        }

        // Posição do jogador no outro lado
        if (outroLado) { player.x = outroLado.x; player.y = outroLado.y; }
        updateUI();
        return;
      }
      addLog("A 🚪 está trancada. Encontre a 🔑.");
      return;
  }
}

export function getDynamicDialogue(npc) {
  if (playerState.hp < playerState.maxHp * 0.3) {
    return "Voce parece ferido! Cuidado.";
  }

  let nearbyEnemies = 0;
  let nearbyDoor = false;
  for (let y = npc.y - 3; y <= npc.y + 3; y++) {
    for (let x = npc.x - 3; x <= npc.x + 3; x++) {
      if (x >= 0 && x < MAP_WIDTH_TILES && y >= 0 && y < MAP_HEIGHT_TILES) {
        if (enemies.some(e => e.x === x && e.y === y)) nearbyEnemies++;
        if (map[y][x] === TILES.DOOR) nearbyDoor = true;
      }
    }
  }
  if (nearbyDoor) return "A saida esta proxima... sinto uma brisa.";
  if (nearbyEnemies > 3) return "Esta area esta infestada! Tenha cautela.";

  if (playerState.attackPattern === 'default') return "Essa ⚔️ atinge todos os inimigos ao seu redor!";
  if (playerState.attackPattern === 'line') return "Essa 🔱 tem um otimo alcance!";
  if (playerState.attackPattern === 'magic') return "Esse 📖 permite atacar muito inimigos mas cuidado com seus pontos cegos!";
  if (playerState.attackPattern === 'shield') return "Esse 🛡️ deixa você muito durão, mas reduz seu alcance!";
  if (playerState.attackPattern === 'wide') return "Com essa ⛓️ voce acerta varios de uma vez!";

  const fallbackDialogues = [
    "Este lugar... ele se contorce.",
    "Voce de novo? Ou e so outro aventureiro com a mesma cara de 🧑?",
    "Nao se preocupe, o labirinto nao vai mudar. Ah, espere...",
    "Eu? So fico por aqui. O dev me deu preguiça de andar."
  ];
  return fallbackDialogues[Math.floor(Math.random() * fallbackDialogues.length)];
}

export function checkNpcInteraction() {
  activeDialogue = null;
  for (const npc of npcs) {
    const dx = Math.abs(player.x - npc.x);
    const dy = Math.abs(player.y - npc.y);
    if (dx <= 1 && dy <= 1) {
      npc.dialogue = getDynamicDialogue(npc);
      activeDialogue = { npc };
      break;
    }
  }
}

export function handleInteractions() {
  const currentTile = map[player.y][player.x];

  // Coleta de chave (consumível)
  if (currentTile === TILES.KEY) {
    playerState.keys++;
    map[player.y][player.x] = TILES.FLOOR;
    addLog("Você encontrou uma chave! 🔑");
    if (audioInitialized) sounds.pickup.triggerAttackRelease("C5", "8n");
  }

  // Itens: coletar para inventário (não usa automaticamente)
  const itemIndex = items.findIndex(item => item.x === player.x && item.y === player.y);
  if (itemIndex > -1) {
    const item = items.splice(itemIndex, 1)[0];
    playerState.inventory.push({ ...item });
    addLog(`Você pegou: ${item.name} ${item.symbol}.`);
    updateUI();
    if (audioInitialized) sounds.pickup.triggerAttackRelease("E5", "8n");
  }

  // Vila (acampar) – detecta via array "villages"
  const vIndex = villages.findIndex(v => v.x === player.x && v.y === player.y);
  if (vIndex > -1) {
    const healAmount = Math.floor(playerState.maxHp * 0.5);
    playerState.hp = Math.min(playerState.maxHp, playerState.hp + healAmount);
    showModal(`Você encontrou um ⛺ e recupera ${healAmount} HP.`);
    villages.splice(vIndex, 1); // consome a vila
  }

  // Persiste alterações da sala (itens pegos, chave coletada etc.)
  saveCurrentSalaState();
}

export function applyItemEffect(item) {
  // Aplica efeito do item (não adiciona ao inventário aqui)
  if (!item || !item.effect) return;
  if (item.effect.heal) {
    const before = playerState.hp;
    playerState.hp = Math.min(playerState.maxHp, playerState.hp + item.effect.heal);
    addLog(`Você recuperou ${playerState.hp - before} HP.`);
  }
  if (item.effect.maxHp) { if (playerState.maxHp > item.effect.maxHp) {playerState.maxHp = item.effect.maxHp; playerState.hp = Math.min(playerState.maxHp, playerState.hp);} else {playerState.hp = Math.min(item.effect.maxHp, playerState.hp + (item.effect.maxHp - playerState.maxHp)); playerState.maxHp = item.effect.maxHp; }}
  if (item.effect.attackPattern) playerState.attackPattern = item.effect.attackPattern;
  updateUI();
}

export function moveEnemies() {
  let playerWasHit = false;

  function isClearLine(x0, y0, x1, y1) {
    if (x0 !== x1 && y0 !== y1) return false; // apenas linhas retas
    const stepX = x1 === x0 ? 0 : Math.sign(x1 - x0);
    const stepY = y1 === y0 ? 0 : Math.sign(y1 - y0);
    let cx = x0 + stepX;
    let cy = y0 + stepY;
    while (cx !== x1 || cy !== y1) {
      const t = map[cy][cx];
      if (!floorTiles.has(t)) return false;
      cx += stepX; cy += stepY;
    }
    return true;
  }

  enemies.forEach(enemy => {
    // Cooldown de movimento (velocidade)
    if (enemy.cooldown > 0) { enemy.cooldown--; return; }

    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const dist = adx + ady;

    // Ataque corpo-a-corpo
    const adjacent = adx <= 1 && ady <= 1 && (dx !== 0 || dy !== 0);

    if (enemy.ai === 'ranged') {
      // Atira se linha reta e dentro do alcance
      if ((dx === 0 || dy === 0) && dist <= (enemy.range || 4) && isClearLine(enemy.x, enemy.y, player.x, player.y)) {
        playerState.hp -= enemy.attack;
        addLog(`Inimigo à distância (${enemy.symbol}) acertou um projétil por ${enemy.attack} de dano.`);
        playerWasHit = true;
        enemy.cooldown = (enemy.moveCooldown || 0) + 1; // pequeno atraso após atirar
        return;
      }
      // Mantém distância: aproxima se muito longe, afasta se perto demais
      let moveX = 0, moveY = 0;
      const desired = Math.max(2, Math.floor((enemy.range || 4) / 2));
      if (dist > desired) {
        if (adx > ady) moveX = Math.sign(dx); else moveY = Math.sign(dy);
      } else if (dist < desired) {
        if (adx > ady) moveX = -Math.sign(dx); else moveY = -Math.sign(dy);
      }
      const nx = enemy.x + moveX;
      const ny = enemy.y + moveY;
      if (floorTiles.has(map[ny][nx]) &&
        !enemies.some(e => e.x === nx && e.y === ny) &&
        !npcs.some(n => n.x === nx && n.y === ny) &&
        !(player.x === nx && player.y === ny)) {
        enemy.x = nx; enemy.y = ny;
      }
      enemy.cooldown = enemy.moveCooldown || 0;
      return;
    }

    if (enemy.ai === 'spawner') {
      // Spawna periodicamente
      enemy.spawnCooldown = (enemy.spawnCooldown ?? enemy.spawnRate ?? 3) - 1;
      if (enemy.spawnCooldown <= 0) {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [mx, my] of dirs) {
          const sx = enemy.x + mx, sy = enemy.y + my;
          if (sx >= 0 && sx < MAP_WIDTH_TILES && sy >= 0 && sy < MAP_HEIGHT_TILES && floorTiles.has(map[sy][sx]) && !enemies.some(e => e.x === sx && e.y === sy)) {
            const proto = ENEMY_TYPES.GRUNT;
            const symbolList = proto.symbols || [proto.symbol || '👾'];
            const symbol = symbolList[Math.floor(Math.random() * symbolList.length)];
            const hpBase = proto.hp + (dungeonLevel * 2);
            const attackBase = (proto.attack ?? 1) + Math.floor(dungeonLevel / 2);
            enemies.push({ x: sx, y: sy, type: 'GRUNT', ai: 'melee', symbol, hp: hpBase, maxHp: hpBase, attack: attackBase, fov: proto.fov || 6, range: 0, moveCooldown: proto.moveCooldown || 0, cooldown: 0 });
            addLog(`Ninho (${enemy.symbol}) gerou um inimigo!`);
            if (audioInitialized) sounds.pickup.triggerAttackRelease('E3', '16n');
            break;
          }
        }
        enemy.spawnCooldown = enemy.spawnRate || 3;
      }
      // Spawner geralmente fica parado, mas pode se afastar se jogador estiver muito perto
      if (dist <= 2) {
        let moveX = adx > ady ? -Math.sign(dx) : 0;
        let moveY = adx > ady ? 0 : -Math.sign(dy);
        const nx = enemy.x + moveX;
        const ny = enemy.y + moveY;
        if (floorTiles.has(map[ny][nx]) &&
          !enemies.some(e => e.x === nx && e.y === ny) &&
          !npcs.some(n => n.x === nx && n.y === ny) &&
          !(player.x === nx && player.y === ny)) {
          enemy.x = nx; enemy.y = ny;
        }
      }
      enemy.cooldown = enemy.moveCooldown || 0;
      return;
    }

    // MELEE padrão com FOV
    if (adjacent) {
      playerState.hp -= enemy.attack;
      addLog(`Inimigo (${enemy.symbol}) atacou, causando ${enemy.attack} de dano.`);
      playerWasHit = true;
      enemy.cooldown = enemy.moveCooldown || 0;
      return;
    }

    if (dist <= (enemy.fov || 6)) {
      let moveX = 0, moveY = 0;
      if (adx > ady) moveX = Math.sign(dx); else moveY = Math.sign(dy);
      const nx = enemy.x + moveX;
      const ny = enemy.y + moveY;
      if (floorTiles.has(map[ny][nx]) &&
        !enemies.some(e => e.x === nx && e.y === ny) &&
        !npcs.some(n => n.x === nx && n.y === ny) &&
        !(player.x === nx && player.y === ny)) {
        enemy.x = nx; enemy.y = ny;
      }
    }

    enemy.cooldown = enemy.moveCooldown || 0;
  });

  if (playerWasHit) {
    if (audioInitialized) sounds.hurt.triggerAttackRelease("G2", "8n");
    if (playerState.hp <= 0) gameOver();
  }

  // Salva posições, inimigos gerados e mudanças após o turno inimigo
  saveCurrentSalaState();
}

export function findNearestEnemy() {
  if (enemies.length === 0) return null;
  let nearestEnemy = null;
  let minDistanceSq = Infinity;
  for (const enemy of enemies) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < minDistanceSq) {
      minDistanceSq = distanceSq;
      nearestEnemy = enemy;
    }
  }
  return nearestEnemy;
}

export function getAttackTiles() {
  const tiles = [];
  const { x, y } = player;
  const { x: dx, y: dy } = playerState.lastDirection;

  switch (playerState.attackPattern) {
    case 'line':
      tiles.push({ x: x + dx, y: y + dy });
      tiles.push({ x: x + dx * 2, y: y + dy * 2 });
      tiles.push({ x: x + dx * 3, y: y + dy * 3 });
      tiles.push({ x: x + dx * 4, y: y + dy * 4 });
      tiles.push({ x: x + dx * 5, y: y + dy * 5 });
      break;
    case 'wide': {
      const p_dx_wide = dy;
      const p_dy_wide = -dx;
      tiles.push({ x: x + dx, y: y + dy });
      tiles.push({ x: x + dx * 2, y: y + dy * 2 });
      tiles.push({ x: x + dx + p_dx_wide, y: y + dy + p_dy_wide });
      tiles.push({ x: x + dx - p_dx_wide, y: y + dy - p_dy_wide });
      tiles.push({ x: x + dx * 2 + p_dx_wide, y: y + dy * 2 + p_dy_wide });
      tiles.push({ x: x + dx * 2 - p_dx_wide, y: y + dy * 2 - p_dy_wide });
      break;
    }
    case 'magic': {
      const p_dx_wide = dy;
      const p_dy_wide = -dx;
      tiles.push({ x: x + dx, y: y + dy });
      tiles.push({ x: x + dx * 2, y: y + dy * 2 });
      tiles.push({ x: x + dx * 3, y: y + dy * 3 });
      tiles.push({ x: x + dx * 2 + p_dx_wide, y: y + dy * 2 + p_dy_wide });
      tiles.push({ x: x + dx * 2 - p_dx_wide, y: y + dy * 2 - p_dy_wide });
      tiles.push({ x: x + dx * 3 + p_dx_wide, y: y + dy * 3 + p_dy_wide });
      tiles.push({ x: x + dx * 3 - p_dx_wide, y: y + dy * 3 - p_dy_wide });
      break;
    }
    case 'shield': {
      const p_dx_wide = dy;
      const p_dy_wide = -dx;
      tiles.push({ x: x + dx, y: y + dy });
      tiles.push({ x: x + dx + p_dx_wide, y: y + dy + p_dy_wide });
      tiles.push({ x: x + dx - p_dx_wide, y: y + dy - p_dy_wide });
      break;
    }
    default:
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        tiles.push({ x: x + i, y: y + j });
      }
      break;
  }
  return tiles;
}

export function playerAttack() {
  if (player.isAttacking) return;

  const nearestEnemy = findNearestEnemy();
  if (nearestEnemy) {
    const dx = nearestEnemy.x - player.x;
    const dy = nearestEnemy.y - player.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      playerState.lastDirection = { x: Math.sign(dx), y: 0 };
    } else {
      playerState.lastDirection = { x: 0, y: Math.sign(dy) };
    }
  }

  if (audioInitialized) sounds.attack.triggerAttackRelease("C3", "16n");
  player.isAttacking = true;
  player.attackTimer = 100;

  const attackTiles = getAttackTiles();
  let hit = false;
  let enemyDefeated = false;

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (attackTiles.some(t => t.x === enemy.x && t.y === enemy.y)) {
      enemy.hp -= playerState.attack;
      hit = true;
      if (enemy.hp <= 0) {
        addLog(`Inimigo (${enemy.symbol}) derrotado!`);
        playerState.attack *= 1.1;
        playerState.hp = Math.min(playerState.hp + 2, 100);
        enemyDefeated = true;
        if (enemy.type === 'BOSS') showModal("O CHEFE 🐲 foi derrotado! O labirinto parece tremer em alívio.", false);
        enemies.splice(i, 1);
      }
    }
  }

  if (enemyDefeated && audioInitialized) sounds.defeat.triggerAttackRelease("A2", "4n");
  if (hit) addLog(`Você atacou, causando ${playerState.attack.toFixed(2)} de dano.`);
  else addLog("Você ataca o ar.");

  // Salva mudanças (inimigos derrotados etc.)
  saveCurrentSalaState();

  moveEnemies();
  updateUI();
}

// Reordenar inventário (não consome turno)
export function reorderInventory(from, to) {
  if (from === to || from < 0 || to < 0 || from >= playerState.inventory.length || to >= playerState.inventory.length) return;
  const inv = playerState.inventory;
  const [moved] = inv.splice(from, 1);
  inv.splice(to, 0, moved);
  addLog(`Inventário: movido ${moved.name} para o slot ${to + 1}.`);
  updateUI();
  saveCurrentSalaState();
}

// Usar item (consome turno)
export function useInventoryItem(index) {
  const item = playerState.inventory[index];
  if (!item) return;
  if (item.type === 'consumivel') {
    applyItemEffect(item);
    // Remove consumível após uso
    playerState.inventory.splice(index, 1);
    addLog(`Você usou ${item.name} ${item.symbol}.`);
  } else {
    addLog(`Este item não é consumível. (Equipamento futuro)`);
  }
  saveCurrentSalaState();
  moveEnemies();
  updateUI();
}
