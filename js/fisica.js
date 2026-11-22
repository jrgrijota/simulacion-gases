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
//  El aire de fuera del globo son moléculas de verdad: chocan entre sí, con
//  la goma (la empujan hacia dentro) y con el borde del visor. Ese borde hace
//  de «resto de la atmósfera»: entran o salen moléculas para que fuera haya
//  siempre la misma densidad y la misma temperatura (la de la sala), y así
//  la misma presión, 1 atm.
//  Este archivo no dibuja nada (ver js/escena.js).
// ═══════════════════════════════════════════════════════════════════

// Presión = impulso de los choques por segundo · K_PRESION / perímetro.
const K_PRESION = 4;              // calibra la escala en atm
const RADIO_MAX_GLOBO = 235;
const K_TOPE = 0.04, K_REDONDEZ = 0.03, K_ESTRUCTURA = 0.15, AMORTIGUACION = 0.86;
const NUM_NODOS = 60;
const RADIO_REPOSO = 90;          // radio inicial del globo
const LITROS_POR_PX2 = 5.0 / (Math.PI * 220 * 220);   // V ∝ área: 5 L con 220 px de radio

// Aire de la sala: temperatura fija y la densidad que da 1 atm (la misma que
// la de 50 moléculas a 273 K en 1,20 L, que es como se calibró la presión)
const T_AIRE = 273;
const DENS_AIRE = 50 / (1.2 / LITROS_POR_PX2);
// Rapidez² media de una molécula a T_AIRE (velocidadTermica: uniforme entre 1,5 y 3,5 a 300 K)
const V2_AIRE = (3.5 ** 3 - 1.5 ** 3) / 6 * T_AIRE / 300;

// Recipiente rígido: ancho fijo y fondo fijo; el émbolo marca la altura
const RECT_W = 347, RECT_FONDO = 180;
const VOL_MIN = 0.09, VOL_MAX = 4.60;                 // L (los mismos que la pared rígida de antes)

// Ventana del modelo en px de física (el aire de fuera llega un poco más allá)
const R_VENTANA_FIS = 182 / 0.62;   // radio físico que cubre el visor del modelo (ESCALA_MODELO en escena.js)

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
    aire: [], presionFuera: 0,
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
function volumenEquilibrio() { return 1.2 * (G.N / 50) * (G.T / 273); }
function radioEquilibrio() { return constrain(sqrt(volumenEquilibrio() / LITROS_POR_PX2 / PI), radioMinGlobo(), RADIO_MAX_GLOBO - 4); }
// Lo más que puede encoger la goma: lo justo para las moléculas de dentro
// apretadas. Sin gas dentro (vacío), el radio de una sola molécula.
function radioMinGlobo() { return Math.max(G.rParticula + 1, G.rParticula * sqrt(G.N / 0.8)); }

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
        const a = random(TWO_PI), d = random(0, max(0, G.radioMedio - G.rParticula - 3));
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
function fijarMoleculas(N) { G.N = constrain(Math.round(N), 0, 500); }
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
        iniciarMembrana(constrain(sqrt(G.area / PI), radioMinGlobo(), RADIO_MAX_GLOBO - 4));
    }
    G.modo = m;
    for (const p of G.particulas) { const q = posicionDentro(); p.x = q.x; p.y = q.y; }
    impulsosRecientes = []; impulsoEsteSegundo = 0; choquesEsteSegundo = 0;
    G.aire = []; G.marcas = [];
}

