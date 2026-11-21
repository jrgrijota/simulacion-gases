// ═══════════════════════════════════════════════════════════════════
//  ESCENA DE «CINÉTICA DE GASES»
//
//  Una sola escena (retícula A de la guía de diseño v2):
//   · columna 1: el objeto (globo de goma o cilindro de vidrio con émbolo)
//     sobre la base común (termostato, boquilla, manómetro, llave y sonda
//     del termómetro) y, debajo, los mandos HTML;
//   · columna 2: el modelo, todo el gas cortado por la mitad;
//   · columna 3: el panel de estado;
//   · abajo: la gráfica en papel (P–V, V–T o P–T).
//  El objeto se dibuja en las coordenadas del boceto aprobado
//  (/capturas/escena-gases/boceto.html, 400 × 340) y se coloca con OBJ.
//  La física está en js/fisica.js; los retos y el álbum en js/retos.js.
// ═══════════════════════════════════════════════════════════════════

let CV_W = 1330, CV_H = 680;
let ESC_MOVIL = null;
let OBJ, MANDOS, MODELO, PANEL, GRAPH, TARJETAS, CARRIL_G;

// Colores propios (objetos reales: fijos; lo de alrededor sigue al tema)
const COL = {
    latex: '#e8435a', latexClaro: '#ff7d8c', latexOsc: '#b52a43', latexBrillo: '#ff9aa6',
    metal1: '#2f4558', metal2: '#46627a', metal3: '#8fa9be', metalClaro: '#b8cad8', vastago: '#9fb6c8',
    vidrio: '#d8efff', sonda: '#d7e3ec', cable: '#55708a', esfera: '#eef6fc', aguja: '#c0392b',
    lenta: '#5fd4c4', rapida: '#ff7fd0', piloto: '#34e3a8',
};
const TEMA_PROPIO = {
    pizarra:   { choque: '#ffffff', grad: '#d8efff', interior: '#0d1924', aire: 'rgba(127,151,173,0.42)', rotuloObj: '#b5d3ec', rotuloTermo: '#e3edf5' },
    dia:       { choque: '#0b2236', grad: '#3f5f7a', interior: '#d4e3ef', aire: 'rgba(63,95,122,0.35)', rotuloObj: '#3f5f7a', rotuloTermo: '#e3edf5' },
    marca:     { choque: '#1e293b', grad: '#475569', interior: '#e2e8f0', aire: 'rgba(100,116,139,0.35)', rotuloObj: '#64748b', rotuloTermo: '#e3edf5', ink: '#1e293b' },
    contraste: { choque: '#ffffff', grad: '#ffffff', interior: '#000000', aire: 'rgba(255,255,255,0.35)', rotuloObj: '#ffffff', rotuloTermo: '#ffffff', ink: '#000000' },
};
const tinta = () => THEME.ink || '#071a2b';

// Píxeles del modelo por píxel físico (con r = 182)
const ESCALA_MODELO = 0.62;

// ── Composición ──────────────────────────────────────────────────
function calcularEscena() {
    const movil = esMovil();
    const cambia = movil !== ESC_MOVIL;
    ESC_MOVIL = movil;
    const rig = G.modo === 'rigido';
    if (!movil) {
        CV_W = 1330; CV_H = 680;
        TARJETAS = [{ x: 0, y: 0, w: 1330, h: 540 }];
        OBJ = { tx: 22, ty: 4, s: 0.95 };
        MANDOS = { x: 42, y: rig ? 328 : 350, w: 360 };
        MODELO = { cx: 662, cy: 232, r: 182 };
        PANEL = { x: 902, y: 30, w: 400, h: 480, compacto: false };
        GRAPH = { x: 0, y: 552, w: 1330, h: 128 };
        CARRIL_G = { x: 12, y: 564, w: 200 };
    } else {
        CV_W = 370;
        const hA = rig ? 538 : 494;
        OBJ = { tx: 2, ty: 8, s: 0.9 };
        MANDOS = { x: 18, y: 318, w: 334 };
        TARJETAS = [{ x: 0, y: 0, w: 370, h: hA }];
        PANEL = { x: 0, y: hA + 16, w: 370, h: 414, compacto: true };
        const r = 165;
        MODELO = { cx: 185, cy: PANEL.y + PANEL.h + 16 + r, r };
        GRAPH = { x: 0, y: MODELO.cy + r + 110, w: 370, h: 224 };
        CARRIL_G = { x: 12, y: GRAPH.y + 12, w: 346 };
        CV_H = GRAPH.y + GRAPH.h + 6;
    }
    colocarMandos();
    return cambia;
}
function colocarMandos() {
    colocarSobreLienzo(document.querySelector('.mandos-gas'), MANDOS, CV_W, CV_H);
    colocarSobreLienzo(document.querySelector('.mandos-grafica'), CARRIL_G, CV_W, CV_H);
}
function ajustarEscena(cv) { encajarEscena(cv, CV_W, CV_H, ESC_MOVIL); }
function fitCanvas() {
    const cv = document.querySelector('#canvas-container canvas');
    if (cv) ajustarEscena(cv);
}
function rehacerComposicion() {
    calcularEscena();
    resizeCanvas(CV_W, CV_H);
    fitCanvas();
}
function windowResized() {
    if (calcularEscena()) resizeCanvas(CV_W, CV_H);
    fitCanvas();
}

// ── Estado de la interfaz ────────────────────────────────────────
let unidadC = false;            // temperatura en °C
let ejes = 'vt';                // gráfica: pv · vt · pt
let ejesElegidos = false;       // si el docente ha elegido los ejes, no cambian con el recipiente
let opciones = { color: true, estelas: true, medio: false };
let volSuave = null, embolo = null, agujaP = 1, escalaMano = 4;
let historial = [], acumulado = { p: 0, v: 0, n: 0 }, tGrafica = 0;
let tendencia = [];             // muestras recientes para saber si sube o baja
let rotuloTag = '', rotuloDesde = -1e9;

const fmt = (x, d) => i18n.num(x, d);
const tempTxt = (T) => unidadC ? `${T - 273} °C` : `${T} K`;

// ── Momento clave: las leyes de los gases ────────────────────────
// Se toma una «foto» del gas en equilibrio justo antes de mover un mando.
// Cuando, con lo demás igual, ese mando llega al doble o a la mitad y el gas
// vuelve al equilibrio, se comprueba la ley y se celebra (sin interrumpir).
let tCambio = -1e9, fotoEstable = null, REF = null, CELEB = null, tCero = null;
const ESPERA = 4500;            // ms sin tocar nada para dar el gas por estable (la presión es media de 3 s)

// Reloj de la simulación en ms (por pasos): la espera no depende de los fps
function relojSim() { return G.pasos * 1000 / 60; }
function controles() { return { modo: G.modo, T: G.T, N: G.N, Vr: Math.round(G.volRigido * 100) }; }
function notificarCambio(variable) {
    const c = controles();
    const mismoGrupo = REF && REF.var === variable && REF.modo === c.modo &&
        (variable === 'T' || REF.T === c.T) && (variable === 'N' || REF.N === c.N) && (variable === 'V' || REF.Vr === c.Vr);
    if (!mismoGrupo) REF = fotoEstable && fotoEstable.modo === c.modo ? Object.assign({}, fotoEstable, { var: variable, hecho: false }) : null;
    tCambio = relojSim();
}
function cerca(x, objetivo, tol) { return Math.abs(x / objetivo - 1) <= tol; }

