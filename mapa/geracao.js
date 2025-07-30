/* Geração procedural de mapa com árvores, ciclos, portas trancadas e sem chave master */

// Gera um inteiro aleatório entre 0 e 2^32-1
function RandomSeed(seed) {
    let m = 1000000007, a = 998244353, c = 1013904223, d = 35436, state = seed;
    return function() {
        state = (a * state + (c^state^d)) % m;
        return state;
    };
}
function rangeRandom(l, r, rand){ return l + rand()%(r-l+1); }


const MAX_SALAS = 25;
const MIN_SALAS = 7;
const MAP_MAX_TILES = 60;
const MAP_MIN_TILES = 30;
const TIPOS_DE_SALA = ["puzzle", "tesouro", "inimigos", "inimigos", "miniboss", "corredor", "npcs"]
const TIPOS_SALA_END = ["tesouro", "tesouro", "tesouro", "npcs"] //salas sem saída
const TIPOS_BIOMAS = ["caverna", "floresta", "pantano", "deserto"]
const TILES = {
    WALL: 0,
    FLOOR: 1,
    DOOR: 5,
    TREE: 11,
    WATER: 12,
    MUD: 13,
    SAND: 14,
    ROCK: 15,
    BRICK: 16,
    RUBBLE: 17,
    LAVA: 18,
    ASH: 19,
};

class Sala {
    constructor(id) {
        this.id = id;
        this.vizinhas = [];
        this.tipo = "normal";
        this.objetos = [];
        this.chave = null;
        this.final = false;
        this.travadaCom = null;
        this.pos = { x: 0, y: 0 };
        this.profundidade = -1;
        this.nivelBloqueio = 0;
        this.map = this.gerarLayoutSala();
        this.enemies = [];
        this.items = [];
        this.npcs = [];
        this.dificuldade = 1;
        this.bioma = "caverna";
        this.portas = [];
    }

    conectar(sala, travada = false, chaveId = null) {
        this.vizinhas.push({ sala, travada, chaveId });
        sala.vizinhas.push({ sala: this, travada, chaveId });
    }

    gerarLayoutSala() {
        const largura = 9, altura = 9;
        const mapa = Array.from({ length: altura }, () => Array(largura).fill("#"));
        for (let y = 1; y < altura - 1; y++) {
            for (let x = 1; x < largura - 1; x++) {
                mapa[y][x] = ".";
            }
        }
        mapa[Math.floor(altura / 2)][0] = "P";  // porta esquerda
        mapa[Math.floor(altura / 2)][largura - 1] = "P";  // porta direita
        mapa[0][Math.floor(largura / 2)] = "P";  // porta cima
        mapa[altura - 1][Math.floor(largura / 2)] = "P";  // porta baixo
        return mapa;
    }
}
// BFS considerando chaves já obtidas
function bfs(salas, inicio = 0, travas = new Set()) {
    const fila = [inicio];
    const visitado = new Set([inicio]);
    const profundidade = { [inicio]: 0 };
    const anterior = {};

    while (fila.length) {
        const atual = fila.shift();
        for (const viz of salas[atual].vizinhas) {
            const id = viz.sala.id;
            const bloqueada = viz.travada && !travas.has(viz.chaveId);
            if (!visitado.has(id) && !bloqueada) {
                visitado.add(id);
                profundidade[id] = profundidade[atual] + 1;
                anterior[id] = atual;
                fila.push(id);
            }
        }
    }
    return { profundidade, anterior, acessiveis: visitado };
}


