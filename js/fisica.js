// ═══════════════════════════════════════════════════════════════════
//  FÍSICA DEL GAS (la de siempre de esta simulación)
//
//  Moléculas que se mueven en línea recta y chocan entre sí y con la pared.
//  La presión sale de los choques contra la pared: impulso por segundo
//  (media de 3 s) entre la longitud de la pared. Así P ∝ N·T / V.
//
//  Dos recipientes, en las mismas coordenadas (centro del modelo en 0, 0;
//  unidades = «px de física», como en la versión anterior):
//   · Globo: membrana de 60 nodos empujada desde fuera por la atmósfera
//     (1 atm). Crece o encoge hasta que la presión de dentro iguala a la
//     de fuera (V ∝ N·T, leyes de Charles y de Avogadro).
//   · Recipiente rígido: corte de un cilindro (rectángulo de ancho fijo)
//     cerrado arriba por un émbolo que solo se mueve con el mando
//     «Volumen» (P ∝ 1/V, ley de Boyle; P ∝ T, ley de Gay-Lussac). El
//     termostato mantiene la temperatura al mover el émbolo.
//
//  El «aire de fuera» que se ve alrededor del globo es solo un dibujo: la
//  atmósfera ya actúa como presión constante sobre la membrana.
//  Este archivo no dibuja nada (ver js/escena.js).
// ═══════════════════════════════════════════════════════════════════

const P_ATMOSFERA = 1.0;          // atm, presión exterior sobre el globo
// Velocidad que una presión de 1 atm comunica a un nodo por fotograma y por px
// de membrana. Sale de cómo se mide la presión en este archivo: cada choque
// reparte 1,6·(1 + 2·0,6 + 2·0,3) = 4,48·v_normal entre 5 nodos y
// P = impulso/s · K_PRESION / perímetro, con impulso = 2·v_normal a 60 fps.
const K_PRESION = 4;              // calibra la escala en atm
const K_EMPUJE_EXTERIOR = 4.48 / (2 * 60 * K_PRESION);
const RADIO_MIN_GLOBO = 28, RADIO_MAX_GLOBO = 235;
const K_TOPE = 0.08, K_REDONDEZ = 0.03, K_ESTRUCTURA = 0.15, AMORTIGUACION = 0.86;
const NUM_NODOS = 60;
const RADIO_REPOSO = 90;          // radio inicial del globo
const LITROS_POR_PX2 = 5.0 / (Math.PI * 220 * 220);   // V ∝ área: 5 L con 220 px de radio

// Recipiente rígido: ancho fijo y fondo fijo; el émbolo marca la altura
const RECT_W = 347, RECT_FONDO = 180;
const VOL_MIN = 0.09, VOL_MAX = 4.60;                 // L (los mismos que la pared rígida de antes)

// Ventana del modelo en px de física (el aire de fuera llega un poco más allá)
const R_VENTANA_FIS = 253;

const G = {
    modo: 'globo',
    T: 273, Tanterior: 273,
    N: 50,
    rParticula: 2,
    particulas: [],
    nodos: [], velNodos: [],
    radioMedio: RADIO_REPOSO,
    area: Math.PI * RADIO_REPOSO * RADIO_REPOSO,
    volumen: 0, presion: 0,
    volRigido: 1.2,                 // L, posición del émbolo
    H: 0,                           // altura del gas en el recipiente rígido
    choquesSeg: 0, totalChoques: 0,
    pasos: 0,                    // pasos de simulación desde el arranque (60 = 1 s a 60 fps)
    aire: [], densAire: null,
    marcas: [],
    pausa: false,
};
let choquesEsteSegundo = 0, impulsoEsteSegundo = 0, impulsosRecientes = [], impulsoPorSegundo = 0;
// La medida va por pasos de la simulación (60 pasos = 1 s a 60 fps), no por el reloj:
// así la presión no depende de lo rápido que dibuje el ordenador.
let pasosMedida = 0;

function velocidadTermica(T) { return T > 0 ? random(1.5, 3.5) * sqrt(T / 300) : 0; }

function iniciarMembrana(r) {
    G.nodos = []; G.velNodos = []; G.radioMedio = r;
    for (let i = 0; i < NUM_NODOS; i++) {
        const a = i / NUM_NODOS * TWO_PI;
        G.nodos.push({ x: cos(a) * r, y: sin(a) * r });
        G.velNodos.push({ x: 0, y: 0 });
    }
    G.radioMedio = r;
}

