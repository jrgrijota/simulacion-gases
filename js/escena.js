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
//  (/capturas/escena-gases/boceto.html, 400 · 340) y se coloca con OBJ.
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
    colocarSobreLienzo($('btn-globo-nuevo'), { x: MODELO.cx - 110, y: MODELO.cy - 24, w: 220 }, CV_W, CV_H);
}
function ajustarEscena(cv) { encajarEscena(cv, CV_W, CV_H, ESC_MOVIL); }
function fitCanvas() {
    const cv = document.querySelector('#canvas-container canvas');
    if (!cv) return;
    ajustarEscena(cv);
    // Resolución del lienzo: la que se ve en pantalla, ni más ni menos (entre 1 y 2).
    // Antes era siempre 2 o más: en una pantalla normal se pintaban 4 veces los píxeles necesarios.
    const d = densidadAdecuada(cv);
    if (Math.abs(d - pixelDensity()) > 0.01) { pixelDensity(d); ajustarEscena(cv); }
}
let topeDensidad = 2;           // baja sola si el ordenador no llega a unos 40 fotogramas por segundo
function densidadAdecuada(cv) {
    const visto = cv.getBoundingClientRect().width / CV_W * displayDensity();
    return constrain(Math.ceil(visto * 4) / 4, 1, topeDensidad);
}
// Cada 3 s: si van menos de 40 fps, se baja la resolución un escalón (hasta 1)
let fpsMarca = { t: 0, f: 0 };
function vigilarRendimiento() {
    const ahora = performance.now();
    if (!fpsMarca.t) { fpsMarca = { t: ahora, f: frameCount }; return; }
    if (ahora - fpsMarca.t < 3000) return;
    if (ahora - fpsMarca.t > 4500) { fpsMarca = { t: ahora, f: frameCount }; return; }   // pestaña oculta o lienzo fuera de la vista: no cuenta
    const fps = (frameCount - fpsMarca.f) * 1000 / (ahora - fpsMarca.t);
    fpsMarca = { t: ahora, f: frameCount };
    if (document.hidden || fps >= 40 || pixelDensity() <= 1) return;
    topeDensidad = Math.max(1, pixelDensity() - 0.25);
    fitCanvas();
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
// El volumen del globo tiembla (pocas moléculas): para las leyes se usa una
// media más larga (~3 s) y se espera algo más
const ESPERA_GLOBO = 7000;
let volLey = null;

// Reloj de la simulación en ms (por pasos): la espera no depende de los fps
function relojSim() { return G.pasos * 1000 / 60; }
function controles() { return { modo: G.modo, T: G.T, N: G.N, Vr: Math.round(G.volRigido * 100) }; }
function notificarCambio(variable) {
    const c = controles();
    const mismoGrupo = REF && REF.var === variable && REF.modo === c.modo &&
        (variable === 'T' || REF.T === c.T) && (variable === 'N' || REF.N === c.N) && (variable === 'V' || REF.Vr === c.Vr);
    if (!mismoGrupo) REF = fotoEstable && fotoEstable.modo === c.modo ? Object.assign({}, fotoEstable, { var: variable, hecho: false }) : null;
    tCambio = relojSim(); tMando = tCambio;
    tendencia = [];             // lo de antes de mover el mando no cuenta
}
function cerca(x, objetivo, tol) { return Math.abs(x / objetivo - 1) <= tol; }

function comprobarLeyes() {
    const ahora = relojSim();
    if (G.pausa) return;
    if (ahora - tCambio < (G.modo === 'globo' ? ESPERA_GLOBO : ESPERA)) return;
    const c = controles();
    fotoEstable = Object.assign(c, { P: G.presion, V: volLey, t: ahora });

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
    const rP = G.presion / REF.P, rV = volLey / REF.V;
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
// Con pocas moléculas el globo tiembla solo (los choques no son regulares).
// Para no confundir ese temblor con «se infla / se desinfla»:
//  · solo se mira si sube o baja después de mover un mando (12 s como mucho);
//  · tiene que cambiar más de un 4 % en 2 s;
//  · en cuanto deja de cambiar, queda en equilibrio hasta que se mueva otro mando;
//  · un mensaje se queda al menos 2 s antes de cambiar a otro.
const TENDENCIA_TRAS_CAMBIO = 12000, TENDENCIA_UMBRAL = 0.04, TENDENCIA_MINIMO = 2000;
let tMando = -1e9;              // última vez que se movió un mando (no cuenta reiniciar)
let tendMostrada = { clave: null, v: 0, t: -1e9, mando: -1e9, cambio: 0, quieto: false };
function tendenciaDe(clave) {
    if (tendencia.length < 2) return 0;
    const a = tendencia[0][clave], b = tendencia[tendencia.length - 1][clave];
    if (!(a > 0.01)) return 0;
    const r = b / a - 1;
    return r > TENDENCIA_UMBRAL ? 1 : r < -TENDENCIA_UMBRAL ? -1 : 0;
}
function tendenciaMostrada(clave) {
    const ahora = relojSim(), m = tendMostrada;
    if (m.clave !== clave || m.mando !== tMando) Object.assign(m, { clave, mando: tMando, cambio: 0, quieto: false, t: -1e9 });
    const desde = ahora - tMando;
    let v = 0;
    if (!m.quieto && desde < TENDENCIA_TRAS_CAMBIO) {
        v = tendenciaDe(clave);
        // Si iba en un sentido y ahora va en el otro, es el temblor de después
        // de llegar: ya está en equilibrio
        if (v && m.cambio && v !== m.cambio) { v = 0; m.quieto = true; }
        else if (v) m.cambio = v;
        // Ya ha llegado (o el mando no cambió nada que se note): equilibrio
        else if (desde > 1500 && (m.cambio || desde > 4000)) m.quieto = true;
    }
    if (v !== m.v && ahora - m.t >= TENDENCIA_MINIMO) { m.v = v; m.t = ahora; }
    return m.v;
}
function mensaje() {
    const COLS = { gas: THEME.gas, cambio: THEME.change, frio: THEME.cold, dim: THEME.textDim };
    const N = G.N;
    if (ESTALLIDO) return { tag: i18n.t('¡HA EXPLOTADO!'), col: THEME.hot || COLS.cambio, txt: i18n.t('Dentro había más de {p} atm y la goma no aguantó: se rompió y las moléculas salieron al aire. El manómetro marca ya la presión del aire.', { p: P_ROTURA }) };
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
    if (N === 0) return { tag: i18n.t('VACÍO'), col: COLS.cambio, txt: G.modo === 'globo'
        ? i18n.t('Dentro no queda ninguna molécula: nada empuja la goma desde dentro y el aire de fuera aplasta el globo. Dentro hay vacío.')
        : i18n.t('Dentro no queda ninguna molécula: nadie choca contra las paredes y la presión es cero. Dentro hay vacío.') };
    if (G.T === 0 && G.modo === 'globo') return { tag: i18n.t('CERO ABSOLUTO'), col: COLS.cambio, txt: i18n.t('A 0 K las moléculas se quedan quietas: no empujan la goma y el aire de fuera aplasta el globo contra ellas. Un gas real se habría vuelto líquido mucho antes.') };
    if (G.T === 0) return { tag: i18n.t('CERO ABSOLUTO'), col: COLS.cambio, txt: i18n.t('A 0 K las moléculas se quedan quietas: no chocan y la presión es cero. Un gas real se habría vuelto líquido mucho antes.') };
    if (G.T < 80) return { tag: i18n.t('MUY FRÍO'), col: COLS.frio, txt: i18n.t('A {t} un gas real ya se habría vuelto líquido. Este modelo es de un gas ideal: sus moléculas no se atraen y siguen siendo gas.', { t: tempTxt(G.T) }) };
    if (gomaTirante() && !alLimite())
        return { tag: i18n.t('LA GOMA TIRA'), col: COLS.gas, txt: i18n.t('La goma, muy estirada, tira hacia dentro (flechas). Contra el gas empujan el aire y la goma: por eso dentro hay más presión que fuera.') };
    if (alLimite())
        return { tag: i18n.t('AL LÍMITE'), col: COLS.cambio, txt: i18n.t('La goma tira con mucha fuerza hacia dentro y está a punto de romperse. Aguanta hasta {p} atm dentro: si la presión sigue subiendo, el globo explotará.', { p: P_ROTURA }) };
    if (G.modo === 'globo') {
        const t = tendenciaMostrada('V');
        if (t > 0) return { tag: i18n.t('SE INFLA'), col: COLS.gas, txt: i18n.t('Dentro, las moléculas empujan más que el aire de fuera: la goma cede y el globo crece hasta que los dos empujes se igualan.') };
        if (t < 0) return { tag: i18n.t('SE DESINFLA'), col: COLS.gas, txt: i18n.t('Ahora el aire de fuera empuja más que las moléculas de dentro: el globo encoge hasta que los dos empujes se igualan.') };
        return { tag: i18n.t('EQUILIBRIO'), col: COLS.gas, txt: N === 1
            ? i18n.t('La molécula choca sin parar contra la goma. Fuera, el aire empuja igual (1 atm): por eso el globo ni crece ni encoge. Con tan pocas moléculas la goma tiembla; en un globo real no se nota.')
            : i18n.t('Las <strong>{n} moléculas</strong> chocan sin parar contra la goma. Fuera, el aire empuja igual (1 atm): por eso el globo ni crece ni encoge. Con tan pocas moléculas la goma tiembla; en un globo real no se nota.', { n: N }) };
    }
    const t = tendenciaMostrada('P');
    if (t > 0) return { tag: i18n.t('SUBE LA PRESIÓN'), col: COLS.gas, txt: i18n.t('Las moléculas chocan más veces (o más fuerte) contra las paredes y el émbolo: la presión sube.') };
    if (t < 0) return { tag: i18n.t('BAJA LA PRESIÓN'), col: COLS.gas, txt: i18n.t('Las moléculas chocan menos veces (o más flojo) contra las paredes y el émbolo: la presión baja.') };
    return { tag: i18n.t('PRESIÓN ESTABLE'), col: COLS.gas, txt: i18n.t('Las <strong>{n} moléculas</strong> chocan sin parar contra las paredes y el émbolo. Esos choques son la presión del gas.', { n: N }) };
}

// ═════════════════════════ DIBUJO ═════════════════════════════════
// La goma estirada tira hacia dentro: flechas sobre la goma, más largas
// cuanto mayor es la diferencia de presión que sostiene
function flechasGoma(X, Y, k) {
    // Discretas (finas, semitransparentes) y nacen en la goma hacia dentro: es la
    // propia goma la que tira hacia el centro
    const f = constrain((G.presion - 1) / (P_ROTURA - 1), 0.15, 1);
    const largo = (8 + 12 * f) / k, n = 6;
    const c = color(COL.latex); c.setAlpha(150);
    stroke(c); strokeWeight(2); strokeCap(ROUND);
    for (let q = 0; q < n; q++) {
        const a = (q + 0.5) / n * TWO_PI, i = Math.floor(a / TWO_PI * G.nodos.length) % G.nodos.length;
        const r = Math.hypot(G.nodos[i].x, G.nodos[i].y), ux = cos(a), uy = sin(a);
        const x0 = X(ux * (r - 4 / k)), y0 = Y(uy * (r - 4 / k));
        const x1 = X(ux * (r - 4 / k - largo)), y1 = Y(uy * (r - 4 / k - largo));
        line(x0, y0, x1, y1);
        const px = -uy, py = ux, h = 5;
        line(x1, y1, x1 + ux * h + px * h * 0.7, y1 + uy * h + py * h * 0.7);
        line(x1, y1, x1 + ux * h - px * h * 0.7, y1 + uy * h - py * h * 0.7);
    }
}

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
    // Con el globo, zona roja desde la presión que rompe la goma
    if (G.modo === 'globo' && P_ROTURA < escalaMano) {
        noFill(); stroke('#e0413a'); strokeWeight(5); strokeCap(SQUARE);
        arc(mx, my, 2 * (mr - 6), 2 * (mr - 6), ang(P_ROTURA), ang(escalaMano));
        strokeCap(ROUND);
    }
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
    const cx = 186, neck = 244, R0 = 58 * Math.cbrt(Math.max(0.002, volSuave || 1.2) / 1.2);
    // Por encima de unos 2,3 L crece más despacio, para no tapar los rótulos ni la lectura
    const R = R0 > 72 ? 72 + (R0 - 72) * 0.45 : R0;
    return { cx, neck, R, w: R, h: R * 1.08, cy: neck - R * 1.02 - 14 };
}
// ── El globo explota ─────────────────────────────────────────────
// Primero «AL LÍMITE»: la goma no da más de sí y la presión sube. Si dentro
// se pasa de P_ROTURA durante 4 s seguidos, la goma se rompe.
const P_ROTURA = 3;             // atm que aguanta la goma
let ESTALLIDO = null, tSobrePresion = null;
// Goma estirada del todo: ya no crece y es la goma la que sujeta el gas
// (con margen para entrar y salir, para que no parpadee con el temblor)
let gomaEstirada = false;
function gomaTirante() {
    if (G.modo !== 'globo') gomaEstirada = false;
    else if (G.radioMedio > RADIO_MAX_GLOBO - 10 && G.presion > 1.2) gomaEstirada = true;
    else if (G.radioMedio < RADIO_MAX_GLOBO - 20 || G.presion < 1.08) gomaEstirada = false;
    return gomaEstirada;
}
// «AL LÍMITE» solo cerca de reventar
// (con margen: una vez avisado, sigue hasta bajar de 2,65, para que no parpadee)
const P_AVISO = 2.8;
let avisoLimite = false;
function alLimite() {
    if (!gomaTirante()) avisoLimite = false;
    else if (G.presion > P_AVISO) avisoLimite = true;
    else if (G.presion < P_AVISO - 0.15) avisoLimite = false;
    return avisoLimite;
}
function vigilarRotura() {
    if (ESTALLIDO || G.pausa) return;
    if (gomaTirante() && G.presion > P_ROTURA) {
        if (tSobrePresion == null) tSobrePresion = relojSim();
        // 4 s seguidos: más que la media de 3 s de la presión, para que un cambio brusco
        // de los mandos (el globo aún creciendo) no lo rompa antes de tiempo
        if (relojSim() - tSobrePresion > 4000) estallar();
    } else tSobrePresion = null;
}
function estallar() {
    const g = geomGlobo();
    // Trozos de goma que salen volando (objeto) y trozos de la membrana (modelo)
    const trozos = [];
    for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.62 + random(-0.2, 0.2);
        trozos.push({ a, v: random(2.2, 3.6), giro: random(-0.25, 0.25), tam: random(9, 16) });
    }
    const nodos = G.nodos.map(n => ({ x: n.x, y: n.y }));
    ESTALLIDO = { t0: millis(), g, trozos, nodos };
    tSobrePresion = null; CELEB = null; REF = null; G.marcas = [];
    document.body.classList.add('estallado');
    document.querySelectorAll('.mandos-gas input').forEach(el => { el.disabled = true; });
    const b = $('btn-globo-nuevo'); if (b) { b.hidden = false; setTimeout(() => b.focus({ preventScroll: true }), 1200); }
}
function globoNuevo() {
    reiniciar(G.T > 0 ? G.T : 273);
}
function quitarEstallido() {
    ESTALLIDO = null; tSobrePresion = null;
    document.body.classList.remove('estallado');
    document.querySelectorAll('.mandos-gas input').forEach(el => { el.disabled = false; });
    const b = $('btn-globo-nuevo'); if (b) b.hidden = true;
}
// Tras la rotura: las moléculas siguen en línea recta y salen al aire
function pasoEstallido() {
    if (G.pausa) return;
    G.pasos++;
    for (const p of G.particulas) { p.x += p.vx; p.y += p.vy; }
    // El aire de fuera sigue ahí: rebota en el borde de la ventana del modelo
    for (const p of G.aire) {
        p.x += p.vx; p.y += p.vy;
        const d = Math.hypot(p.x, p.y);
        if (d > R_VENTANA_FIS) {
            const nx = p.x / d, ny = p.y / d, vn = p.vx * nx + p.vy * ny;
            if (vn > 0) { p.vx -= 2 * vn * nx; p.vy -= 2 * vn * ny; }
        }
    }
}
// Lo que queda en la boquilla y los trozos que vuelan
function drawRestosGlobo(g) {
    const { cx, neck, cy, w } = g, t = (millis() - ESTALLIDO.t0) / 1000;
    // Destello de la rotura (líneas, sin texto)
    if (t < 0.5 && !MOV_REDUCIDO) {
        const a = 1 - t / 0.5, c = color(THEME.change); c.setAlpha(255 * a); stroke(c); strokeWeight(4);
        for (let i = 0; i < 12; i++) {
            const an = i * Math.PI / 6, r0 = w * (0.5 + t), r1 = w * (0.9 + 1.4 * t);
            line(cx + cos(an) * r0, cy + sin(an) * r0, cx + cos(an) * r1, cy + sin(an) * r1);
        }
    }
    // Trozos de goma en el aire
    if (t < 1.4 && !MOV_REDUCIDO) {
        const a = constrain(1.4 - t, 0, 1);
        for (const f of ESTALLIDO.trozos) {
            const d = w * 0.6 + f.v * 60 * t, x = cx + cos(f.a) * d, y = cy + sin(f.a) * d + 90 * t * t;
            push(); translate(x, y); rotate(f.giro * t * 20);
            const c = color(COL.latex); c.setAlpha(255 * a); stroke(tinta()); strokeWeight(2); fill(c);
            beginShape(); vertex(-f.tam / 2, -f.tam / 4); quadraticVertex(0, -f.tam / 2, f.tam / 2, -f.tam / 5);
            vertex(f.tam / 3, f.tam / 4); quadraticVertex(0, f.tam / 6, -f.tam / 2, f.tam / 4); endShape(CLOSE);
            pop();
        }
    }
    // Jirones colgando del cuello atado
    stroke(tinta()); strokeWeight(2.5); fill(COL.latexOsc);
    beginShape(); vertex(cx - 11, neck - 10); vertex(cx - 16, neck - 30); vertex(cx - 7, neck - 22); vertex(cx - 2, neck - 36);
    vertex(cx + 4, neck - 21); vertex(cx + 14, neck - 29); vertex(cx + 11, neck - 10); endShape(CLOSE);
    stroke(tinta()); strokeWeight(3); fill(COL.latexOsc);
    beginShape(); vertex(cx - 11, neck - 12); quadraticVertex(cx, neck - 4, cx + 11, neck - 12); vertex(cx + 12, neck + 4); quadraticVertex(cx, neck + 9, cx - 12, neck + 4); endShape(CLOSE);
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
    manometro(338, 196, 42, ESTALLIDO ? 1 : G.presion);
    if (ESTALLIDO) drawRestosGlobo(ESTALLIDO.g);
    else {
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
    }
    // Sonda del termómetro hasta el centro del globo, y su cable a la lectura
    sondaYCable(cx, 288, cy + 4, [[cx - 10, 282], [54, 282], [30, 258], [30, 120]]);
    lectura(0, 70, 104, unidadC ? String(G.T - 273) : String(G.T), unidadC ? '°C' : 'K', 34);
    textoSis(i18n.t('sonda en el gas'), 52, 136, 12, THEME.rotuloObj, CENTER);
    lectura(286, 92, 112, fmt(lecturas().P, 2), 'atm', 26);
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
    lectura(288, 104, 112, fmt(lecturas().P, 2), 'atm', 26);
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
        // Aire de fuera, tenue: todos los puntos en un solo trazo
        const ra = rD * 0.9;
        ctx.save(); ctx.beginPath();
        for (const p of G.aire) { const x = X(p.x), y = Y(p.y); ctx.moveTo(x + ra, y); ctx.arc(x, y, ra, 0, Math.PI * 2); }
        ctx.fillStyle = THEME.aire; ctx.fill(); ctx.restore();
        if (ESTALLIDO) {
            // La goma rota: trozos de membrana que salen hacia fuera y se desvanecen
            dibujarMoleculas(X, Y, rD, k);
            const t = (millis() - ESTALLIDO.t0) / 1000;
            if (t < 1.2) {
                const ns = ESTALLIDO.nodos, n = ns.length, a = 1 - t / 1.2;
                for (let q = 0; q < 6; q++) {
                    const i0 = Math.floor(q * n / 6) + 1, i1 = Math.floor((q + 1) * n / 6) - 1;
                    const mid = ns[Math.floor((i0 + i1) / 2)], d = Math.hypot(mid.x, mid.y) || 1;
                    const dx = mid.x / d * 140 * t, dy = mid.y / d * 140 * t;
                    const c = color(COL.latex); c.setAlpha(255 * a); noFill(); stroke(c); strokeWeight(ESC_MOVIL ? 3 : 3.5);
                    beginShape(); for (let i = i0; i <= i1; i++) vertex(X(ns[i].x + dx), Y(ns[i].y + dy)); endShape();
                }
            }
        } else {
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
            if (gomaTirante()) flechasGoma(X, Y, k);
        }
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
// Colores por rapidez en 25 tonos precalculados (para no crear un color por
// molécula y fotograma). La clave cambia con el tema y con «Color por rapidez».
const TONOS = 24;
let paletaClave = '', paletaRelleno = [], paletaEstela = [];
function paletaRapidez() {
    const clave = temaActual() + (opciones.color ? 1 : 0);
    if (clave !== paletaClave) {
        paletaClave = clave; paletaRelleno = []; paletaEstela = [];
        for (let i = 0; i <= TONOS; i++) {
            const c = colorRapidez(6 * i / TONOS);
            paletaRelleno.push(c.toString());
            c.setAlpha(90); paletaEstela.push(c.toString());
        }
    }
}
const tonoDe = (v) => Math.round(constrain(v / 6, 0, 1) * TONOS);

// Las moléculas se dibujan por tandas del mismo color con el contexto del
// lienzo directamente: un trazo por tanda en vez de uno por molécula.
function dibujarMoleculas(X, Y, rD, k) {
    paletaRapidez();
    const ctx = drawingContext, ps = G.particulas;
    ctx.save();
    const tandas = Array.from({ length: TONOS + 1 }, () => []);
    for (const p of ps) tandas[tonoDe(Math.hypot(p.vx, p.vy))].push(p);
    if (opciones.estelas) {
        ctx.lineCap = 'round'; ctx.lineWidth = 3;
        tandas.forEach((t, i) => {
            if (!t.length) return;
            ctx.beginPath();
            for (const p of t) {
                if (Math.abs(p.vx) + Math.abs(p.vy) < 0.05) continue;
                ctx.moveTo(X(p.x), Y(p.y)); ctx.lineTo(X(p.x - p.vx * 4), Y(p.y - p.vy * 4));
            }
            ctx.strokeStyle = paletaEstela[i]; ctx.stroke();
        });
    }
    ctx.strokeStyle = tinta(); ctx.lineWidth = rD > 4 ? 1.6 : 1.2;
    tandas.forEach((t, i) => {
        if (!t.length) return;
        ctx.beginPath();
        for (const p of t) { const x = X(p.x), y = Y(p.y); ctx.moveTo(x + rD, y); ctx.arc(x, y, rD, 0, Math.PI * 2); }
        ctx.fillStyle = paletaRelleno[i]; ctx.fill(); ctx.stroke();
    });
    if (rD >= 3.5) {
        const rb = rD * 0.32, d = rD * 0.33;
        ctx.beginPath();
        for (const p of ps) { const x = X(p.x) - d, y = Y(p.y) - d; ctx.moveTo(x + rb, y); ctx.arc(x, y, rb, 0, Math.PI * 2); }
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    }
    ctx.restore();
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
    if (cerca(r, 2, 0.12)) return '· 2';
    if (cerca(r, 0.5, 0.12)) return '/ 2';
    if (cerca(r, 1, 0.04)) return i18n.t('igual');
    return '';
}
// Lo que se lee en números se actualiza 4 veces por segundo: más rápido no se
// puede leer y obliga a repintar el texto en cada fotograma.
let lectCache = { t: -1e9, P: 0, V: 0 }, mensajeCache = { clave: '' };
function lecturas() {
    const ahora = millis();
    if (ESTALLIDO) return { t: ahora, P: 1, V: NaN };
    if (ahora - lectCache.t >= 250 || G.pausa) lectCache = { t: ahora, P: G.presion, V: volSuave };
    return lectCache;
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
    // El reparto en líneas solo se calcula cuando cambia el mensaje (medir texto es caro)
    const clave = m.txt + '|' + fsMsg + '|' + w + '|' + textFont();
    if (clave !== mensajeCache.clave) {
        let lineas = partirRico(trozosRicos(m.txt), w - 2 * pad), fs = fsMsg;
        if (lineas.length > 4) { fs = fsMsg - 2; textSize(fs); lineas = partirRico(trozosRicos(m.txt), w - 2 * pad); }
        mensajeCache = { clave, lineas, fs };
    }
    const lineas = mensajeCache.lineas;
    fsUsado = mensajeCache.fs; textSize(fsUsado);
    noStroke(); fill(THEME.text);
    const yMsg = y + 20 + th + 16;
    textoRico(lineas.slice(0, 5), x + pad, yMsg, fsUsado + 7);
    let yy = yMsg + 4 * lead + 6;
    stroke(THEME.border); strokeWeight(1.5); line(x + pad, yy, x + w - pad, yy);
    textoSis(i18n.t('Lo que miden los aparatos'), x + pad, yy + 26, 14, THEME.textDim);
    const cel = celebrando() && CELEB.ref ? CELEB.ref : null, L = lecturas();
    const filas = [
        ['Presión', fmt(L.P, 2) + ' atm', cel ? relacion(L.P, cel.P) : ''],
        ['Volumen', isNaN(L.V) ? '—' : fmt(L.V, 2) + ' L', cel ? relacion(L.V, cel.V) : ''],
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
    if (ESTALLIDO) return;            // sin pared no hay choques que contar
    const fsD = compacto ? 14.5 : 15.5;
    textFont(FUENTE_TEXTO); textSize(fsD); noStroke(); fill(THEME.text);
    textoRico(partirRico(trozosRicos(i18n.t('Choques contra la pared: <strong>{c}</strong> cada segundo', { c: G.choquesSeg })), w - 2 * pad), x + pad, yy + 12, fsD + 6);
    const V = volSuave, P = G.presion, T = G.T;
    const ley = G.modo === 'globo'
        ? i18n.t('V / T = <strong>{a} L/K</strong> (a 1 atm)', { a: T > 0 ? fmt(V / T, 4) : '—' })
        : i18n.t('P · V = <strong>{a} atm·L</strong> · P / T = <strong>{b}</strong>', { a: fmt(P * V, 2), b: T > 0 ? fmt(P / T, 4) : '—' });
    fill(cel && CELEB.ley === 'boyle' ? THEME.change : THEME.text);
    textoRico(partirRico(trozosRicos(ley), w - 2 * pad), x + pad, yy + 38, fsD + 6);
    fill(THEME.textDim); textSize(compacto ? 13 : 14);
    textoRico(partirRico(trozosRicos(i18n.t('En total: {t} choques', { t: G.totalChoques.toLocaleString(i18n.lang === 'en' ? 'en' : 'es') })), w - 2 * pad), x + pad, yy + 64, 18);
    fuenteJuego();
}

// ── Gráfica en papel ─────────────────────────────────────────────
// La plumilla marca UN punto por cada estado del gas: al empezar y después de
// cada cambio espera a que el gas se estabilice (la presión es media de 3 s;
// el globo además tarda en crecer o encoger) y luego marca la media de 3 s.
const ESPERA_PUNTO = { rigido: 5000, globo: 7000 }, MEDIA_PUNTO = 3000;
let tCambioGrafica = null, puntoHecho = false;
function registrarGrafica() {
    if (G.pausa) return;
    if (tCambio !== tCambioGrafica) { tCambioGrafica = tCambio; puntoHecho = false; acumulado = { p: 0, v: 0, n: 0 }; }
    if (puntoHecho || !medidaLista()) return;
    const desde = relojSim() - tCambio, espera = ESPERA_PUNTO[G.modo];
    if (desde < espera) return;
    acumulado.p += G.presion; acumulado.v += volSuave; acumulado.n++;
    if (desde < espera + MEDIA_PUNTO) return;
    historial.push({ p: acumulado.p / acumulado.n, v: acumulado.v / acumulado.n, T: G.T, t: millis() });
    if (historial.length > 35) historial.shift();
    puntoHecho = true;
}
function borrarGrafica() { historial = []; acumulado = { p: 0, v: 0, n: 0 }; tGrafica = millis(); tCambioGrafica = null; }

function drawGrafica() {
    const g = GRAPH, mv = ESC_MOVIL;
    if (THEME.fun) { noStroke(); fill(tinta()); rect(g.x + 4, g.y + 5, g.w - 4, g.h - 5, 16); }
    stroke(THEME.fun ? tinta() : THEME.border); strokeWeight(THEME.fun ? 3 : 1.5); fill(THEME.paper);
    rect(g.x + 1, g.y + 1, g.w - 5, g.h - 7, 16);
    const ink = THEME.paperInk, dim = THEME.fun ? '#3d5568' : THEME.paperInk;
    if (!mv) { textoSis(i18n.t('Un punto cuando el gas'), g.x + 16, g.y + 72, 12.5, dim); textoSis(i18n.t('se estabiliza (media de 3 s)'), g.x + 16, g.y + 90, 12.5, dim); }
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
    if (ESTALLIDO) reiniciar(G.T > 0 ? G.T : 273);
    if (m !== G.modo) {
        cambiarModo(m);
        borrarGrafica(); REF = null; CELEB = null; tCambio = relojSim(); tMando = -1e9; tendencia = []; embolo = null; volSuave = volLey = G.area * LITROS_POR_PX2;
    }
    document.body.classList.toggle('modo-globo', m === 'globo');
    document.body.classList.toggle('modo-rigido', m === 'rigido');
    document.querySelectorAll('[data-modo]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.modo === m)));
    if (!ejesElegidos) elegirEjes(m === 'globo' ? 'vt' : 'pv');
    frase(); mostrarValores();
    if (typeof CV_W !== 'undefined' && ESC_MOVIL != null) rehacerComposicion();
    if (typeof pintarRetos === 'function') pintarRetos();
}
function reiniciar(T = 273) {
    quitarEstallido();
    reiniciarFisica(T, 50);
    volSuave = volLey = G.area * LITROS_POR_PX2; embolo = null;
    borrarGrafica(); REF = null; CELEB = null; tCambio = relojSim(); tMando = -1e9; tendencia = [];
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
    $('btn-reiniciar').addEventListener('click', () => reiniciar());
    $('btn-globo-nuevo').addEventListener('click', globoNuevo);
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
    pixelDensity(1);              // fitCanvas() pone la adecuada en cuanto se sabe el tamaño en pantalla
    cv.parent('canvas-container');
    cv.elt.setAttribute('role', 'img');
    cv.elt.setAttribute('aria-label', i18n.t('Simulación de la presión de un gas: el recipiente con su manómetro, el modelo de moléculas y la gráfica. Los mensajes de la simulación se leen en voz alta.'));
    frameRate(60);
    if (document.fonts) document.fonts.load('600 12px Fredoka');
    iniciarFisica();
    volSuave = volLey = G.area * LITROS_POR_PX2;
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
    vigilarRendimiento();
    actualizarTema(TEMA_PROPIO);
    clear();
    fuenteJuego();
    if (ESTALLIDO) pasoEstallido(); else { pasoFisica(); vigilarRotura(); }
    if (volSuave == null) volSuave = G.volumen;
    // Globo: media de ~1,5 s (el volumen tiembla con pocas moléculas). Émbolo: lo
    // mueve el mando y no tiembla, así que sigue rápido.
    if (!G.pausa) volSuave += (G.volumen - volSuave) * (G.modo === 'globo' ? 0.012 : MOV_REDUCIDO ? 1 : 0.05);
    if (volLey == null) volLey = G.volumen;
    if (!G.pausa) volLey += (G.volumen - volLey) * (G.modo === 'globo' ? 0.006 : 1);
    if (frameCount % 15 === 0 && !G.pausa && medidaLista()) {
        tendencia.push({ V: volSuave, P: G.presion, t: millis() });
        while (tendencia.length && millis() - tendencia[0].t > 2000) tendencia.shift();
    }
    if (!ESTALLIDO) { registrarGrafica(); comprobarLeyes(); }
    if (G.modo === 'rigido') yEmbolo();
    drawEscena();
}