function gerarMapa(seed) {
    const rand = RandomSeed(seed);
    const quantidadeSalas = MIN_SALAS + (rand() % (MAX_SALAS - MIN_SALAS + 1));
    const numPortasTrancadas = 2 + rand() % (1 + Math.floor(quantidadeSalas / 3));
    const numCiclosExtras = 2 + rand() % (1 + (quantidadeSalas - numPortasTrancadas));
    const salas = [];

    // Cria salas
    for (let i = 0; i < quantidadeSalas; i++) {
        salas.push(new Sala(i));
    }

    const arestas = [];
    // 1. Árvore base
    for (let i = 1; i < quantidadeSalas; i++) {
        const j = rand() % i;
        salas[i].conectar(salas[j]);
        arestas.push([i, j]);
    }

    // 2. Portas trancadas + distribuição de chaves
    const travas = new Set();
    const portas = [];
    for (let k = 0; k < numPortasTrancadas; k++) {
        let a, b, idx, tent = 0;
        do {
            idx = rand() % arestas.length;
            [a, b] = arestas[idx];
        } while ((salas[a].travadaCom || salas[b].travadaCom) && ++tent < 100);

        const chaveId = `chave_${k}`;
        // marca a porta bloqueada
        salas[a].vizinhas.forEach(v => {
            if (v.sala.id === b) { v.travada = true; v.chaveId = chaveId; }
        });
        salas[b].vizinhas.forEach(v => {
            if (v.sala.id === a) { v.travada = true; v.chaveId = chaveId; }
        });

        // registra para definir final posterior
        portas.push({ a, b, chaveId });

        // coloca chave na região acessível sem atravessar esta porta
        const { acessiveis } = bfs(salas, 0, travas);
        const possiveis = Array.from(acessiveis).filter(id => id !== a && id !== b);
        const salaChave = salas[possiveis[rand() % possiveis.length]];
        salaChave.chave = chaveId;
        travas.add(chaveId);

        const doLadoDeCa = bfs(salas, 0).acessiveis
        for(const id of doLadoDeCa) salas[id].nivelBloqueio--;
    }

    // 3. Ciclos extras restritos    
    let tentaComp = 0;
    for(let c = 0; c < numCiclosExtras && tentaComp < 50; c++){
        let a, b, tent = 0;

        let noComp = rand() % salas.length;
        let { acessiveis } = bfs(salas, noComp);
        
        if(acessiveis.length <= 1){
            tentaComp++;
            c--;
            continue;
        }
        tentaComp = 0;
        
        const regiao = Array.from(acessiveis);
        const conectados = new Set();

        do {
            a = regiao[rand() % regiao.length];
            b = regiao[rand() % regiao.length];
        } while ((a === b || conectados.has(`${a},${b}`) || conectados.has(`${b},${a}`) ||
                 salas[a].vizinhas.some(v => v.sala.id === b)) && ++tent < 50);
        if (tent < 50) {
            salas[a].conectar(salas[b]);
            conectados.add(`${a},${b}`);
        }
    }

    // 4. Escolher sala final:
    
    const ultimaPorta = portas[portas.length - 1]; // Usa a última porta criada como entrada para o ramo final
    // componente inacessível sem chave da última porta
    const { acessiveis: antesFinal } = bfs(salas, 0, new Set(Array.from(travas).filter(id => id !== ultimaPorta.chaveId)));
    const ladoFinal = salas.map(s => s.id) .filter(id => !antesFinal.has(id));  // salas do outro lado
    
    let salaFinal = ladoFinal[0]; // escolhe a mais distante dentro do ramo final
    let maxP = -1;
    const profFinal = bfs(salas, ultimaPorta.b, travas).profundidade;
    
    for (const id of ladoFinal) {
        if (profFinal[id] > maxP) { maxP = profFinal[id]; salaFinal = id; }
    }
    salas[salaFinal].final = true;

    // 5. pra marcar a profundidade de cada sala
    const profGeral = bfs(salas, 0).profundidade;

    // 6. Classificar tipos de sala
    salas.forEach(sala => {
        sala.nivelBloqueio += portas.length
        sala.profundidade = profGeral[sala.id];

        if (sala.id === 0) sala.tipo = "inicial";
        else if (sala.final) sala.tipo = "final";
        else if (sala.vizinhas.length === 1) sala.tipo = TIPOS_SALA_END[rand()%TIPOS_SALA_END.length]; //folhas da árvore
        else if (sala.vizinhas.length > 4) sala.tipo = "corredor";
        else sala.tipo = TIPOS_DE_SALA[rand()%TIPOS_DE_SALA.length];
        // if (sala.chave && sala.tipo !== "inicial") sala.tipo = "inimigos";
    });
    
    atribuirBiomas(salas, rand, 1 + rand()%Math.ceil(salas.length / 3))
    salas.forEach(sala => { generateMap(sala, rand) });
    // gerar layout geral das salas
    // tamanho, altura, posição das portas e itens
    // sala como uma matriz de tiles. 
    // ou várias matrizes, cada uma como uma layer (exemplo, chão e decoração)
    
    // gerar aparência das salas.
    // colocar tiles do chão, paredes, árvores, etc

    return salas;
}

