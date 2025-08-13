/* Geração procedural de mapa com árvores, ciclos, portas trancadas e sem chave master */

// Gera um inteiro aleatório entre 0 e 2^32-1
function RandomSeed(seed) {
    let m = 1000000009, a = 998244353, c = 1013904223, d = 35436, state = seed;
    return function() {
        state = (a * state + (c^state^d)) % m;
        return Math.floor(Math.random()*m);
    };
}
function rangeRandom(l, r, rand){ return l + rand()%(r-l+1); }


const MAX_SALAS = 25;
const MIN_SALAS = 7;
const MAP_MAX_TILES = 40;
const MAP_MIN_TILES = 10;
const TIPOS_DE_SALA = ["areasegura", "tesouro", "inimigos", "inimigos", "miniboss", "corredor", "npcs"]
const TIPOS_SALA_END = ["tesouro", "tesouro", "tesouro", "npcs"] //salas sem saída
const TIPOS_BIOMAS = ["caverna", "floresta", "pantano", "deserto", "ruinas", "floresta"]
// const TIPOS_BIOMAS = ["pantano"]
const TILES = {
    WALL: 0,
    FLOOR: 1,
    DOOR: 5,
    KEY: 6, // adicionado para compatibilidade com o jogo
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
const wallTiles = new Set([TILES.WALL, TILES.TREE, TILES.ROCK, TILES.BRICK, TILES.RUBBLE, TILES.LAVA, TILES.ASH]);
const floorTiles = new Set([ TILES.FLOOR, TILES.MUD, TILES.SAND, // TILES.GRASS, TILES.PATH, TILES.STONE_FLOOR, 
    ]);

function getTileColor(tile, sala){
    let fill = "#000";
    switch (tile) {
        case TILES.WALL:
            fill = {
                caverna: "#444", floresta: "#2e5c2e",
                pantano: "#2c3f48", deserto: "#d2b48c",
                ruins: "#555", volcano: "#333"
            }[sala.bioma] || "#444";
            break;
        case TILES.FLOOR:
            fill = { caverna: "#888", floresta: "#cce5cc",
                pantano: "#99aabb", deserto: "#f4e4b2",
                ruins: "#aaa", volcano: "#aa5500"
            }[sala.bioma] || "#888";
            break;
        case TILES.TREE: fill = "#228b22"; break;
        case TILES.WATER: fill = "#336677"; break;
        case TILES.MUD: fill = "#553"; break;
        case TILES.SAND: fill = "#ffe4a1"; break;
        case TILES.ROCK: fill = "#555555"; break;
        case TILES.BRICK: fill = "#aa7f4d"; break;
        case TILES.RUBBLE: fill = "#888"; break;
        case TILES.LAVA: fill = "#cc3300"; break;
        case TILES.ASH: fill = "#666666"; break;
        case TILES.DOOR: fill = "#ff9900"; break;
        default: fill = "#f00"; break;
    }
    return fill;
}

class Sala {
    constructor(id) {
        this.id = id;
        this.vizinhas = [];
        this.tipo = "normal";
        this.objetos = [];
        this.chaves = [];
        this.final = false;
        this.travadaCom = null;
        this.pos = { x: 0, y: 0 };
        this.profundidade = -1;
        this.nivelBloqueio = 0;
        this.map = [[]];
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

    getVizinha(x, y){
        for(let i=0; i < this.portas.length; i++)
            if(this.portas[i].x == x && this.portas[i].y == y)
                return this.vizinhas[i];
        return {sala:this, travada:false, chaveId:null};
    }

    getPortaToViz(id){
        for(let i=0; i < this.vizinhas.length; i++)
            if(this.vizinhas[i].sala.id == id)
                return this.portas[i];
        return this.portas[0];
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
    // Aproximadamente metade das conexões principais (arestas da árvore) serão trancadas
    const numPortasTrancadas = Math.max(1, Math.floor((quantidadeSalas - 1) / 2));
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
        } while ((salas[a].travadaCom || salas[b].travadaCom) && ++tent < 1000);

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
        salaChave.chaves.push(chaveId);
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
        if (sala.chaves.length > 0) texto += ` (tem chave: ${sala.chaves})`;
        if (sala.final) texto += ` [FINAL]`;
        texto += " {" + sala.tipo + "} " + ` block(${sala.nivelBloqueio}) bioma: ${sala.bioma}` 
        console.log(texto);
        for (const viz of sala.vizinhas) {
            const travada = viz.travada ? ` (trancada com ${viz.chaveId})` : '';
            console.log(`  ↳ Sala ${viz.sala.id}${trancada}`);
        }
    }
}


function generateMap(sala, rand){
    let MAP_HEIGHT_TILES = rangeRandom(MAP_MIN_TILES, MAP_MAX_TILES, rand);
    let MAP_WIDTH_TILES = rangeRandom(MAP_MIN_TILES, MAP_MAX_TILES, rand);

    if(sala.bioma == "floresta") 
        sala.map = generateForestMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES); 
    else if(sala.bioma == "pantano"){
        sala.map = generateSwampMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES); 
        sala.map = addWallBorder(sala.map);
    }
    else if(sala.bioma == "deserto"){
        sala.map = generateDesertMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES); 
        sala.map = addWallBorder(sala.map);
    }
    else if(sala.bioma == "ruinas") 
        sala.map = generateRuinsMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES); 
    else 
        sala.map = generateCaveMap(rand, MAP_HEIGHT_TILES, MAP_WIDTH_TILES);

    let portasCandidatas = getDoorPositions(sala.map, sala.vizinhas.length, rand);

    // Garante alinhamento 1:1 entre vizinhas e portas pelo índice
    const portasAlocadas = sala.vizinhas.map((_, i) => portasCandidatas[i] || portasCandidatas[i % Math.max(1, portasCandidatas.length)] || { x: 1, y: 1 });

    for (const {x, y} of portasAlocadas) sala.map[y][x] = TILES.DOOR;
    sala.portas = portasAlocadas;
}