function comprobarLeyes() {
    const ahora = relojSim();
    if (G.pausa) return;
    if (ahora - tCambio < ESPERA) return;
    const c = controles();
    fotoEstable = Object.assign(c, { P: G.presion, V: volSuave, t: ahora });

    // Cero absoluto
    if (G.T === 0) {
        if (tCero == null) tCero = ahora;
        if (ahora - tCero > 1500 && !(CELEB && CELEB.ley === 'cero')) celebrar('cero', 1, null);
    } else tCero = null;

    if (!REF || REF.hecho || REF.modo !== c.modo) return;
    const otrosIguales = (REF.var === 'T' || REF.T === c.T) && (REF.var === 'N' || REF.N === c.N) && (REF.var === 'V' || REF.Vr === c.Vr);
    if (!otrosIguales) return;
    const ratio = { T: REF.T > 0 ? c.T / REF.T : 0, N: c.N / REF.N, V: c.Vr / REF.Vr }[REF.var];
    const x = cerca(ratio, 2, 0.03) ? 2 : cerca(ratio, 0.5, 0.03) ? 0.5 : 0;
    if (!x || !(REF.P > 0.02)) return;
    const rP = G.presion / REF.P, rV = volSuave / REF.V;
    let ley = null;
    if (REF.var === 'V' && c.modo === 'rigido' && cerca(rP * x, 1, 0.12)) ley = 'boyle';
    if (REF.var === 'T' && c.modo === 'globo' && cerca(rV, x, 0.10)) ley = 'charles';
    if (REF.var === 'T' && c.modo === 'rigido' && cerca(rP, x, 0.12)) ley = 'gayLussac';
    if (REF.var === 'N' && c.modo === 'globo' && cerca(rV, x, 0.10)) ley = 'avogadro';
    if (ley) { REF.hecho = true; celebrar(ley, x, REF); }
}
function celebrar(ley, x, ref) {
    CELEB = { ley, x, ref: ref ? Object.assign({}, ref) : null, t0: millis(), P: G.presion, V: volSuave, T: G.T, N: G.N };
    if (typeof retosGanar === 'function') retosGanar(ley, x);
}
function celebrando() { return CELEB && millis() - CELEB.t0 < 6000 && (CELEB.ley !== 'cero' || G.T === 0); }

const LEYES = {
    boyle:     { nombre: 'LEY DE BOYLE', sub2: 'doble de volumen → mitad de presión', subMedio: 'mitad de volumen → doble de presión' },
    charles:   { nombre: 'LEY DE CHARLES', sub2: 'doble de temperatura → doble de volumen', subMedio: 'mitad de temperatura → mitad de volumen' },
    gayLussac: { nombre: 'LEY DE GAY-LUSSAC', sub2: 'doble de temperatura → doble de presión', subMedio: 'mitad de temperatura → mitad de presión' },
    avogadro:  { nombre: 'LEY DE AVOGADRO', sub2: 'doble de moléculas → doble de volumen', subMedio: 'mitad de moléculas → mitad de volumen' },
    cero:      { nombre: 'CERO ABSOLUTO', sub2: 'sin movimiento, sin presión', subMedio: 'sin movimiento, sin presión' },
};

// ── Mensaje del panel de estado ──────────────────────────────────
function tendenciaDe(clave) {
    if (tendencia.length < 2) return 0;
    const a = tendencia[0][clave], b = tendencia[tendencia.length - 1][clave];
    if (!(a > 0.01)) return 0;
    const r = b / a - 1;
    return r > 0.025 ? 1 : r < -0.025 ? -1 : 0;
}
function mensaje() {
    const COLS = { gas: THEME.gas, cambio: THEME.change, frio: THEME.cold, dim: THEME.textDim };
    const N = G.N;
    if (G.pausa) return { tag: i18n.t('EN PAUSA'), col: COLS.dim, txt: i18n.t('Todo está quieto para que lo mires con calma: cuenta las moléculas o mira cómo se reparten. Entre ellas no hay nada, ni siquiera aire.') };
    if (celebrando()) {
        const c = CELEB, dobla = c.x === 2;
        const txt = {
            boyle: dobla ? 'Volumen doble y la misma temperatura: las moléculas tardan más en llegar a la pared, chocan la mitad de veces y la presión baja a la mitad.'
                         : 'Volumen a la mitad y la misma temperatura: las moléculas llegan antes a la pared, chocan el doble de veces y la presión se duplica.',
            charles: dobla ? 'Temperatura doble (en kelvin): las moléculas van más deprisa y empujan más. El globo crece hasta el doble de volumen y la presión vuelve a 1 atm.'
                           : 'Temperatura a la mitad (en kelvin): las moléculas van más despacio y empujan menos. El globo encoge hasta la mitad de volumen.',
            gayLussac: dobla ? 'Temperatura doble (en kelvin) sin cambiar el volumen: las moléculas chocan más veces y más fuerte, y la presión se duplica.'
                             : 'Temperatura a la mitad (en kelvin) sin cambiar el volumen: las moléculas chocan menos y más flojo, y la presión baja a la mitad.',
            avogadro: dobla ? 'El doble de moléculas a la misma temperatura: el globo crece hasta el doble de volumen y la presión vuelve a 1 atm.'
                            : 'La mitad de moléculas a la misma temperatura: el globo encoge hasta la mitad de volumen.',
            cero: 'A 0 K las moléculas se quedan quietas: no chocan y la presión es cero. Un gas real se habría vuelto líquido mucho antes.',
        }[c.ley];
        return { tag: i18n.t(LEYES[c.ley].nombre), col: COLS.cambio, txt: i18n.t(txt) };
    }
    if (G.T === 0) return { tag: i18n.t('CERO ABSOLUTO'), col: COLS.cambio, txt: i18n.t('A 0 K las moléculas se quedan quietas: no chocan y la presión es cero. Un gas real se habría vuelto líquido mucho antes.') };
    if (G.T < 80) return { tag: i18n.t('MUY FRÍO'), col: COLS.frio, txt: i18n.t('A {t} un gas real ya se habría vuelto líquido. Este modelo es de un gas ideal: sus moléculas no se atraen y siguen siendo gas.', { t: tempTxt(G.T) }) };
    if (G.modo === 'globo' && G.radioMedio > RADIO_MAX_GLOBO - 10 && G.presion > 1.15)
        return { tag: i18n.t('AL LÍMITE'), col: COLS.cambio, txt: i18n.t('La goma ya no puede estirarse más. Las moléculas empujan más que el aire de fuera y la presión dentro sube por encima de 1 atm.') };
    if (G.modo === 'globo') {
        const t = tendenciaDe('V');
        if (t > 0) return { tag: i18n.t('SE INFLA'), col: COLS.gas, txt: i18n.t('Dentro, las moléculas empujan más que el aire de fuera: la goma cede y el globo crece hasta que los dos empujes se igualan.') };
        if (t < 0) return { tag: i18n.t('SE DESINFLA'), col: COLS.gas, txt: i18n.t('Ahora el aire de fuera empuja más que las moléculas de dentro: el globo encoge hasta que los dos empujes se igualan.') };
        return { tag: i18n.t('EQUILIBRIO'), col: COLS.gas, txt: N === 1
            ? i18n.t('La molécula choca sin parar contra la goma. Fuera, el aire empuja igual (1 atm): por eso el globo ni crece ni encoge.')
            : i18n.t('Las <strong>{n} moléculas</strong> chocan sin parar contra la goma. Fuera, el aire empuja igual (1 atm): por eso el globo ni crece ni encoge.', { n: N }) };
    }
    const t = tendenciaDe('P');
    if (t > 0) return { tag: i18n.t('SUBE LA PRESIÓN'), col: COLS.gas, txt: i18n.t('Las moléculas chocan más veces (o más fuerte) contra las paredes y el émbolo: la presión sube.') };
    if (t < 0) return { tag: i18n.t('BAJA LA PRESIÓN'), col: COLS.gas, txt: i18n.t('Las moléculas chocan menos veces (o más flojo) contra las paredes y el émbolo: la presión baja.') };
    return { tag: i18n.t('PRESIÓN ESTABLE'), col: COLS.gas, txt: i18n.t('Las <strong>{n} moléculas</strong> chocan sin parar contra las paredes y el émbolo. Esos choques son la presión del gas.', { n: N }) };
}

