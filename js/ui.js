// ui.js - funções de UI e modal
import { reorderInventory, useInventoryItem } from './gameplay.js';

export function updateUI() {
  hpValueEl.textContent = `${playerState.hp}/${playerState.maxHp}`;
  hpBarEl.style.width = `${(playerState.hp / playerState.maxHp) * 100}%`;
  attackValueEl.textContent = playerState.attack;
  attackPatternEl.textContent = playerState.attackPattern.charAt(0).toUpperCase() + playerState.attackPattern.slice(1);
  classNameEl.textContent = playerState.className;
  dungeonLevelEl.textContent = dungeonLevel;

  inventoryListEl.innerHTML = '';
  const inv = playerState.inventory;
  if (inv.length === 0 && playerState.keys === 0) {
    inventoryListEl.innerHTML = '<li>(Vazio)</li>';
  } else {
    inv.forEach((item, idx) => {
      const li = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = `${item.symbol} ${item.name}`;
      li.appendChild(text);

      const controls = document.createElement('div');
      controls.style.display = 'inline-flex';
      controls.style.gap = '6px';
      
      const leftBtn = document.createElement('button');
      leftBtn.textContent = '⬆️';
      leftBtn.title = 'Mover para a esquerda (não consome turno)';
      leftBtn.addEventListener('click', (e) => { e.stopPropagation(); reorderInventory(idx, Math.max(0, idx - 1)); });
      controls.appendChild(leftBtn);

      const rightBtn = document.createElement('button');
      rightBtn.textContent = '⬇️';
      rightBtn.title = 'Mover para a direita (não consome turno)';
      rightBtn.addEventListener('click', (e) => { e.stopPropagation(); reorderInventory(idx, Math.min(inv.length - 1, idx + 1)); });
      controls.appendChild(rightBtn);

      if (item.type === 'consumivel') {
        const useBtn = document.createElement('button');
        useBtn.textContent = 'Usar';
        useBtn.style.fontFamily = "'Press Start 2P', cursive";
        useBtn.title = 'Usar item (consome um turno)';
        useBtn.addEventListener('click', (e) => { e.stopPropagation(); useInventoryItem(idx); });
        controls.appendChild(useBtn);
      }

      if (item.type === 'equipamento') {
        const equipBtn = document.createElement('button');
        equipBtn.textContent = 'Equipar';
        equipBtn.title = 'Equipar este item';
        equipBtn.style.fontFamily = "'Press Start 2P', cursive";
        equipBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          // Aqui você decide o efeito de equipar:
          applyItemEffect(item); // Aplica os efeitos
          addLog(`Você equipou ${item.name} ${item.symbol}.`);
        });
        controls.appendChild(equipBtn);
      }
      li.appendChild(controls);
      inventoryListEl.appendChild(li);
    });

    if (playerState.keys > 0) {
      const li = document.createElement('li');
      li.textContent = `🔑 Chave(s) x${playerState.keys}`;
      inventoryListEl.appendChild(li);
    }
  }

  logListEl.innerHTML = '';
  const recentLogs = messageLog.slice(-5);
  recentLogs.forEach(msg => {
    const li = document.createElement('li');
    li.textContent = `> ${msg}`;
    logListEl.appendChild(li);
  });
}

export function addLog(message) {
  if (messageLog.length > 50) messageLog.shift();
  messageLog.push(message);
  updateUI();
}

export function showModal(text) {
  modalTextEl.textContent = text;
  modalEl.style.display = 'flex';
  const closeHandler = () => {
    modalEl.style.display = 'none';
    modalButton.removeEventListener('click', closeHandler);
  };
  modalButton.addEventListener('click', closeHandler);
}

export function togglePause() {
  isPaused = !isPaused;
  pauseButton.textContent = isPaused ? '▶️ Retomar' : '⏸️ Pause';
  pauseOverlay.style.display = isPaused ? 'flex' : 'none';
}