function getDoorPositions(map, P, rand) {
    const H = map.length;
    const W = map[0].length;

    // encontra um ponto de piso para BFS
    let start = null;
    for (let y = Math.floor(H/2); y < H; y++) {
        for (let x = Math.floor(W/2); x < W; x++) {
            if (floorTiles.has(map[y][x])) { start = [y, x]; break; }
        }
        if (start) break;
    }
    if (!start) return [];

    // BFS para marcar área navegável
    const visited = Array.from({ length: H }, () => Array(W).fill(false));
    const queue = [start];
    visited[start[0]][start[1]] = true;
    const floorSet = new Set([start.toString()]);
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];

    while (queue.length) {
        const [y, x] = queue.shift();
        for (const [dy, dx] of dirs) {
            const ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < H && nx >= 0 && nx < W && !visited[ny][nx] && floorTiles.has(map[ny][nx])) {
                visited[ny][nx] = true;
                floorSet.add([ny, nx].toString());
                queue.push([ny, nx]);
            }
        }
    }

    // candidatos: wallTiles adjacente a floorSet
    const candidates = [];
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            if (!wallTiles.has(map[y][x])) continue;
            for (const [dy, dx] of dirs) {
                const ny = y + dy, nx = x + dx;
                if (ny >= 0 && ny < H && nx >= 0 && nx < W && floorSet.has([ny, nx].toString())) {
                    candidates.push({ x, y });
                    break;
                }
            }
        }
    }

    // sample P únicos
    const result = [];
    const used = new Set();
    if (candidates.length <= P) return candidates;

    while (result.length < P) {
        const idx = rand() % candidates.length;
        const { x, y } = candidates[idx];
        const key = `${x},${y}`;
        if (!used.has(key)) {
            used.add(key);
            result.push({ x, y });
        }
    }
    return result;
}






///////////////////////////////////

/////////// MAPAS ////////////////
function addWallBorder(map) {
    const H = map.length;
    const W = map[0].length;
    map[0] = Array(W).fill(TILES.WALL);
    map[H - 1] = Array(W).fill(TILES.WALL);
    for (let y = 1; y < H - 1; y++) {
        map[y][0] = TILES.WALL;
        map[y][W - 1] = TILES.WALL;
    }
    return map;
}