// ═════════════════════════ DIBUJO ═════════════════════════════════
function drawEscena() {
    for (const t of TARJETAS) tarjeta(t);
    const p = puntoObjeto();
    if (!ESC_MOVIL) drawCono(p);
    push(); translate(OBJ.tx, OBJ.ty); scale(OBJ.s);
    if (G.modo === 'globo') drawGlobo(); else drawCilindro();
    pop();
    noFill(); stroke(THEME.accent); strokeWeight(2.5); circle(p.x, p.y, 18);
    drawModelo();
    const m = mensaje();
    drawPanelEstado(m);
    anunciar(m);
    drawGrafica();
    if (celebrando()) {
        const L = LEYES[CELEB.ley], sub = i18n.t(CELEB.x === 2 ? L.sub2 : L.subMedio);
        if (ESC_MOVIL) sello(i18n.t(L.nombre), sub, GRAPH.x + GRAPH.w - 128, GRAPH.y + 92, CELEB.t0, true);
        else sello(i18n.t(L.nombre), sub, 1072, 604, CELEB.t0, false);
    }
}

// Punto del objeto que amplía el modelo (en coordenadas del lienzo)
let ultimoPunto = { x: 0, y: 0 };
function puntoObjeto() {
    const l = G.modo === 'globo' ? geomGlobo() : { cx: 195, cy: (yEmbolo() + 284) / 2 + 8 };
    ultimoPunto = { x: OBJ.tx + OBJ.s * l.cx, y: OBJ.ty + OBJ.s * l.cy };
    return ultimoPunto;
}
function drawCono(p) {
    const { cx, cy, r } = MODELO;
    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy);
    if (d <= r) return;
    const th = Math.atan2(dy, dx), a = Math.acos(r / d);
    const c = color(THEME.accent); c.setAlpha(26);
    noStroke(); fill(c);
    triangle(p.x, p.y, cx + r * cos(th + a), cy + r * sin(th + a), cx + r * cos(th - a), cy + r * sin(th - a));
}