// Volumen del globo en equilibrio a 1 atm (calibrado: 50 moléculas a 273 K → 1,20 L).
// Solo se usa para arrancar ya en equilibrio, sin la sacudida inicial.
function volumenEquilibrio() { return 1.2 * (G.N / 50) * (Math.max(G.T, 1) / 273); }
function radioEquilibrio() { return constrain(sqrt(volumenEquilibrio() / LITROS_POR_PX2 / PI), RADIO_MIN_GLOBO + 4, RADIO_MAX_GLOBO - 4); }

function iniciarFisica() {
    iniciarMembrana(radioEquilibrio());
    fijarVolumenRigido(G.volRigido);
    G.particulas = [];
    gestionarParticulas();
    pasosMedida = 0;
}

// Posición al azar dentro del recipiente
function posicionDentro() {
    if (G.modo === 'globo') {
        const a = random(TWO_PI), d = random(0, max(5, G.radioMedio - G.rParticula - 10));
        return { x: cos(a) * d, y: sin(a) * d };
    }
    const m = G.rParticula + 1;
    return { x: random(-RECT_W / 2 + m, RECT_W / 2 - m), y: random(RECT_FONDO - G.H + m, RECT_FONDO - m) };
}

function gestionarParticulas() {
    while (G.particulas.length < G.N) {
        const p = posicionDentro(), v = velocidadTermica(G.T), a = random(TWO_PI);
        G.particulas.push({ x: p.x, y: p.y, vx: v * cos(a), vy: v * sin(a) });
    }
    while (G.particulas.length > G.N) G.particulas.pop();
}

// ── Mandos ────────────────────────────────────────────────────────
function fijarTemperatura(T) { G.T = constrain(Math.round(T), 0, 500); }
function fijarMoleculas(N) { G.N = constrain(Math.round(N), 1, 500); }
function fijarVolumenRigido(L) {
    G.volRigido = constrain(L, VOL_MIN, VOL_MAX);
    G.H = G.volRigido / LITROS_POR_PX2 / RECT_W;
    // Las moléculas que quedan por encima del émbolo bajan con él (el
    // termostato mantiene la temperatura: no cambia su rapidez)
    const techo = RECT_FONDO - G.H + G.rParticula + 1;
    if (G.modo === 'rigido') for (const p of G.particulas) if (p.y < techo) p.y = techo + random(0, max(0, G.H - 2 * G.rParticula - 2));
}

function cambiarModo(m) {
    if (m === G.modo) return;
    if (m === 'rigido') {
        // El recipiente rígido empieza con el volumen que tenía el globo
        // (si aún no se ha asentado, con el de equilibrio)
        const v = G.pasos < 300 ? volumenEquilibrio() : G.area * LITROS_POR_PX2;
        fijarVolumenRigido(Math.round(v * 100) / 100);
    } else {
        iniciarMembrana(constrain(sqrt(G.area / PI), RADIO_MIN_GLOBO + 4, RADIO_MAX_GLOBO - 4));
    }
    G.modo = m;
    for (const p of G.particulas) { const q = posicionDentro(); p.x = q.x; p.y = q.y; }
    impulsosRecientes = []; impulsoEsteSegundo = 0; choquesEsteSegundo = 0;
    G.aire = []; G.marcas = [];
}

function reiniciarFisica(T, N) {
    G.T = T; G.Tanterior = T; G.N = N;
    G.particulas = []; G.aire = []; G.densAire = null; G.marcas = [];
    iniciarMembrana(radioEquilibrio());
    fijarVolumenRigido(1.2);
    gestionarParticulas();
    impulsosRecientes = []; impulsoEsteSegundo = 0; choquesEsteSegundo = 0; impulsoPorSegundo = 0;
    G.totalChoques = 0; G.choquesSeg = 0; G.pasos = 0;
    pasosMedida = 0;
}

// ¿Hay ya al menos un segundo de choques medido? (antes, la presión aún vale 0)
function medidaLista() { return impulsosRecientes.length > 0; }

function pausar(si) {
    if (si === G.pausa) return;
    G.pausa = si;
}