// Geração de caverna via cellular automata
function generateCaveMap(rand, H, W) {
    let map = Array.from({ length: H }, () => Array(W).fill(TILES.WALL));
    // inicializa aleatório
    for (let y = 1; y < H - 1; y++)
        for (let x = 1; x < W - 1; x++)
            map[y][x] = (rand() % 100 < 45) ? TILES.WALL : TILES.FLOOR;
    // iterar smoothing
    for (let iter = 0; iter < 5; iter++) {
        const tmp = map.map(row => [...row]);
        for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
                let walls = 0;
                for (let dy = -1; dy <= 1; dy++)
                    for (let dx = -1; dx <= 1; dx++)
                        if (map[y + dy][x + dx] === TILES.WALL) walls++;
                tmp[y][x] = (walls > 4) ? TILES.WALL : TILES.FLOOR;
            }
        }
        map = tmp;
    }
    return map;
}


function generateForestMap(rand, H, W) {
    // 1. Preenchimento aleatório
    let map = Array.from({ length: H }, () => Array(W).fill(TILES.TREE));
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            map[y][x] = (rand() % 100 < 60) ? TILES.FLOOR : TILES.TREE;
        }
    }
    // 2. Suavização (smoothing)
    for (let iter = 0; iter < 5; iter++) {
        const tmp = map.map(row => [...row]);
        for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
                let floorCount = 0;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
                    if (map[y + dy][x + dx] === TILES.FLOOR) floorCount++;
                tmp[y][x] = (floorCount >= 5) ? TILES.FLOOR : TILES.TREE;
            }
        }
        map = tmp;
    }
    // 3. Conectividade
    const visited = Array.from({ length: H }, () => Array(W).fill(false));
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    // encontre ponto inicial
    let start = null;
    for (let y = 1; y < H - 1 && !start; y++) {
        for (let x = 1; x < W - 1; x++) {
            if (map[y][x] === TILES.FLOOR) { start = [y, x]; break; }
        }
    }
    if (start) {
        const queue = [start]; visited[start[0]][start[1]] = true;
        // flood fill
        while (queue.length) {
            const [y, x] = queue.shift();
            for (const [dy, dx] of dirs) {
                const ny = y + dy, nx = x + dx;
                if (ny > 0 && ny < H-1 && nx > 0 && nx < W-1 && !visited[ny][nx] && map[ny][nx] === TILES.FLOOR) {
                    visited[ny][nx] = true;
                    queue.push([ny, nx]);
                }
            }
        }
        // conectar áreas isoladas
        for (let y = 1; y < H - 1; y++) {
            for (let x = 1; x < W - 1; x++) {
                if (map[y][x] === TILES.FLOOR && !visited[y][x]) {
                    let cy = y, cx = x;
                    // carve manhattan até start
                    while (!visited[cy][cx]) {
                        if (Math.abs(cy - start[0]) > Math.abs(cx - start[1])) {
                            cy += (start[0] > cy ? 1 : -1);
                        } else {
                            cx += (start[1] > cx ? 1 : -1);
                        }
                        map[cy][cx] = TILES.FLOOR;
                        visited[cy][cx] = true;
                    }
                }
            }
        }
    }
    return map;
}


// Pântano com água e ilhas conectadas por lama
function generateSwampMap(rand, H, W) {
    const map = Array.from({ length: H }, () => Array(W).fill(TILES.MUD));
    const lakes = 2 + (rand() % 3);
    const waterCenters = [];
    for (let i = 0; i < lakes; i++) {
        const r = 2 + (rand() % 3);
        const cx = r + (rand() % (W - 2 * r));
        const cy = r + (rand() % (H - 2 * r));
        waterCenters.push({ cx, cy, r });
        for (let y = -r; y <= r; y++)
            for (let x = -r; x <= r; x++)
                if (x * x + y * y <= r * r)
                    map[cy + y][cx + x] = TILES.WATER;
    }
    // Add mud bridges between water pools
    for (let i = 0; i < waterCenters.length - 1; i++) {
        const a = waterCenters[i], b = waterCenters[i + 1];
        let x1 = a.cx, y1 = a.cy;
        const x2 = b.cx, y2 = b.cy;
        while (x1 !== x2) {
            map[y1][x1] = TILES.MUD;
            x1 += x2 > x1 ? 1 : -1;
        }
        while (y1 !== y2) {
            map[y1][x1] = TILES.MUD;
            y1 += y2 > y1 ? 1 : -1;
        }
    }
    return map;
}