// ── Piezas del objeto (coordenadas del boceto) ───────────────────
function rectTinta(x, y, w, h, r, relleno, grosor) {
    stroke(tinta()); strokeWeight(grosor); fill(relleno); rect(x, y, w, h, r);
}
function tubo(puntos) {
    noFill(); strokeJoin(ROUND); strokeCap(SQUARE);
    for (const [col, w] of [[tinta(), 9], [THEME.headEdge || '#9fb9cc', 4]]) {
        stroke(col); strokeWeight(w);
        beginShape(); for (const [x, y] of puntos) vertex(x, y); endShape();
    }
}
function foco(x, y, rx, ry) {
    if (!THEME.fun) return;
    const ctx = drawingContext, g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    g.addColorStop(0, 'rgba(45,119,173,0.55)'); g.addColorStop(1, 'rgba(45,119,173,0)');
    ctx.save(); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function textoSis(txt, x, y, fs, col, alin = LEFT, peso = NORMAL) {
    textFont(FUENTE_TEXTO); textSize(fs); textStyle(peso); noStroke(); fill(col); textAlign(alin, BASELINE); text(txt, x, y);
    textStyle(NORMAL); fuenteJuego();
}
function base() {
    rectTinta(34, 292, 300, 44, 14, COL.metal1, 3.5);
    noStroke(); fill(COL.metal2); rect(34, 292, 300, 11, 5.5);
    stroke(tinta()); strokeWeight(2); fill(COL.piloto); circle(58, 319, 12);
    textoSis(i18n.t('Termostato · mantiene {t}', { t: tempTxt(G.T) }), 186, 324, 14, THEME.rotuloTermo, CENTER);
}
function manometro(mx, my, mr, P) {
    // Escala que cabe: 0–4, 0–20 o 0–100 atm
    const objetivo = P <= 3.8 ? 4 : P <= 19 ? 20 : 100;
    if (objetivo !== escalaMano) escalaMano = objetivo;
    agujaP += (Math.min(P, escalaMano * 1.03) - agujaP) * 0.08;
    stroke(tinta()); strokeWeight(3); fill('#5d7488'); circle(mx, my, 2 * (mr + 5));
    strokeWeight(2); fill(COL.esfera); circle(mx, my, 2 * mr);
    const ang = (p) => radians(-135 + 270 * p / escalaMano - 90);
    textFont(FUENTE_TEXTO); textStyle(BOLD); textSize(11); textAlign(CENTER, CENTER);
    for (let i = 0; i <= 4; i++) {
        const v = escalaMano * i / 4, a = ang(v);
        stroke(tinta()); strokeWeight(2.4);
        line(mx + cos(a) * (mr - 3), my + sin(a) * (mr - 3), mx + cos(a) * (mr - 10), my + sin(a) * (mr - 10));
        noStroke(); fill('#24323f'); text(i18n.num(v), mx + cos(a) * (mr - 19), my + sin(a) * (mr - 19));
    }
    textStyle(NORMAL); textSize(10); text('atm', mx, my + mr - 9);
    push(); translate(mx, my); rotate(ang(agujaP) + HALF_PI);
    stroke(tinta()); strokeWeight(1.5); fill(COL.aguja); triangle(-3, 0, 0, -mr + 7, 3, 0);
    pop();
    noStroke(); fill(tinta()); circle(mx, my, 9);
    fuenteJuego();
}
function lectura(x, y, w, num, uni, fs) {
    stroke(THEME.headEdge || '#9fb9cc'); strokeWeight(2); fill(THEME.headBg || '#0e2238'); rect(x, y, w, 50, 12);
    fuenteJuego(); textStyle(BOLD);
    textSize(fs); const w1 = textWidth(num); textSize(17); const w2 = textWidth(uni);
    let xx = x + w / 2 - (w1 + 5 + w2) / 2;
    noStroke(); fill(THEME.headText || '#ffffff'); textAlign(LEFT, BASELINE);
    textSize(fs); text(num, xx, y + 37); textSize(17); text(uni, xx + w1 + 5, y + 37);
    textStyle(NORMAL);
}
function pastilla(x, y, w, txt) {
    noStroke(); fill(THEME.change); rect(x, y, w, 26, 13);
    fuenteJuego(); textStyle(BOLD); textSize(15); fill('#061523'); textAlign(CENTER, CENTER); text(txt, x + w / 2, y + 13);
    textStyle(NORMAL);
}
function llave(x, y) {
    rectTinta(x - 9, y - 9, 18, 18, 4, COL.metal3, 2.5);
    rectTinta(x - 3, y - 24, 6, 16, 3, COL.metal2, 2);
    rectTinta(x - 12, y - 30, 24, 8, 4, COL.metal3, 2);
}
function sondaYCable(xS, yIni, yPunta, cable) {
    stroke(tinta()); strokeWeight(4); line(xS, yIni, xS, yPunta);
    stroke(COL.sonda); strokeWeight(1.6); line(xS, yIni, xS, yPunta);
    stroke(tinta()); strokeWeight(2); fill(COL.sonda); circle(xS, yPunta, 9);
    noFill(); strokeJoin(ROUND);
    for (const [c, w] of [[tinta(), 4], [COL.cable, 1.8]]) { stroke(c); strokeWeight(w); beginShape(); for (const [x, y] of cable) vertex(x, y); endShape(); }
}
function pastillaCambio() {
    if (!celebrando() || CELEB.ley === 'cero') return null;
    // Lo que cambia como efecto: en Boyle, la presión va al revés que el volumen
    const dobla = CELEB.ley === 'boyle' ? CELEB.x !== 2 : CELEB.x === 2;
    return i18n.t(dobla ? '¡el doble!' : '¡la mitad!');
}

// Globo: tamaño ∝ raíz cúbica del volumen (es un globo de verdad)
function geomGlobo() {
    const cx = 186, neck = 244, R0 = 58 * Math.cbrt(Math.max(0.05, volSuave || 1.2) / 1.2);
    // Por encima de unos 2,3 L crece más despacio, para no tapar los rótulos ni la lectura
    const R = R0 > 72 ? 72 + (R0 - 72) * 0.45 : R0;
    return { cx, neck, R, w: R, h: R * 1.08, cy: neck - R * 1.02 - 14 };
}
function drawGlobo() {
    const g = geomGlobo(), { cx, neck, w, h, cy } = g;
    foco(cx, cy + 20, 190, 170);
    base();
    // Boquilla de vidrio que sube de la base
    stroke(tinta()); strokeWeight(3); fill('rgba(191,227,255,0.18)'); rect(cx - 9, neck - 6, 18, 292 - neck + 6);
    stroke(255, 255, 255, 90); strokeWeight(3); line(cx - 4, neck, cx - 4, 288);
    // Tubos al manómetro y a la llave
    tubo([[cx + 9, 270], [338, 270], [338, 196 + 47]]);
    tubo([[cx - 9, 270], [96, 270]]);
    llave(118, 270);
    manometro(338, 196, 42, G.presion);
    // Globo: forma de pera, goma con brillo
    const ctx = drawingContext;
    const camino = () => {
        beginShape();
        vertex(cx, neck - 10);
        bezierVertex(cx - w * 0.35, neck - 22, cx - w * 1.02, cy + h * 0.55, cx - w, cy);
        bezierVertex(cx - w * 0.98, cy - h * 0.75, cx - w * 0.5, cy - h, cx, cy - h);
        bezierVertex(cx + w * 0.5, cy - h, cx + w * 0.98, cy - h * 0.75, cx + w, cy);
        bezierVertex(cx + w * 1.02, cy + h * 0.55, cx + w * 0.35, neck - 22, cx, neck - 10);
        endShape(CLOSE);
    };
    const bx = cx - w, by = cy - h, bw = 2 * w, bh = neck - 10 - by;
    const gr = ctx.createRadialGradient(bx + bw * 0.38, by + bh * 0.32, 0, bx + bw * 0.38, by + bh * 0.32, Math.max(bw, bh) * 0.75);
    gr.addColorStop(0, COL.latexClaro); gr.addColorStop(0.55, COL.latex); gr.addColorStop(1, COL.latexOsc);
    stroke(tinta()); strokeWeight(5); strokeJoin(ROUND); fill(COL.latex);
    ctx.save(); ctx.fillStyle = gr; camino(); ctx.restore();
    // brillos
    noStroke(); fill(255, 255, 255, 90);
    push(); translate(cx - w * 0.42, cy - h * 0.42); rotate(radians(28)); ellipse(0, 0, w * 0.32, h * 0.6); pop();
    fill(255, 255, 255, 76); ellipse(cx - w * 0.62, cy + h * 0.08, w * 0.1, h * 0.18);
    noFill(); stroke(COL.latexOsc); strokeWeight(3);
    const c = color(COL.latexOsc); c.setAlpha(150); stroke(c);
    beginShape(); vertex(cx + w * 0.62, cy + h * 0.25); quadraticVertex(cx + w * 0.8, cy - h * 0.1, cx + w * 0.66, cy - h * 0.5); endShape();
    // cuello enrollado atado a la boquilla
    stroke(tinta()); strokeWeight(3); fill(COL.latexOsc);
    beginShape(); vertex(cx - 11, neck - 12); quadraticVertex(cx, neck - 4, cx + 11, neck - 12); vertex(cx + 12, neck + 4); quadraticVertex(cx, neck + 9, cx - 12, neck + 4); endShape(CLOSE);
    noFill(); stroke(COL.latexBrillo); strokeWeight(2);
    beginShape(); vertex(cx - 12, neck - 2); quadraticVertex(cx, neck + 3, cx + 12, neck - 2); endShape();
    // Sonda del termómetro hasta el centro del globo, y su cable a la lectura
    sondaYCable(cx, 288, cy + 4, [[cx - 10, 282], [54, 282], [30, 258], [30, 120]]);
    lectura(0, 70, 104, unidadC ? String(G.T - 273) : String(G.T), unidadC ? '°C' : 'K', 34);
    textoSis(i18n.t('sonda en el gas'), 52, 136, 12, THEME.rotuloObj, CENTER);
    lectura(286, 92, 112, fmt(G.presion, 2), 'atm', 26);
    textoSis(i18n.t('globo de goma atado a la boquilla'), 0, 22, 13, THEME.rotuloObj);
    textoSis(i18n.t('fuera: aire a 1 atm'), 0, 40, 13, THEME.rotuloObj);
    const pc = pastillaCambio();
    if (pc && (CELEB.ley === 'charles' || CELEB.ley === 'avogadro')) pastilla(Math.min(cx + w * 0.55, 270), Math.max(cy - h - 6, 48), 112, pc);
}

// Cilindro de vidrio con émbolo sujeto (0–4,6 L)
const CIL = { gx: 120, gy: 58, gw: 150, gh: 226 };
function yDeVol(v) { return CIL.gy + CIL.gh - v / VOL_MAX * (CIL.gh - 14); }
function yEmbolo() {
    const objetivo = yDeVol(G.volRigido);
    if (embolo == null || MOV_REDUCIDO) embolo = objetivo; else embolo += (objetivo - embolo) * 0.12;
    return embolo;
}
function drawCilindro() {
    const { gx, gy, gw, gh } = CIL, fondo = gy + gh, yp = embolo == null ? yEmbolo() : embolo;
    foco(195, 180, 190, 170);
    base();
    const ctx = drawingContext;
    const cuerpo = () => {
        beginShape(); vertex(gx, gy); vertex(gx, fondo - 22); quadraticVertex(gx, fondo, gx + 22, fondo);
        vertex(gx + gw - 22, fondo); quadraticVertex(gx + gw, fondo, gx + gw, fondo - 22); vertex(gx + gw, gy); endShape();
    };
    // Interior: vidrio y gas (velo blanco liso: el gas real no se ve)
    noStroke(); fill(191, 227, 255, 20); rect(gx, gy, gw, gh - 2, 0, 0, 22, 22);
    fill(255, 255, 255, 41); rect(gx + 2, yp + 16, gw - 4, fondo - yp - 18, 0, 0, 20, 20);
    // Patas
    rectTinta(gx + 12, fondo, 14, 8, 0, COL.metal2, 2); rectTinta(gx + gw - 26, fondo, 14, 8, 0, COL.metal2, 2);
    // Dónde estaba el émbolo antes del momento clave
    if (celebrando() && CELEB.ley === 'boyle' && CELEB.ref) {
        noFill(); stroke(THEME.textDim); strokeWeight(2); drawingContext.setLineDash([6, 5]);
        rect(gx + 6, yDeVol(CELEB.ref.Vr / 100), gw - 12, 16, 6); drawingContext.setLineDash([]);
    }
    // Vástago, asa, tapa con guía y émbolo
    rectTinta(gx + gw / 2 - 5, yp - 64, 10, 64, 0, COL.vastago, 2.5);
    rectTinta(gx + gw / 2 - 40, yp - 76, 80, 14, 7, COL.metalClaro, 3);
    rectTinta(gx + gw / 2 - 14, gy - 26, 28, 12, 4, COL.metal2, 2.5);
    rectTinta(gx - 14, gy - 14, gw + 28, 10, 5, COL.metal2, 2.5);
    rectTinta(gx + 5, yp, gw - 10, 18, 6, COL.metal3, 3);
    stroke('#d6e4ef'); strokeWeight(3); strokeCap(ROUND); line(gx + 12, yp + 6, gx + gw - 40, yp + 6);
    // Vidrio
    noFill(); strokeJoin(ROUND); stroke(tinta()); strokeWeight(7); cuerpo(); stroke(COL.vidrio); strokeWeight(3); cuerpo();
    noStroke(); fill(255, 255, 255, 71); rect(gx + 10, gy + 10, 7, gh - 60, 3.5);
    // Graduación en litros
    textFont(FUENTE_TEXTO); textStyle(BOLD); textSize(12.5); textAlign(RIGHT, CENTER);
    for (let v = 0.5; v < VOL_MAX; v += 0.5) {
        const y = yDeVol(v) + 9, entero = Math.abs(v - Math.round(v)) < 0.01;
        stroke(THEME.grad); strokeWeight(entero ? 2.5 : 1.8); line(gx + gw - (entero ? 20 : 12), y, gx + gw - 4, y);
        if (entero && Math.abs(y - (yp + 9)) > 14) { noStroke(); fill(THEME.grad); text(`${Math.round(v)} L`, gx + gw - 24, y); }
    }
    textStyle(NORMAL); fuenteJuego();
    // Salida inferior: tubos al manómetro y a la llave
    tubo([[gx + gw / 2, fondo + 2], [gx + gw / 2, 292]]);
    tubo([[gx + gw, fondo - 14], [340, fondo - 14], [340, 206 + 47]]);
    tubo([[gx, fondo - 14], [78, fondo - 14]]);
    llave(96, fondo - 14);
    manometro(340, 206, 42, G.presion);
    // Sonda del termómetro dentro del gas
    sondaYCable(gx + 36, fondo - 2, fondo - 14, [[gx + 36, fondo + 4], [gx + 36, 282], [48, 288], [30, 270], [30, 128]]);
    lectura(0, 78, 104, unidadC ? String(G.T - 273) : String(G.T), unidadC ? '°C' : 'K', 34);
    textoSis(i18n.t('sonda en el gas'), 52, 144, 12, THEME.rotuloObj, CENTER);
    lectura(288, 104, 112, fmt(G.presion, 2), 'atm', 26);
    textoSis(i18n.t('cilindro de vidrio · émbolo sujeto'), 0, 22, 13, THEME.rotuloObj);
    stroke(tinta()); strokeWeight(1); fill(255, 255, 255, 153); rect(40, 178, 10, 10, 2);
    textoSis(i18n.t('gas: en'), 55, 187, 11.5, THEME.rotuloObj);
    textoSis(i18n.t('realidad es'), 40, 202, 11.5, THEME.rotuloObj);
    textoSis(i18n.t('invisible'), 40, 217, 11.5, THEME.rotuloObj);
    const pc = pastillaCambio();
    if (pc && (CELEB.ley === 'boyle' || CELEB.ley === 'gayLussac')) pastilla(288, 72, 112, pc);
}

// ── Modelo: todo el gas, cortado por la mitad ────────────────────
function colorRapidez(v) {
    if (!opciones.color) return color(THEME.particle);
    const f = constrain(v / 6, 0, 1);
    return THEME.fun || temaActual() === 'marca' ? lerpColor(color(COL.lenta), color(COL.rapida), f) : lerpColor(color('#00ffff'), color('#ff66ff'), f);
}
function drawModelo() {
    // Escala del modelo: el globo más grande posible (radio físico 235 más lo que
    // se abomba la goma) cabe con un anillo de aire alrededor.
    const { cx, cy, r } = MODELO, k = ESCALA_MODELO * r / 182;
    const X = (x) => cx + x * k, Y = (y) => cy + y * k;
    const rD = Math.max(G.rParticula * k, r / 40);
    noStroke(); fill(THEME.modelBg); circle(cx, cy, 2 * r);
    const ctx = drawingContext;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();

    if (G.modo === 'globo') {
        // Aire de fuera, tenue
        noStroke(); fill(THEME.aire);
        for (const p of G.aire) circle(X(p.x), Y(p.y), rD * 1.8);
        // Membrana
        const caminoMembrana = () => { beginShape(); for (const n of G.nodos) vertex(X(n.x), Y(n.y)); endShape(CLOSE); };
        const rel = color(COL.latex); rel.setAlpha(18); noStroke(); fill(rel); caminoMembrana();
        if (opciones.medio) {
            noFill(); stroke(THEME.textDim); strokeWeight(1.6); ctx.setLineDash([6, 7]);
            circle(cx, cy, 2 * G.radioMedio * k); ctx.setLineDash([]);
        }
        dibujarMoleculas(X, Y, rD, k);
        noFill(); strokeJoin(ROUND);
        stroke(tinta()); strokeWeight(ESC_MOVIL ? 6 : 7); caminoMembrana();
        stroke(COL.latex); strokeWeight(ESC_MOVIL ? 3 : 3.5); caminoMembrana();
    } else {
        const x0 = X(-RECT_W / 2), x1 = X(RECT_W / 2), bot = Y(RECT_FONDO), top = Y(RECT_FONDO - G.H);
        noStroke(); fill(THEME.interior); rect(x0, top, x1 - x0, bot - top);
        if (celebrando() && CELEB.ref && CELEB.ley === 'boyle') {
            const h0 = Y(RECT_FONDO - CELEB.ref.Vr / 100 / LITROS_POR_PX2 / RECT_W);
            stroke(THEME.textDim); strokeWeight(2); ctx.setLineDash([6, 5]); line(x0, h0, x1, h0); ctx.setLineDash([]);
            textoSis(i18n.t('antes: {v} L', { v: fmt(CELEB.ref.Vr / 100, 2) }), x0 + 8, h0 - 8, 13, THEME.textDim);
        }
        dibujarMoleculas(X, Y, rD, k);
        // Paredes de vidrio y fondo
        noFill(); strokeJoin(ROUND);
        const paredes = () => { beginShape(); vertex(x0 - 6, cy - r - 10); vertex(x0 - 6, bot + 6); vertex(x1 + 6, bot + 6); vertex(x1 + 6, cy - r - 10); endShape(); };
        stroke(tinta()); strokeWeight(11); paredes(); stroke(COL.vidrio); strokeWeight(4); paredes();
        // Émbolo y vástago
        rectTinta(cx - 6, top - 120, 12, 104, 0, COL.vastago, 2.5);
        rectTinta(x0, top - 16, x1 - x0, 16, 0, COL.metal3, 3);
    }
    // Choques contra la pared: marcas cortas sobre la pared, nunca sobre una molécula
    const ahora = millis();
    strokeCap(ROUND);
    for (const m of G.marcas) {
        const a = 1 - (ahora - m.t) / 320; if (a <= 0) continue;
        const cc = color(THEME.choque); cc.setAlpha(220 * a); stroke(cc); strokeWeight(3.5);
        const tx = -m.ny, ty = m.nx, x = X(m.x) - m.nx * 3, y = Y(m.y) - m.ny * 3;
        line(x - tx * 7, y - ty * 7, x + tx * 7, y + ty * 7);
    }
    ctx.restore();
    // Marco
    noFill();
    if (THEME.fun) { stroke(tinta()); strokeWeight(ESC_MOVIL ? 8 : 10); circle(cx, cy, 2 * r); }
    stroke(THEME.accent); strokeWeight(3); ctx.setLineDash([12, 7]); circle(cx, cy, 2 * r); ctx.setLineDash([]);
    // Rótulo del modelo y leyenda
    const fs = ESC_MOVIL ? 15.5 : 16, hR = 34, wR = ESC_MOVIL ? 330 : 352, yR = cy + r + (ESC_MOVIL ? 14 : 20);
    stroke(THEME.accent); strokeWeight(2.5); fill(THEME.pillBg || THEME.panelBg); rect(cx - wR / 2, yR, wR, hR, hR / 2);
    fuenteJuego(); textStyle(BOLD); textSize(fs); noStroke(); fill(THEME.text); textAlign(CENTER, CENTER);
    text(i18n.t(ESC_MOVIL ? 'Modelo de moléculas' : 'Modelo: así imaginamos las moléculas'), cx, yR + hR / 2 + 1);
    textStyle(NORMAL);
    drawLeyenda(ESC_MOVIL ? 26 : cx - 184, yR + hR + (ESC_MOVIL ? 32 : 28), rD);
}
function dibujarMoleculas(X, Y, rD, k) {
    const ink = tinta();
    if (opciones.estelas) {
        strokeCap(ROUND); strokeWeight(3);
        for (const p of G.particulas) {
            const v = Math.hypot(p.vx, p.vy); if (v < 0.05) continue;
            const c = colorRapidez(v); c.setAlpha(90); stroke(c);
            line(X(p.x), Y(p.y), X(p.x - p.vx * 4), Y(p.y - p.vy * 4));
        }
    }
    stroke(ink); strokeWeight(rD > 4 ? 1.6 : 1.2);
    for (const p of G.particulas) { fill(colorRapidez(Math.hypot(p.vx, p.vy))); circle(X(p.x), Y(p.y), 2 * rD); }
    if (rD >= 3.5) {
        noStroke(); fill(255, 255, 255, 140);
        for (const p of G.particulas) circle(X(p.x) - rD * 0.33, Y(p.y) - rD * 0.33, rD * 0.64);
    }
}
function drawLeyenda(x, y, rD) {
    const fs = ESC_MOVIL ? 13 : 13.5, dim = THEME.textDim;
    const bola = (bx, by, c) => { stroke(tinta()); strokeWeight(1.6); fill(c); circle(bx, by, 12); };
    bola(x + 8, y - 5, colorRapidez(3.6));
    textoSis(i18n.t('moléculas del gas'), x + 20, y, fs, THEME.text);
    if (G.modo === 'globo') {
        noStroke(); fill(THEME.aire); circle(x + 186, y - 5, 11);
        textoSis(i18n.t('aire de fuera (1 atm)'), x + 198, y, fs, THEME.text);
    } else {
        stroke(THEME.choque); strokeWeight(3.5); strokeCap(ROUND); line(x + 190, y - 12, x + 190, y + 2);
        textoSis(i18n.t('choque con la pared'), x + 202, y, fs, THEME.text);
    }
    const y2 = y + 24;
    if (opciones.color) {
        textoSis(i18n.t('color:'), x, y2, fs, dim);
        textoSis(i18n.t('lenta'), x + 48, y2, fs, dim);
        const gx = x + 90, ctx = drawingContext, g = ctx.createLinearGradient(gx, 0, gx + 70, 0);
        g.addColorStop(0, colorRapidez(0).toString()); g.addColorStop(1, colorRapidez(6).toString());
        stroke(tinta()); strokeWeight(1.5); fill(COL.lenta);
        ctx.save(); ctx.fillStyle = g; rect(gx, y2 - 11, 70, 12, 6); ctx.restore();
        textoSis(i18n.t('rápida'), x + 166, y2, fs, dim);
    }
    if (G.modo === 'globo') {
        const xc = opciones.color ? x + 238 : x;
        stroke(THEME.choque); strokeWeight(3.5); strokeCap(ROUND); line(xc, y2 - 12, xc, y2 + 2);
        textoSis(i18n.t('choque'), xc + 12, y2, fs, THEME.text);
    }
}

// ── Panel de estado ──────────────────────────────────────────────
function relacion(a, b) {
    if (!(b > 0) || !(a >= 0)) return '';
    const r = a / b;
    if (cerca(r, 2, 0.12)) return '× 2';
    if (cerca(r, 0.5, 0.12)) return '÷ 2';
    if (cerca(r, 1, 0.04)) return i18n.t('igual');
    return '';
}
function drawPanelEstado(m) {
    const { x, y, w, h, compacto } = PANEL, pad = 24;
    tarjeta({ x, y, w, h }, THEME.pillBg || THEME.panelBg, 20);
    if (m.tag !== rotuloTag) { rotuloTag = m.tag; rotuloDesde = millis(); }
    fuenteJuego();
    const th = etiquetaRotulo(m.tag, m.col, x + pad, y + 20, compacto ? 15 : 16.5, rotuloDesde).h;
    // Mensaje (hasta 4 líneas)
    const fsMsg = compacto ? 17 : 19, lead = fsMsg + 7;
    let fsUsado = fsMsg;
    textSize(fsMsg);
    let lineas = partirRico(trozosRicos(m.txt), w - 2 * pad);
    if (lineas.length > 4) { fsUsado = fsMsg - 2; textSize(fsUsado); lineas = partirRico(trozosRicos(m.txt), w - 2 * pad); }
    noStroke(); fill(THEME.text);
    const yMsg = y + 20 + th + 16;
    textoRico(lineas.slice(0, 5), x + pad, yMsg, fsUsado + 7);
    let yy = yMsg + 4 * lead + 6;
    stroke(THEME.border); strokeWeight(1.5); line(x + pad, yy, x + w - pad, yy);
    textoSis(i18n.t('Lo que miden los aparatos'), x + pad, yy + 26, 14, THEME.textDim);
    const cel = celebrando() && CELEB.ref ? CELEB.ref : null;
    const filas = [
        ['Presión', fmt(G.presion, 2) + ' atm', cel ? relacion(G.presion, cel.P) : ''],
        ['Volumen', fmt(volSuave, 2) + ' L', cel ? relacion(volSuave, cel.V) : ''],
        ['Temperatura', tempTxt(G.T), cel ? relacion(G.T, cel.T) : ''],
        ['Moléculas', String(G.N), cel ? relacion(G.N, cel.N) : ''],
    ];
    const paso = compacto ? 29 : 31;
    filas.forEach(([n, v, d], i) => {
        const fy = yy + 56 + i * paso;
        textoSis(i18n.t(n), x + pad, fy, compacto ? 15.5 : 16.5, THEME.text);
        fuenteJuego(); textStyle(BOLD); textSize(compacto ? 18 : 20); noStroke(); fill(THEME.title || THEME.text); textAlign(RIGHT, BASELINE);
        text(v, x + w - (cel ? 96 : pad), fy);
        if (d) { textSize(15); fill(d === i18n.t('igual') ? THEME.textDim : THEME.change); text(d, x + w - pad, fy); }
        textStyle(NORMAL);
    });
    yy += 56 + 4 * paso - 8;
    stroke(THEME.border); strokeWeight(1.5); line(x + pad, yy, x + w - pad, yy);
    const fsD = compacto ? 14.5 : 15.5;
    textFont(FUENTE_TEXTO); textSize(fsD); noStroke(); fill(THEME.text);
    textoRico(partirRico(trozosRicos(i18n.t('Choques contra la pared: <strong>{c}</strong> cada segundo', { c: G.choquesSeg })), w - 2 * pad), x + pad, yy + 12, fsD + 6);
    const V = volSuave, P = G.presion, T = G.T;
    const ley = G.modo === 'globo'
        ? i18n.t('V ÷ T = <strong>{a} L/K</strong> (a 1 atm)', { a: T > 0 ? fmt(V / T, 4) : '—' })
        : i18n.t('P × V = <strong>{a} atm·L</strong> · P ÷ T = <strong>{b}</strong>', { a: fmt(P * V, 2), b: T > 0 ? fmt(P / T, 4) : '—' });
    fill(cel && CELEB.ley === 'boyle' ? THEME.change : THEME.text);
    textoRico(partirRico(trozosRicos(ley), w - 2 * pad), x + pad, yy + 38, fsD + 6);
    fill(THEME.textDim); textSize(compacto ? 13 : 14);
    textoRico(partirRico(trozosRicos(i18n.t('En total: {t} choques', { t: G.totalChoques.toLocaleString(i18n.lang === 'en' ? 'en' : 'es') })), w - 2 * pad), x + pad, yy + 64, 18);
    fuenteJuego();
}

// ── Gráfica en papel ─────────────────────────────────────────────
function registrarGrafica() {
    if (G.pausa) return;
    if (!medidaLista()) { tGrafica = millis(); return; }   // aún no hay ningún segundo de choques medido
    acumulado.p += G.presion; acumulado.v += volSuave; acumulado.n++;
    if (millis() - tGrafica < 3000) return;
    if (acumulado.n) {
        historial.push({ p: acumulado.p / acumulado.n, v: acumulado.v / acumulado.n, T: G.T, t: millis() });
        if (historial.length > 35) historial.shift();
    }
    acumulado = { p: 0, v: 0, n: 0 }; tGrafica = millis();
}
function borrarGrafica() { historial = []; acumulado = { p: 0, v: 0, n: 0 }; tGrafica = millis(); }

function drawGrafica() {
    const g = GRAPH, mv = ESC_MOVIL;
    if (THEME.fun) { noStroke(); fill(tinta()); rect(g.x + 4, g.y + 5, g.w - 4, g.h - 5, 16); }
    stroke(THEME.fun ? tinta() : THEME.border); strokeWeight(THEME.fun ? 3 : 1.5); fill(THEME.paper);
    rect(g.x + 1, g.y + 1, g.w - 5, g.h - 7, 16);
    const ink = THEME.paperInk, dim = THEME.fun ? '#3d5568' : THEME.paperInk;
    if (!mv) { textoSis(i18n.t('Un punto cada 3 s'), g.x + 16, g.y + 72, 12.5, dim); textoSis(i18n.t('(media de los choques)'), g.x + 16, g.y + 90, 12.5, dim); }
    const x0 = mv ? g.x + 48 : g.x + 272, x1 = g.x + g.w - (mv ? 18 : 80), y0 = mv ? g.y + 74 : g.y + 16, y1 = g.y + g.h - (mv ? 36 : 30);
    stroke(THEME.paperGrid); strokeWeight(1);
    for (let i = 0; i <= 10; i++) { const xx = x0 + (x1 - x0) * i / 10; line(xx, y0, xx, y1); }
    for (let j = 0; j <= 4; j++) { const yy = y0 + (y1 - y0) * j / 4; line(x0, yy, x1, yy); }
    stroke(ink); strokeWeight(2.5); noFill(); beginShape(); vertex(x0, y0 - 4); vertex(x0, y1); vertex(x1 + 6, y1); endShape();

    // Ejes según la elección: X y Y con sus máximos
    const pMax = Math.max(2, ...historial.map(h => Math.ceil(h.p * 1.2)), Math.ceil(G.presion * 1.1));
    const vMax = Math.max(2.5, ...historial.map(h => Math.ceil(h.v * 1.15 * 2) / 2));
    const E = {
        pv: { fx: (h) => h.v, fy: (h) => h.p, xM: Math.max(volSuave || 0, ...historial.map(h => h.v)) <= 4.9 ? 5 : 10, yM: pMax, xL: 'V (L)', yL: 'P (atm)' },
        vt: { fx: (h) => h.T, fy: (h) => h.v, xM: 500, yM: vMax, xL: 'T (K)', yL: 'V (L)' },
        pt: { fx: (h) => h.T, fy: (h) => h.p, xM: 500, yM: pMax, xL: 'T (K)', yL: 'P (atm)' },
    }[ejes];
    const X = (v) => x0 + (x1 - x0) * constrain(v / E.xM, 0, 1.02), Y = (v) => y1 - (y1 - y0) * constrain(v / E.yM, 0, 1.05);
    textFont(FUENTE_TEXTO); textSize(12.5); noStroke(); fill(ink);
    textAlign(RIGHT, CENTER); text(i18n.num(E.yM), x0 - 8, y0); text('0', x0 - 8, y1);
    textAlign(CENTER, TOP);
    const pasos = mv ? 5 : 10;
    for (let i = 1; i <= pasos; i++) { const v = E.xM * i / pasos; if (mv && i === pasos) continue; text(i18n.num(Math.round(v * 10) / 10), x0 + (x1 - x0) * i / pasos, y1 + 4); }
    text('0', x0, y1 + 4);
    textStyle(BOLD); textSize(13.5);
    textAlign(LEFT, TOP); text(E.yL, x0 + 8, y0 + 2);
    textAlign(mv ? RIGHT : LEFT, mv ? BOTTOM : CENTER); text(E.xL, mv ? x1 : x1 + 14, mv ? y1 - 4 : y1);
    textStyle(NORMAL);

    // Sin puntos todavía: la plumilla espera en el estado actual (si ya se puede medir)
    const sinPuntos = historial.length === 0;
    if (sinPuntos && !(medidaLista() || ejes === 'vt')) { fuenteJuego(); return; }
    // Tramo del momento clave, iluminado
    const cel = celebrando() && CELEB.ref ? historial.filter(h => h.t >= CELEB.ref.t - 3500) : [];
    strokeJoin(ROUND); strokeCap(ROUND); noFill();
    if (cel.length > 1) {
        const c = color(THEME.change); c.setAlpha(140); stroke(c); strokeWeight(16);
        beginShape(); for (const h of cel) vertex(X(E.fx(h)), Y(E.fy(h))); endShape();
    }
    stroke(THEME.fun ? THEME.gas : THEME.paperGas); strokeWeight(3);
    beginShape(); for (const h of historial) vertex(X(E.fx(h)), Y(E.fy(h))); endShape();
    stroke(THEME.paperLine || ink); strokeWeight(2); fill(THEME.fun ? THEME.gas : THEME.paperGas);
    for (const h of historial) circle(X(E.fx(h)), Y(E.fy(h)), 10);
    const u = sinPuntos ? { p: G.presion, v: volSuave, T: G.T } : historial[historial.length - 1], px = X(E.fx(u)), py = Y(E.fy(u));
    stroke(THEME.paperLine || ink); strokeWeight(1.5); drawingContext.setLineDash([4, 4]);
    line(px, py, x0, py); line(px, py, px, y1); drawingContext.setLineDash([]);
    if (cel.length > 1) { noFill(); stroke(THEME.change); strokeWeight(3); circle(px, py, 26); chispa(px + 18, py - 10, 7); }
    // Plumilla
    stroke(THEME.paperLine || ink); strokeWeight(2); fill(THEME.pen || '#c0392b');
    push(); translate(px, py); rotate(radians(28)); triangle(0, 0, -6, -30, 6, -30); pop();
    if (historial.length < 3 && !mv) textoSis(i18n.t(G.modo === 'globo' ? 'Cambia la temperatura y mira qué dibuja la plumilla' : 'Mueve el émbolo y mira qué dibuja la plumilla'), Math.min(px + 40, x1 - 380), y1 - 12, 13.5, dim);
    fuenteJuego();
}

// ═════════════════════ MANDOS Y ARRANQUE ══════════════════════════
const $ = (id) => document.getElementById(id);
function pintarRelleno(sl) {
    const pct = ((sl.value - sl.min) / (sl.max - sl.min) * 100).toFixed(1) + '%';
    sl.style.setProperty('--fill', pct);
}
function mostrarValores() {
    const sT = $('sl-temp'), sN = $('sl-mol'), sV = $('sl-vol');
    if (document.activeElement !== $('num-temp')) $('num-temp').value = unidadC ? G.T - 273 : G.T;
    $('uni-temp').textContent = unidadC ? '°C' : 'K';
    $('min-temp').textContent = unidadC ? '−273 °C' : '0 K';
    $('max-temp').textContent = unidadC ? '227 °C' : '500 K';
    if (document.activeElement !== $('num-mol')) $('num-mol').value = G.N;
    if (document.activeElement !== $('num-vol')) $('num-vol').value = fmt(G.volRigido, 2);
    sT.value = G.T; sN.value = G.N; sV.value = Math.round(G.volRigido * 100);
    sT.setAttribute('aria-valuetext', tempTxt(G.T));
    sV.setAttribute('aria-valuetext', fmt(G.volRigido, 2) + ' L');
    [sT, sN, sV].forEach(pintarRelleno);
    document.querySelectorAll('[data-unidad]').forEach(b => b.setAttribute('aria-checked', String((b.dataset.unidad === 'C') === unidadC)));
}
function frase() {
    const f = G.modo === 'globo'
        ? ['El globo crece o encoge hasta que dentro y fuera empujen igual.', '¿Qué pasa si sube la temperatura?']
        : ['El volumen solo cambia si mueves el émbolo.', '¿Qué pasa con la presión si lo empujas?'];
    $('frase').innerHTML = `<strong>${i18n.t(f[0])}</strong> <em class="curiosidad">${i18n.t(f[1])}</em>`;
}
function elegirEjes(e, porDocente) {
    ejes = e; if (porDocente) ejesElegidos = true;
    document.querySelectorAll('[data-ejes]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.ejes === e)));
}
function elegirModo(m) {
    if (m !== G.modo) {
        cambiarModo(m);
        borrarGrafica(); REF = null; CELEB = null; tCambio = relojSim(); embolo = null; volSuave = G.area * LITROS_POR_PX2;
    }
    document.body.classList.toggle('modo-globo', m === 'globo');
    document.body.classList.toggle('modo-rigido', m === 'rigido');
    document.querySelectorAll('[data-modo]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.modo === m)));
    if (!ejesElegidos) elegirEjes(m === 'globo' ? 'vt' : 'pv');
    frase(); mostrarValores();
    if (typeof CV_W !== 'undefined' && ESC_MOVIL != null) rehacerComposicion();
    if (typeof pintarRetos === 'function') pintarRetos();
}
function reiniciar() {
    reiniciarFisica(273, 50);
    volSuave = G.area * LITROS_POR_PX2; embolo = null;
    borrarGrafica(); REF = null; CELEB = null; tCambio = relojSim();
    if (G.pausa) alternarPausa();
    mostrarValores();
}
function alternarPausa() {
    pausar(!G.pausa);
    const b = $('btn-pausa');
    b.querySelector('.btn-txt').textContent = i18n.t(G.pausa ? '▶ Reanudar' : '⏸ Pausar');
    b.setAttribute('aria-pressed', String(G.pausa));
    b.classList.toggle('active', G.pausa);
}
function leerNumero(txt) { return parseFloat(String(txt).replace(',', '.').replace('−', '-')); }

function setupControles() {
    const sT = $('sl-temp'), sN = $('sl-mol'), sV = $('sl-vol');
    sT.addEventListener('input', () => { fijarTemperatura(+sT.value); notificarCambio('T'); mostrarValores(); });
    sN.addEventListener('input', () => { fijarMoleculas(+sN.value); notificarCambio('N'); mostrarValores(); });
    sV.addEventListener('input', () => { fijarVolumenRigido(+sV.value / 100); notificarCambio('V'); mostrarValores(); });
    const numero = (id, aplicar) => {
        const el = $(id);
        const hecho = () => { const v = leerNumero(el.value); if (isFinite(v)) aplicar(v); mostrarValores(); };
        el.addEventListener('change', hecho);
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { hecho(); el.blur(); } });
    };
    numero('num-temp', (v) => { fijarTemperatura(unidadC ? v + 273 : v); notificarCambio('T'); });
    numero('num-mol', (v) => { fijarMoleculas(v); notificarCambio('N'); });
    numero('num-vol', (v) => { fijarVolumenRigido(v); notificarCambio('V'); });
    document.querySelectorAll('[data-unidad]').forEach(b => b.addEventListener('click', () => { unidadC = b.dataset.unidad === 'C'; mostrarValores(); }));
    document.querySelectorAll('[data-modo]').forEach(b => b.addEventListener('click', () => elegirModo(b.dataset.modo)));
    document.querySelectorAll('[data-ejes]').forEach(b => b.addEventListener('click', () => elegirEjes(b.dataset.ejes, true)));
    $('btn-pausa').addEventListener('click', alternarPausa);
    $('btn-reiniciar').addEventListener('click', reiniciar);
    // Ajustes de vista (⚙)
    $('check-color').addEventListener('change', (e) => { opciones.color = e.target.checked; });
    $('check-estelas').addEventListener('change', (e) => { opciones.estelas = e.target.checked; });
    $('check-medio').addEventListener('change', (e) => { opciones.medio = e.target.checked; });
    const sTam = $('sl-tam');
    sTam.addEventListener('input', () => { G.rParticula = +sTam.value; $('val-tam').textContent = sTam.value; pintarRelleno(sTam); });
    pintarRelleno(sTam);
    $('check-pantalla').addEventListener('change', (e) => {
        try {
            if (e.target.checked && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
            else if (!e.target.checked && document.fullscreenElement) document.exitFullscreen();
        } catch (err) { /* nada */ }
    });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) $('check-pantalla').checked = false; setTimeout(fitCanvas, 100); });
    // El tema elegido se recuerda en este navegador
    document.querySelectorAll('.theme-opt').forEach(b => b.addEventListener('click', () => { try { localStorage.setItem('sim-gases-tema', b.dataset.theme); } catch (e) { /* nada */ } }));
    const t = temaActual(), clave = { pizarra: 'dark', dia: 'light', marca: 'marca', contraste: 'contrast' }[t];
    document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.theme === clave));
    // En los grupos de opciones, las flechas pasan a la opción vecina (como en un grupo de radio)
    document.querySelectorAll('.carril[role="radiogroup"]').forEach(grupo => {
        grupo.addEventListener('keydown', (e) => {
            const paso = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
            if (!paso) return;
            e.preventDefault();
            const btns = [...grupo.querySelectorAll('button')];
            const sig = btns[(btns.indexOf(document.activeElement) + paso + btns.length) % btns.length];
            sig.focus(); sig.click();
        });
    });
    // Atajos: barra espaciadora (pausa) y R (reiniciar). No actúan con el foco en un control.
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.target.closest('button, input, select, textarea, summary, a')) return;
        if (e.key === ' ') { e.preventDefault(); alternarPausa(); }
        else if (e.key === 'r' || e.key === 'R') reiniciar();
    });
    iniciarPopover('btn-ayuda', 'panel-ayuda');
    window.addEventListener('load', fitCanvas);
    if (document.fonts) document.fonts.ready.then(fitCanvas);
    new ResizeObserver(fitCanvas).observe(document.querySelector('.barra-sus'));
}