// ── Un paso (un fotograma) ────────────────────────────────────────
function pasoFisica() {
    if (G.pausa) return;
    G.pasos++;
    gestionarParticulas();

    // Temperatura: la rapidez de las moléculas escala con √T
    if (G.T !== G.Tanterior) {
        const escalar = (lista) => {
            for (const p of lista) {
                if (G.T === 0) { p.vx = 0; p.vy = 0; }
                else if (G.Tanterior === 0) { const v = velocidadTermica(G.T), a = random(TWO_PI); p.vx = v * cos(a); p.vy = v * sin(a); }
                else { const f = sqrt(G.T / G.Tanterior); p.vx *= f; p.vy *= f; }
            }
        };
        escalar(G.particulas); escalar(G.aire);
        G.Tanterior = G.T;
    }

    if (G.modo === 'globo') {
        let area = 0;
        for (let i = 0; i < NUM_NODOS; i++) {
            const a = G.nodos[i], b = G.nodos[(i + 1) % NUM_NODOS];
            area += a.x * b.y - b.x * a.y;
        }
        G.area = abs(area) / 2;
        let rm = 0;
        for (const n of G.nodos) rm += Math.hypot(n.x, n.y);
        G.radioMedio = rm / NUM_NODOS;
    } else {
        G.area = RECT_W * G.H;
    }

    // Presión: media de los 3 últimos segundos de choques
    if (++pasosMedida >= 60) {
        G.choquesSeg = choquesEsteSegundo; choquesEsteSegundo = 0;
        impulsosRecientes.push(impulsoEsteSegundo); impulsoEsteSegundo = 0;
        if (impulsosRecientes.length > 3) impulsosRecientes.shift();
        impulsoPorSegundo = impulsosRecientes.reduce((a, b) => a + b, 0) / impulsosRecientes.length;
        pasosMedida = 0;
    }
    const perimetro = G.modo === 'globo' ? TWO_PI * G.radioMedio : 2 * (RECT_W + G.H);
    G.volumen = G.area * LITROS_POR_PX2;
    G.presion = G.T === 0 ? 0 : impulsoPorSegundo * K_PRESION / perimetro;

    if (G.modo === 'globo') pasoMembrana();

    for (const p of G.particulas) {
        p.x += p.vx; p.y += p.vy;
        if (G.modo === 'globo') paredGlobo(p); else paredRigida(p);
    }
    choquesEntreMoleculas();
    pasoAire();

    const ahora = millis();
    while (G.marcas.length && ahora - G.marcas[0].t > 320) G.marcas.shift();
}

function pasoMembrana() {
    const nodos = G.nodos, vel = G.velNodos;
    for (let i = 0; i < NUM_NODOS; i++) {
        const n = nodos[i];
        const d = Math.hypot(n.x, n.y) || 1, nx = n.x / d, ny = n.y / d;
        const izq = nodos[(i - 1 + NUM_NODOS) % NUM_NODOS], der = nodos[(i + 1) % NUM_NODOS];
        // Cohesión: cada nodo tiende al radio medio de sus vecinos (alisa los
        // bultos sin tirar del globo hacia dentro) y, suave, al radio medio.
        const rVec = (Math.hypot(izq.x, izq.y) + Math.hypot(der.x, der.y)) / 2;
        const fRadial = (rVec - d) * 2 * K_ESTRUCTURA + (G.radioMedio - d) * K_REDONDEZ;
        // Empuje de la atmósfera, proporcional al trozo de membrana del nodo
        const tramo = (dist(n.x, n.y, izq.x, izq.y) + dist(n.x, n.y, der.x, der.y)) / 2;
        let empuje = K_EMPUJE_EXTERIOR * P_ATMOSFERA * tramo;
        if (d > RADIO_MAX_GLOBO) empuje += (d - RADIO_MAX_GLOBO) * K_TOPE;
        if (d < RADIO_MIN_GLOBO) empuje -= (RADIO_MIN_GLOBO - d) * K_TOPE;
        const f = fRadial - empuje;
        vel[i].x += nx * f; vel[i].y += ny * f;
        vel[i].x *= AMORTIGUACION; vel[i].y *= AMORTIGUACION;
        n.x += vel[i].x; n.y += vel[i].y;
    }
}

function radioParedEn(ang) {
    if (ang < 0) ang += TWO_PI;
    const i = Math.floor(ang / TWO_PI * NUM_NODOS) % NUM_NODOS;
    return { i, r: Math.hypot(G.nodos[i].x, G.nodos[i].y) };
}

function anotarChoque(x, y, nx, ny) {
    if (G.marcas.length < 60) G.marcas.push({ x, y, nx, ny, t: millis() });
}