function atribuirBiomas(salas, rand, numCentros = 4) {
    const fila = []; // Escolhe algumas salas aleatórias como centros de bioma
    const visitados = new Set();
    
    while(fila.length < numCentros && fila.length < salas.length){
        const idx = rand() % salas.length;
        if(visitados.has(idx)) continue;
        salas[idx].bioma = TIPOS_BIOMAS[rand() % TIPOS_BIOMAS.length];
        fila.push(idx);
        visitados.add(idx);
    }

    while(fila.length > 0){
        const idx = fila.shift();
        for(const vizinha of salas[idx].vizinhas){
            if(!visitados.has(vizinha.sala.id)){
                visitados.add(vizinha.sala.id);
                fila.push(vizinha.sala.id);
                vizinha.sala.bioma = salas[idx].bioma;
            }
        }
    }
}


function mostrarMapa(salas) {
    for (const sala of salas) {
        let texto = `Sala ${sala.id}`;
        if (sala.chave) texto += ` (tem chave: ${sala.chave})`;
        if (sala.final) texto += ` [FINAL]`;
        texto += " {" + sala.tipo + "} " + ` block(${sala.nivelBloqueio}) bioma: ${sala.bioma}` 
        console.log(texto);
        for (const viz of sala.vizinhas) {
            const travada = viz.travada ? ` (trancada com ${viz.chaveId})` : '';
            console.log(`  ↳ Sala ${viz.sala.id}${travada}`);
        }
    }
}


function generateMap(sala, rand){
    let MAP_HEIGHT_TILES = rangeRandom(MAP_MIN_TILES, MAP_MAX_TILES, rand);
    let MAP_WIDTH_TILES = rangeRandom(MAP_MIN_TILES, MAP_MAX_TILES, rand);

    if(sala.bioma == "floresta") 
        sala.map = generateFlorestMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES); 
    else if(sala.bioma == "pantano") 
        sala.map = generateSwampMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES); 
    else if(sala.bioma == "deserto") 
        sala.map = generateDesertMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES); 
    else if(sala.bioma == "ruinas") 
        sala.map = generateRuinsMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES); 
    else 
        sala.map = generateCaveMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES);
}





///////////////////////////////////

/////////// MAPAS ////////////////

function generateCaveMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES){
    let map = Array.from({ length: MAP_HEIGHT_TILES }, () => Array(MAP_WIDTH_TILES).fill(TILES.WALL));
    
    let floorTiles = 0;
    const totalTiles = MAP_WIDTH_TILES * MAP_HEIGHT_TILES;
    const targetFloorPercentage = 0.5;
    let diggerX = Math.floor(MAP_WIDTH_TILES / 2);
    let diggerY = Math.floor(MAP_HEIGHT_TILES / 2);
    let totalTentativas = 0;

    while (floorTiles < totalTiles * targetFloorPercentage && totalTentativas < 5*totalTiles) {
        if (map[diggerY][diggerX] === TILES.WALL) {
            map[diggerY][diggerX] = TILES.FLOOR;
            floorTiles++;
        }
        totalTentativas++;
        let tentou = 0;
        do {
            const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
            const [dx, dy] = directions[(rand() % directions.length)];
            diggerX = Math.max(1, Math.min(MAP_WIDTH_TILES - 2, diggerX + dx));
            diggerY = Math.max(1, Math.min(MAP_HEIGHT_TILES - 2, diggerY + dy));
            tentou++;
        } while(map[diggerY][diggerX] === TILES.FLOOR && tentou < 6);
    }

    return map;
}

function generateFlorestMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES){
    let map = Array.from({ length: MAP_HEIGHT_TILES }, () => Array(MAP_WIDTH_TILES).fill(TILES.TREE));

    let floorTiles = 0;
    const totalTiles = MAP_WIDTH_TILES * MAP_HEIGHT_TILES;
    const targetFloorPercentage = 0.25;
    let diggerX = Math.floor(MAP_WIDTH_TILES / 2);
    let diggerY = Math.floor(MAP_HEIGHT_TILES / 2);
    let totalTentativas = 0;

    const fila = [];
    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let MAX_DIAMETER = Math.floor(Math.min(MAP_WIDTH_TILES, MAP_HEIGHT_TILES) * 1.7 / 3);
    let MIN_DIAMETER = 5;

    while (floorTiles < totalTiles * targetFloorPercentage && totalTentativas < 5*totalTiles) {
        if (map[diggerY][diggerX] === TILES.TREE) {
            map[diggerY][diggerX] = TILES.FLOOR;
            floorTiles++;
        }
        totalTentativas++;
        let tentou = 0;
        
        if(rand()%100 < 40) fila.push([diggerX, diggerY, rangeRandom(MIN_DIAMETER, MAX_DIAMETER, rand)]); //centro de clareiras
        
        do {
            const [dx, dy] = directions[(rand() % directions.length)];
            diggerX = Math.max(1, Math.min(MAP_WIDTH_TILES - 2, diggerX + dx));
            diggerY = Math.max(1, Math.min(MAP_HEIGHT_TILES - 2, diggerY + dy));
            tentou++;
        } while(map[diggerY][diggerX] == TILES.FLOOR && tentou < 6);
    }

    const directions2 = [[0, -1], [0, 1], [-1, 0], [1, 0], [0, 2]];
    while(fila.length > 0){
        const [x, y, dist] = fila.shift();
        map[y][x] = TILES.FLOOR;
        
        if(dist <= 0 || rand() % 100 < 40) continue;

        for(const [dx, dy] of directions2){
            if(0 >= x+dx || x+dx > MAP_WIDTH_TILES-3) continue;
            if(0 >= y+dy || y+dy > MAP_HEIGHT_TILES-3) continue;
            if(map[y+dy][x+dx] == TILES.FLOOR) continue;
            
            fila.push([x+dx, y+dy, dist-1]);
        }
    }

    return map;
}



function generateSwampMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES){
    let map = Array.from({ length: MAP_HEIGHT_TILES }, () => Array(MAP_WIDTH_TILES).fill(TILES.MUD));

    const waterCenters = [];
    const numLakes = 3 + rand() % 5;

    for (let i = 0; i < numLakes; i++) {
        const cx = 5 + rand() % (MAP_WIDTH_TILES - 10);
        const cy = 5 + rand() % (MAP_HEIGHT_TILES - 10);
        const radius = 3 + rand() % 4;
        waterCenters.push([cx, cy, radius]);
    }

    for (const [cx, cy, radius] of waterCenters) {
        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                const dx = cx + x;
                const dy = cy + y;
                if (dx < 1 || dy < 1 || dx >= MAP_WIDTH_TILES-1 || dy >= MAP_HEIGHT_TILES-1) continue;
                if (x*x + y*y <= radius*radius) {
                    map[dy][dx] = TILES.WATER;
                }
            }
        }
    }

    return map;
}

function generateDesertMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES){
    let map = Array.from({ length: MAP_HEIGHT_TILES }, () => Array(MAP_WIDTH_TILES).fill(TILES.SAND));

    const duneCount = 8 + rand() % 10;

    for(let i = 0; i < duneCount; i++){
        const cx = rand() % MAP_WIDTH_TILES;
        const cy = rand() % MAP_HEIGHT_TILES;
        const radius = 2 + rand() % 6;

        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                const dx = cx + x;
                const dy = cy + y;
                if (dx < 1 || dy < 1 || dx >= MAP_WIDTH_TILES-1 || dy >= MAP_HEIGHT_TILES-1) continue;
                if (x*x + y*y <= radius*radius && rand()%100 < 75) {
                    map[dy][dx] = TILES.ROCK;
                }
            }
        }
    }

    return map;
}

function generateRuinsMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES){
    let map = Array.from({ length: MAP_HEIGHT_TILES }, () => Array(MAP_WIDTH_TILES).fill(TILES.BRICK));

    let floorTiles = 0;
    const totalTiles = MAP_WIDTH_TILES * MAP_HEIGHT_TILES;
    const targetFloorPercentage = 0.35;
    let diggerX = Math.floor(MAP_WIDTH_TILES / 2);
    let diggerY = Math.floor(MAP_HEIGHT_TILES / 2);
    let totalTentativas = 0;

    while (floorTiles < totalTiles * targetFloorPercentage && totalTentativas < 5*totalTiles) {
        if (map[diggerY][diggerX] === TILES.BRICK) {
            map[diggerY][diggerX] = TILES.RUBBLE;
            floorTiles++;
        }
        totalTentativas++;
        const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const [dx, dy] = directions[(rand() % directions.length)];
        diggerX = Math.max(1, Math.min(MAP_WIDTH_TILES - 2, diggerX + dx));
        diggerY = Math.max(1, Math.min(MAP_HEIGHT_TILES - 2, diggerY + dy));
    }

    return map;
}


















///////////////////////////
function getFloorPositions() {
    const floorPositions = [];
    for (let y = 0; y < MAP_HEIGHT_TILES; y++) for (let x = 0; x < MAP_WIDTH_TILES; x++) {
        if (map[y][x] === TILES.FLOOR) floorPositions.push({ x, y });
    }
    return floorPositions;
}

// --- POSICIONAMENTO DE ENTIDADES ---
function placeEntities() {
    const floorPositions = getFloorPositions();
    
    const playerPos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
    player = { x: playerPos.x, y: playerPos.y, isAttacking: false, attackTimer: 0 };

    enemies = [];
    if (dungeonLevel % 5 === 0) {
        addLog("Um arrepio percorre sua espinha... Uma presença poderosa está aqui!");
        const pos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
        const bossData = ENEMY_TYPES.BOSS;
        enemies.push({ ...pos, type: 'BOSS', ...bossData, hp: bossData.hp * dungeonLevel, maxHp: bossData.hp * dungeonLevel, attack: bossData.attack + dungeonLevel });
    } else {
        const numEnemies = 3 + dungeonLevel;
        for (let i = 0; i < numEnemies; i++) {
            if (floorPositions.length === 0) break;
            const pos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
            const type = Math.random() > 0.7 ? 'TANK' : 'GRUNT';
            const enemyData = ENEMY_TYPES[type];
            enemies.push({ ...pos, type, ...enemyData, hp: enemyData.hp + (dungeonLevel * 2), maxHp: enemyData.hp + (dungeonLevel * 2), attack: enemyData.attack + Math.floor(dungeonLevel / 2) });
        }
    }

    items = [];
    const possibleItems = [
        { name: "Espada", type: "arma", effect: { attack: 5, attackPattern: 'default' }, symbol: '⚔️' },
        { name: "Tomo Arcano", type: "magia", effect: { attack: 3, attackPattern: 'magia' }, symbol: '📖' },
        { name: "Escudo", type: "defesa", effect: { maxHp: 20 }, symbol: '🛡️' },
        { name: "Poção de Cura", type: "consumivel", effect: { heal: 25 }, symbol: '🧪' },
        { name: "Lança", type: "arma", effect: { attack: 3, attackPattern: 'line' }, symbol: '🔱' },
        { name: "Mangual", type: "arma", effect: { attack: 2, attackPattern: 'wide' }, symbol: '⛓️' }
    ];
    const numItems = 2 + Math.floor(dungeonLevel / 3);
    for (let i = 0; i < numItems; i++) {
            if (floorPositions.length === 0) break;
        const pos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
        const itemProto = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        items.push({ ...itemProto, ...pos });
    }
    
    npcs = [];
    const numNpcs = Math.random() > 0.3 ? 1 : 0; // Chance de ter um NPC
    if (numNpcs > 0 && floorPositions.length > 0) {
        const pos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
        npcs.push({ ...pos }); // NPC é criado sem diálogo inicial
    }

    if (floorPositions.length > 1) {
        const keyPos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
        map[keyPos.y][keyPos.x] = TILES.KEY;
        const doorPos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
        map[doorPos.y][doorPos.x] = TILES.DOOR;
    }
    
    if (Math.random() < 0.3 && floorPositions.length > 0) {
        const villagePos = floorPositions.splice(Math.floor(Math.random() * floorPositions.length), 1)[0];
        map[villagePos.y][villagePos.x] = TILES.VILLAGE;
    }
}