function setup() {
    calcularEscena();
    const cv = createCanvas(CV_W, CV_H);
    pixelDensity(Math.min(3, Math.max(2, displayDensity())));
    cv.parent('canvas-container');
    cv.elt.setAttribute('role', 'img');
    cv.elt.setAttribute('aria-label', i18n.t('Simulación de la presión de un gas: el recipiente con su manómetro, el modelo de moléculas y la gráfica. Los mensajes de la simulación se leen en voz alta.'));
    frameRate(60);
    if (document.fonts) document.fonts.load('600 12px Fredoka');
    iniciarFisica();
    volSuave = G.area * LITROS_POR_PX2;
    iniciarSelectorTema();
    setupControles();
    elegirModo('globo');
    tGrafica = millis(); tCambio = relojSim();

    // Ajustes de la dirección (fichas del alumnado): ver js/parametros.js.
    // Temperatura en K; «volumen» en L (solo con el recipiente rígido).
    aplicarParametrosUrl({
        tema:        (v) => { const t = { simulaciencia: 'marca', marca: 'marca', claro: 'light', oscuro: 'dark', contraste: 'contrast' }[v];
                              const b = t && document.querySelector(`.theme-opt[data-theme="${t}"]`); if (b) b.click(); },
        recipiente:  (v) => { const m = { rigido: 'rigido', 'rígido': 'rigido', fija: 'rigido', globo: 'globo', flexible: 'globo' }[v]; if (m) elegirModo(m); },
        particulas:  urlParam.range('sl-mol'),
        moleculas:   urlParam.range('sl-mol'),
        temperatura: urlParam.range('sl-temp'),
        volumen:     (v) => { if (G.modo === 'rigido') urlParam.range('sl-vol', 100)(v); },
        // grafica=pv|vt|pt; grafica=1 (fichas antiguas: la única gráfica era la P–V)
        grafica:     (v) => { const e = ['1', 'si', 'sí', 'true'].includes(v) ? 'pv' : v; if (['pv', 'vt', 'pt'].includes(e)) elegirEjes(e, true); },
        retos:       (v) => { if (['1', 'si', 'sí', 'true'].includes(v)) abrirRetos(); },
    });
    tCambio = relojSim(); REF = null;
    fitCanvas();
}

function draw() {
    actualizarTema(TEMA_PROPIO);
    clear();
    fuenteJuego();
    pasoFisica();
    if (volSuave == null) volSuave = G.volumen;
    if (!G.pausa) volSuave += (G.volumen - volSuave) * (MOV_REDUCIDO ? 1 : 0.05);
    if (frameCount % 15 === 0 && !G.pausa && medidaLista()) {
        tendencia.push({ V: volSuave, P: G.presion, t: millis() });
        while (tendencia.length && millis() - tendencia[0].t > 1600) tendencia.shift();
    }
    registrarGrafica();
    comprobarLeyes();
    if (G.modo === 'rigido') yEmbolo();
    drawEscena();
}