// Deserto com dunas e ruínas conectadas
function generateDesertMap(rand, H, W) {
    const map = Array.from({ length: H }, () => Array(W).fill(TILES.SAND));
    const dunes = 3 + (rand() % 3);
    for (let i = 0; i < dunes; i++) {
        const r = 1 + (rand() % 3);
        const cx = Math.floor(rand() % W);
        const cy = Math.floor(rand() % H);
        for (let y = -r; y <= r; y++)
            for (let x = -r; x <= r; x++)
                if (x * x + y * y <= r * r && cy + y >= 0 && cy + y < H && cx + x >= 0 && cx + x < W)
                    map[cy + y][cx + x] = TILES.ROCK;
    }
    const ruins = 2 + (rand() % 3);
    for (let i = 0; i < ruins; i++) {
        const rw = 3 + (rand() % 4), rh = 3 + (rand() % 4);
        const rx = Math.floor(rand() % (W - rw));
        const ry = Math.floor(rand() % (H - rh));
        for (let y = ry; y < ry + rh; y++) {
            for (let x = rx; x < rx + rw; x++) {
                map[y][x] = (y === ry || y === ry + rh - 1 || x === rx || x === rx + rw - 1)
                    ? TILES.BRICK : TILES.FLOOR;
            }
        }
        // place door
        const side = rand() % 4;
        if (side === 0) map[ry][rx + 1 + rand() % (rw - 2)] = TILES.FLOOR;
        if (side === 1) map[ry + rh - 1][rx + 1 + rand() % (rw - 2)] = TILES.FLOOR;
        if (side === 2) map[ry + 1 + rand() % (rh - 2)][rx] = TILES.FLOOR;
        if (side === 3) map[ry + 1 + rand() % (rh - 2)][rx + rw - 1] = TILES.FLOOR;
    }
    return map;
}

// Ruínas com salas e corredores simétricos
function generateRuinsMap(rand, H, W) {
    const map = Array.from({ length: H }, () => Array(W).fill(TILES.BRICK));
    const rooms = [];
    const half = Math.floor(W / 2);
    // Generate rooms in left half
    for (let i = 0; i < 5; i++) {
        const rw = 3 + (rand() % 4);
        const rh = 3 + (rand() % 4);
        const rx = rand() % (half - rw - 1) + 1;
        const ry = rand() % (H - rh - 1) + 1;
        rooms.push({ rx, ry, rw, rh });
        for (let y = ry; y < ry + rh; y++) {
            for (let x = rx; x < rx + rw; x++) {
                map[y][x] = (y === ry || y === ry + rh -1 || x === rx || x === rx+rw-1)
                    ? TILES.BRICK : TILES.FLOOR;
            }
        }
    }
    // mirror horizontally
    rooms.forEach(r => {
        for (let y = r.ry; y < r.ry + r.rh; y++) {
            for (let x = r.rx; x < r.rx + r.rw; x++) {
                map[y][W-1 - x] = map[y][x];
            }
        }
    });
    // connect room centers
    const centers = rooms.map(r => ({ x: r.rx + Math.floor(r.rw/2), y: r.ry + Math.floor(r.rh/2) }));
    centers.forEach(c => centers.push({ x: W-1 - c.x, y: c.y }));
    centers.sort((a,b) => a.x - b.x);
    for (let i = 0; i < centers.length -1; i++) {
        let x1 = centers[i].x, y1 = centers[i].y;
        const x2 = centers[i+1].x, y2 = centers[i+1].y;
        while (x1 !== x2) { x1 += x2>x1?1:-1; map[y1][x1] = TILES.FLOOR; }
        while (y1 !== y2) { y1 += y2>y1?1:-1; map[y1][x1] = TILES.FLOOR; }
    }
    return map;
}