function reiniciarFisica(T, N) {
    G.T = T; G.Tanterior = T; G.N = N;
    G.particulas = []; G.aire = []; G.marcas = [];
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

    // Temperatura: la rapidez de las moléculas escala con √T.
    // Va antes de añadir moléculas: las nuevas ya nacen con la rapidez de la
    // temperatura actual y no deben escalarse otra vez.
    if (G.T !== G.Tanterior) {
        const escalar = (lista) => {
            for (const p of lista) {
                if (G.T === 0) { p.vx = 0; p.vy = 0; }
                else if (G.Tanterior === 0) { const v = velocidadTermica(G.T), a = random(TWO_PI); p.vx = v * cos(a); p.vy = v * sin(a); }
                else { const f = sqrt(G.T / G.Tanterior); p.vx *= f; p.vy *= f; }
            }
        };
        escalar(G.particulas);   // el aire de fuera sigue a la temperatura de la sala
        G.Tanterior = G.T;
    }
    gestionarParticulas();

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
    choquesEntreMoleculas(G.particulas);
    pasoAire();

    const ahora = millis();
    while (G.marcas.length && ahora - G.marcas[0].t > 320) G.marcas.shift();
}

function pasoMembrana() {
    const nodos = G.nodos, vel = G.velNodos, rMin = radioMinGlobo();
    for (let i = 0; i < NUM_NODOS; i++) {
        const n = nodos[i];
        const d = Math.hypot(n.x, n.y) || 1, nx = n.x / d, ny = n.y / d;
        const izq = nodos[(i - 1 + NUM_NODOS) % NUM_NODOS], der = nodos[(i + 1) % NUM_NODOS];
        // Cohesión: cada nodo tiende al radio medio de sus vecinos (alisa los
        // bultos sin tirar del globo hacia dentro) y, suave, al radio medio.
        const rVec = (Math.hypot(izq.x, izq.y) + Math.hypot(der.x, der.y)) / 2;
        const fRadial = (rVec - d) * 2 * K_ESTRUCTURA + (G.radioMedio - d) * K_REDONDEZ;
        // Los choques de las moléculas (de dentro y de fuera) ya han dado su
        // empujón en velNodos; aquí solo queda el tope de la goma estirada.
        let tope = 0;
        if (d > RADIO_MAX_GLOBO) tope = (d - RADIO_MAX_GLOBO) * K_TOPE;
        const f = fRadial - tope;
        vel[i].x += nx * f; vel[i].y += ny * f;
        vel[i].x *= AMORTIGUACION; vel[i].y *= AMORTIGUACION;
        n.x += vel[i].x; n.y += vel[i].y;
        // Cada nodo se mueve solo en su radio (no se amontonan ni la goma se
        // cruza consigo misma) y no encoge por debajo del mínimo
        const a = i / NUM_NODOS * TWO_PI, ux = cos(a), uy = sin(a);
        let rad = n.x * ux + n.y * uy, vr = vel[i].x * ux + vel[i].y * uy;
        if (rad < rMin) { rad = rMin; if (vr < 0) vr = 0; }
        n.x = ux * rad; n.y = uy * rad;
        vel[i].x = ux * vr; vel[i].y = uy * vr;
    }
}

