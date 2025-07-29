/* Geração procedural de mapa com árvores, ciclos, portas trancadas e sem chave master */

// Gera um inteiro aleatório entre 0 e 2^32-1
function RandomSeed(seed) {
    let m = 2 ** 32, a = 1664525, c = 1013904223, state = seed;
    return function() {
        state = (a * state + c) % m;
        return Math.floor(state);
    };
}

class Sala {
    constructor(id) {
        this.id = id;
        this.vizinhas = [];     // conexões
        this.tipo = "normal";
        this.objetos = [];      // baús, itens mágicos, npcs, etc
        this.chave = null;      // id da chave nesta sala
        this.final = false;     // se é a sala final
        this.travadaCom = null; // id da chave que abre esta sala (para a porta que leva ao final)
        this.pos = { x: 0, y: 0 };
        this.profundidade = -1
        this.nivelBloqueio = 0; //quantas portas trancadas até chegar aqui?
    }

    conectar(sala, travada = false, chaveId = null) {
        this.vizinhas.push({ sala, travada, chaveId });
        sala.vizinhas.push({ sala: this, travada, chaveId });
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

const MAX_SALAS = 25;
const MIN_SALAS = 7;
const TIPOS_DE_SALA = ["puzzle", "tesouro", "inimigos", "inimigos", "miniboss", "corredor", "npcs"]
const TIPOS_SALA_END = ["tesouro", "tesouro", "tesouro", "npcs"] //salas sem saída

/*
  Gera mapa completo, mantendo a sala final como parte de um ramo trancado por uma das chaves geradas.
*/
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
        console.log(doLadoDeCa)
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
    
    // gerar biomas
    // escolhe alguns centros, um bioma aleatório e faz uma bfs multisorce.
    // o bioma de uma sala é o bioma com o centro mais próximo

    // gerar layout geral das salas
    // tamanho, altura, posição das portas e itens
    

    // gerar aparência das salas.
    // colocar tiles do chão, paredes, árvores, etc

    // sala como uma matriz de tiles. 
    // ou várias matrizes, cada uma como uma layer (exemplo, chão e decoração)

    return salas;
}

// criar função para renderizar o mapa, o jogador, os inimigos, etc...


function mostrarMapa(salas) {
    for (const sala of salas) {
        let texto = `Sala ${sala.id}`;
        if (sala.chave) texto += ` (tem chave: ${sala.chave})`;
        if (sala.final) texto += ` [FINAL]`;
        texto += " {" + sala.tipo + "} " + ` block(${sala.nivelBloqueio})` 
        console.log(texto);
        for (const viz of sala.vizinhas) {
            const travada = viz.travada ? ` (trancada com ${viz.chaveId})` : '';
            console.log(`  ↳ Sala ${viz.sala.id}${travada}`);
        }
    }
}