function paredGlobo(p) {
    const d = Math.hypot(p.x, p.y) || 1;
    const { i, r } = radioParedEn(Math.atan2(p.y, p.x));
    if (d < r - G.rParticula) return;
    const nx = p.x / d, ny = p.y / d;
    const vn = p.vx * nx + p.vy * ny;
    if (vn > 0) {
        G.totalChoques++; choquesEsteSegundo++;
        impulsoEsteSegundo += 2 * vn;
        const fx = nx * vn * 1.6, fy = ny * vn * 1.6, v = G.velNodos;
        const k = (j, f) => { const n = (i + j + NUM_NODOS) % NUM_NODOS; v[n].x += fx * f; v[n].y += fy * f; };
        k(0, 1); k(-1, 0.6); k(1, 0.6); k(-2, 0.3); k(2, 0.3);
        p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny;
        anotarChoque(nx * r, ny * r, nx, ny);
    }
    p.x = nx * (r - G.rParticula - 1); p.y = ny * (r - G.rParticula - 1);
}

function paredRigida(p) {
    const rp = G.rParticula, x0 = -RECT_W / 2 + rp, x1 = RECT_W / 2 - rp;
    const y0 = RECT_FONDO - G.H + rp, y1 = RECT_FONDO - rp;
    const choque = (vn, x, y, nx, ny) => {
        G.totalChoques++; choquesEsteSegundo++;
        impulsoEsteSegundo += 2 * Math.abs(vn);
        anotarChoque(x, y, nx, ny);
    };
    if (p.x < x0) { if (p.vx < 0) { choque(p.vx, -RECT_W / 2, p.y, -1, 0); p.vx = -p.vx; } p.x = x0; }
    else if (p.x > x1) { if (p.vx > 0) { choque(p.vx, RECT_W / 2, p.y, 1, 0); p.vx = -p.vx; } p.x = x1; }
    if (p.y < y0) { if (p.vy < 0) { choque(p.vy, p.x, RECT_FONDO - G.H, 0, -1); p.vy = -p.vy; } p.y = y0; }
    else if (p.y > y1) { if (p.vy > 0) { choque(p.vy, p.x, RECT_FONDO, 0, 1); p.vy = -p.vy; } p.y = y1; }
}

function choquesEntreMoleculas() {
    const lista = G.particulas, dMin = G.rParticula * 2;
    for (let i = 0; i < lista.length; i++) {
        const p1 = lista[i];
        for (let j = i + 1; j < lista.length; j++) {
            const p2 = lista[j];
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            if (Math.abs(dx) >= dMin || Math.abs(dy) >= dMin) continue;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d >= dMin || (p1.vx === 0 && p2.vx === 0)) continue;
            const s = dMin - d, nx = dx / (d || 1), ny = dy / (d || 1);
            p1.x -= nx * s / 2; p1.y -= ny * s / 2; p2.x += nx * s / 2; p2.y += ny * s / 2;
            const pe = (p1.vx - p2.vx) * nx + (p1.vy - p2.vy) * ny;
            if (pe > 0) { p1.vx -= pe * nx; p1.vy -= pe * ny; p2.vx += pe * nx; p2.vy += pe * ny; }
        }
    }
}

// ── Aire de fuera (solo se dibuja; solo alrededor del globo) ──────
// Misma temperatura y misma presión (1 atm) que el gas del globo en
// equilibrio, así que la misma densidad: N / área, suavizada.
function pasoAire() {
    if (G.modo !== 'globo') { G.aire = []; return; }
    const dens = G.N / max(G.area, 1);
    G.densAire = G.densAire == null ? dens : G.densAire + (dens - G.densAire) * 0.01;
    const areaFuera = PI * R_VENTANA_FIS * R_VENTANA_FIS - G.area;
    const objetivo = Math.min(900, Math.round(G.densAire * areaFuera));
    let n = 0;
    while (G.aire.length < objetivo && n++ < 20) {
        const a = random(TWO_PI), rMin = G.radioMedio + 12;
        const d = sqrt(random(rMin * rMin, R_VENTANA_FIS * R_VENTANA_FIS));
        const v = velocidadTermica(G.T), b = random(TWO_PI);
        G.aire.push({ x: cos(a) * d, y: sin(a) * d, vx: v * cos(b), vy: v * sin(b) });
    }
    if (G.aire.length > objetivo + 5) G.aire.length = objetivo;
    for (const p of G.aire) {
        p.x += p.vx; p.y += p.vy;
        const d = Math.hypot(p.x, p.y) || 1, nx = p.x / d, ny = p.y / d;
        const vn = p.vx * nx + p.vy * ny;
        if (d > R_VENTANA_FIS) {         // vuelve a entrar en la ventana
            if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
            continue;
        }
        const { r } = radioParedEn(Math.atan2(p.y, p.x));
        const rMin = r + G.rParticula + 1;
        if (d < rMin) {
            if (vn < 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
            p.x = nx * rMin; p.y = ny * rMin;
        }
    }
}