// Empujón de un choque a la goma: al nodo i y, menos, a sus vecinos.
// signo +1 hacia fuera (molécula de dentro), −1 hacia dentro (aire de fuera).
function empujarGoma(i, nx, ny, vn) {
    const fx = nx * vn * 1.6, fy = ny * vn * 1.6, v = G.velNodos;
    const k = (j, f) => { const n = (i + j + NUM_NODOS) % NUM_NODOS; v[n].x += fx * f; v[n].y += fy * f; };
    k(0, 1); k(-1, 0.6); k(1, 0.6); k(-2, 0.3); k(2, 0.3);
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
        empujarGoma(i, nx, ny, vn);
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

// Choques entre moléculas de una misma lista. Rejilla de celdas del tamaño
// de una molécula: solo se miran las vecinas (no todas contra todas).
const rejilla = new Map();
function choquesEntreMoleculas(lista) {
    const dMin = G.rParticula * 2, c = Math.max(dMin, 4);
    rejilla.clear();
    const clave = (cx, cy) => (cx + 2048) * 4096 + (cy + 2048);
    for (let i = 0; i < lista.length; i++) {
        const p = lista[i], k = clave(Math.floor(p.x / c), Math.floor(p.y / c));
        const celda = rejilla.get(k);
        if (celda) celda.push(i); else rejilla.set(k, [i]);
    }
    for (let i = 0; i < lista.length; i++) {
        const p1 = lista[i], cx = Math.floor(p1.x / c), cy = Math.floor(p1.y / c);
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
            const celda = rejilla.get(clave(cx + ox, cy + oy));
            if (!celda) continue;
            for (const j of celda) {
                if (j <= i) continue;
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
}

// ── Aire de fuera (solo alrededor del globo) ──────────────────────
// Moléculas de verdad a la temperatura de la sala: chocan entre sí y con la
// goma, a la que empujan hacia dentro. El borde del visor es el resto de la
// atmósfera: si sobran moléculas (el globo ha crecido) salen por él; si
// faltan (ha encogido), entran nuevas. Así fuera siempre hay 1 atm.
let impulsoAire = 0, impulsosAire = [], pasosAire = 0;
function aireNuevo(d, a, haciaDentro) {
    const v = velocidadTermica(T_AIRE);
    let b = random(TWO_PI);
    if (haciaDentro) b = a + PI + random(-1.2, 1.2);
    return { x: cos(a) * d, y: sin(a) * d, vx: v * cos(b), vy: v * sin(b) };
}
function pasoAire() {
    if (G.modo !== 'globo') { G.aire = []; return; }
    const R = R_VENTANA_FIS;
    const objetivo = Math.round(DENS_AIRE * (PI * R * R - G.area));
    if (!G.aire.length) {
        // Al empezar, repartidas por todo el espacio de fuera
        const rMin = G.radioMedio + G.rParticula + 4;
        for (let n = 0; n < objetivo; n++) G.aire.push(aireNuevo(sqrt(random(rMin * rMin, R * R)), random(TWO_PI), false));
    }
    let sobran = G.aire.length - objetivo;
    for (let q = G.aire.length - 1; q >= 0; q--) {
        const p = G.aire[q];
        p.x += p.vx; p.y += p.vy;
        const d = Math.hypot(p.x, p.y) || 1, nx = p.x / d, ny = p.y / d;
        const vn = p.vx * nx + p.vy * ny;
        if (d > R) {
            if (vn > 0) {
                if (sobran > 0) { G.aire.splice(q, 1); sobran--; continue; }   // sale a la atmósfera
                p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny;
            }
            continue;
        }
        const { i, r } = radioParedEn(Math.atan2(p.y, p.x));
        const rMin = r + G.rParticula + 1;
        if (d < rMin) {
            if (vn < 0) {
                impulsoAire -= 2 * vn;
                empujarGoma(i, nx, ny, vn);          // vn < 0: hacia dentro
                p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny;
            }
            p.x = nx * rMin; p.y = ny * rMin;
        }
    }
    // La sala mantiene su temperatura: si el aire se ha enfriado o calentado
    // un poco (salen más por el borde las rápidas), se corrige poco a poco
    if (G.aire.length) {
        let v2 = 0;
        for (const p of G.aire) v2 += p.vx * p.vx + p.vy * p.vy;
        v2 /= G.aire.length;
        const f = 1 + (sqrt(V2_AIRE / Math.max(v2, 1e-6)) - 1) * 0.05;
        for (const p of G.aire) { p.vx *= f; p.vy *= f; }
    }
    // Entran desde el borde las que faltan, poco a poco
    for (let n = 0; n < 3 && sobran < 0; n++, sobran++) G.aire.push(aireNuevo(R - 1, random(TWO_PI), true));
    choquesEntreMoleculas(G.aire);
    // Presión que hace el aire sobre la goma (para comprobarla: media de 3 s)
    if (++pasosAire >= 60) {
        impulsosAire.push(impulsoAire); impulsoAire = 0; pasosAire = 0;
        if (impulsosAire.length > 3) impulsosAire.shift();
    }
    const imp = impulsosAire.length ? impulsosAire.reduce((a, b) => a + b, 0) / impulsosAire.length : 0;
    G.presionFuera = imp * K_PRESION / (TWO_PI * (G.radioMedio + G.rParticula + 1));
}
