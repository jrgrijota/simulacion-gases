// ── Estilo SimulaCiencia (el del juego) en el lienzo ───────────────
// Temas: Oscuro («Pizarra», por defecto), Claro («Día») y Alto contraste.
// Aquí están los colores del lienzo, el marco, las fichas de datos de arriba
// (T, P y V en grande para la pizarra digital) y la mascota con su bocadillo.
// La física está en js/sketch.js y no depende de nada de este archivo.

const CV_W = 540, CV_H = 704;
const FRANJA_SUP = 76;                    // fichas de datos
const ZONA_SIM = 540;                     // cuadrado del gas (la física trabaja en él)
const BOCADILLO = { x: 14, y: FRANJA_SUP + ZONA_SIM + 2, w: CV_W - 28, h: 74 };
const FUENTE_TEXTO = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const MOV_REDUCIDO = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let THEME = {};
let temaActual = 'dark';

// Colores por defecto de los selectores de color según el tema (si el docente
// no los ha cambiado, cambian con el tema para que se lean sobre el fondo)
const COLORES_DEF = {
    dark:     { particula: '#00c8ff', membrana: '#ff4646', promedio: '#2ecc71' },
    light:    { particula: '#0369a1', membrana: '#d92d2d', promedio: '#0a7d58' },
    contrast: { particula: '#00ffff', membrana: '#ff4646', promedio: '#00ff00' },
};

function temaDesdeBody() {
    if (document.body.classList.contains('theme-contrast')) return 'contrast';
    if (document.body.classList.contains('theme-light')) return 'light';
    return 'dark';
}

function updateTheme() {
    temaActual = temaDesdeBody();
    if (temaActual === 'light') {
        THEME = {
            fun: true,
            canvasBg: '#eef5fb', panelBg: '#f7fbff', border: '#a9c6de', ink: '#13304a',
            text: '#13304a', textDim: '#3f5f7a', title: '#0b2236', grid: '#d3e2ef',
            pared: '#5d7d99', paredBrillo: 'rgba(255,255,255,0.85)',
            curva: '#b45309', punto: '#b45309',
            frio: '#1a5fd0', caliente: '#d42a2a',
            chipT: '#c0402a', chipP: '#1f5fbf', chipV: '#0a7d58',
        };
    } else if (temaActual === 'contrast') {
        THEME = {
            fun: false,
            canvasBg: '#000000', panelBg: '#000000', border: '#ffffff', ink: '#ffffff',
            text: '#ffffff', textDim: '#ffffff', title: '#ffff00', grid: '#555555',
            pared: '#ffffff', paredBrillo: 'rgba(0,0,0,0)',
            curva: '#ffff00', punto: '#ffff00',
            frio: '#3d8bff', caliente: '#ff4040',
            chipT: '#ffffff', chipP: '#ffffff', chipV: '#ffffff',
        };
    } else {
        THEME = {
            fun: true,
            canvasBg: '#11314f', panelBg: '#15395a', border: '#2d6996', ink: '#071a2b',
            text: '#eef7ff', textDim: '#b5d3ec', title: '#ffffff', grid: '#1c4366',
            pared: '#cfe3f3', paredBrillo: 'rgba(255,255,255,0.55)',
            curva: '#ffd84a', punto: '#ffd84a',
            frio: '#6fb8ff', caliente: '#ff5a5a',
            chipT: '#ff8a6a', chipP: '#7fb8ff', chipV: '#34e3a8',
        };
    }
}

// ── Selector de tema (en «Ajustes visuales») ───────────────────────
function iniciarSelectorTema() {
    const opciones = document.querySelectorAll('.theme-opt');
    const marcar = (tema) => opciones.forEach((b) => {
        const si = b.dataset.theme === tema;
        b.classList.toggle('active', si);
        b.setAttribute('aria-checked', String(si));
    });
    marcar(temaDesdeBody());
    opciones.forEach((b) => b.addEventListener('click', () => {
        const antes = temaDesdeBody();
        const tema = b.dataset.theme;
        document.body.classList.remove('theme-light', 'theme-contrast');
        if (tema !== 'dark') document.body.classList.add('theme-' + tema);
        try { localStorage.setItem('sim-gases-tema', tema); } catch (e) { /* sin almacenamiento */ }
        marcar(tema);
        ajustarColoresAlTema(antes, tema);
        if (typeof redraw === 'function' && typeof simulacionActiva !== 'undefined' && !simulacionActiva) redraw();
    }));
    ajustarColoresAlTema('dark', temaDesdeBody());
}

function ajustarColoresAlTema(antes, ahora) {
    const pares = [['color-picker-particula', 'particula'], ['color-picker-circulo', 'membrana'], ['color-picker-promedio', 'promedio']];
    for (const [id, clave] of pares) {
        const el = document.getElementById(id);
        if (el && el.value.toLowerCase() === COLORES_DEF[antes][clave]) el.value = COLORES_DEF[ahora][clave];
    }
}

// ── Marco y fondo ──────────────────────────────────────────────────
function dibujarFondoLienzo() {
    if (THEME.fun) {
        // El marco exterior se dibuja dentro del lienzo: encoge con él.
        clear();
        stroke(THEME.border); strokeWeight(2); fill(THEME.canvasBg);
        rect(1, 1, CV_W - 2, CV_H - 2, 34);
    } else {
        background(THEME.canvasBg);
        noFill(); stroke(THEME.border); strokeWeight(2);
        rect(1, 1, CV_W - 2, CV_H - 2);
    }
    textFont(THEME.fun ? 'Fredoka' : FUENTE_TEXTO);
}

// Tablero con borde y «sombra» sólida debajo (estilo juego)
function tablero(x, y, w, h, r) {
    if (THEME.fun) {
        noStroke(); fill(THEME.ink); rect(x, y + 4, w, h, r);
        stroke(THEME.border); strokeWeight(2); fill(THEME.panelBg);
        rect(x, y, w, h, r);
    } else {
        stroke(THEME.border); strokeWeight(2); fill(THEME.panelBg);
        rect(x, y, w, h);
    }
}

// ── Fichas de datos arriba: T, P y V en grande ─────────────────────
function dibujarFichasDatos(tK, enCelsius, pAtm, vL) {
    const datos = [
        { et: i18n.t('Temperatura'), val: enCelsius ? String(tK - 273) : String(tK), ud: enCelsius ? '°C' : 'K', col: THEME.chipT },
        { et: i18n.t('Presión'),     val: i18n.num(pAtm, 2), ud: 'atm', col: THEME.chipP },
        { et: i18n.t('Volumen'),     val: i18n.num(vL, 2),   ud: 'L',   col: THEME.chipV },
    ];
    const m = 14, sep = 10, w = (CV_W - 2 * m - 2 * sep) / 3, h = 54, y = 12;
    datos.forEach((d, i) => {
        const x = m + i * (w + sep);
        tablero(x, y, w, h, 16);
        noStroke(); fill(d.col); circle(x + 15, y + 16, 9);
        fill(THEME.textDim); textStyle(NORMAL); textSize(13); textAlign(LEFT, CENTER);
        text(d.et, x + 25, y + 16);
        textStyle(BOLD); textSize(26); fill(THEME.title); textAlign(LEFT, BASELINE);
        text(d.val, x + 12, y + 46);
        const vw = textWidth(d.val);
        textStyle(NORMAL); textSize(15); fill(THEME.textDim);
        text(d.ud, x + 12 + vw + 5, y + 46);
    });
    textStyle(NORMAL);
}

// ── Mascota con bocadillo ──────────────────────────────────────────
let bocadilloClave = '', bocadilloDesde = -1e9, chispas = [];

function salto(t0) {
    if (MOV_REDUCIDO) return 1;
    const e = (millis() - t0) / 450;
    if (e >= 1) return 1;
    return 1 + 0.35 * sin(e * PI) * (1 - e);
}

function lanzarChispas(x, y, col, n) {
    if (MOV_REDUCIDO) return;
    for (let i = 0; i < n; i++) {
        const a = random(TWO_PI), v = random(1.5, 3.5);
        chispas.push({ x, y, vx: cos(a) * v, vy: sin(a) * v - 1, vida: 1, col, r: random(3, 5), estrella: random() < 0.5 });
    }
}

function dibujarChispas() {
    for (let i = chispas.length - 1; i >= 0; i--) {
        const c = chispas[i];
        c.x += c.vx; c.y += c.vy; c.vy += 0.12; c.vida -= 0.045;
        if (c.vida <= 0) { chispas.splice(i, 1); continue; }
        const col = color(c.col); col.setAlpha(255 * c.vida);
        noStroke(); fill(col);
        if (c.estrella) estrella(c.x, c.y, c.r * 1.3, c.r * 0.5);
        else circle(c.x, c.y, c.r * 2 * c.vida);
    }
}

function estrella(x, y, r1, r2) {
    beginShape();
    for (let i = 0; i < 10; i++) {
        const a = -HALF_PI + i * PI / 5, r = i % 2 ? r2 : r1;
        vertex(x + cos(a) * r, y + sin(a) * r);
    }
    endShape(CLOSE);
}

// Una partícula de gas sonriente, del color de su rapidez (azul lenta, roja rápida)
function dibujarMascota(cx, cy, r, col) {
    const bote = MOV_REDUCIDO ? 0 : sin(millis() / 260) * 1.5;
    const parpadeo = millis() % 4200 > 4050;
    push();
    translate(cx, cy + bote);
    const s = salto(bocadilloDesde);
    scale(s, 2 - s);
    noStroke(); fill(0, 0, 0, 45); ellipse(0, r + 3 - bote, r * 1.5, 5);
    stroke(THEME.ink); strokeWeight(2.5); fill(col);
    circle(0, 0, r * 2);
    noStroke(); fill(255, 255, 255, 150);
    ellipse(-r * 0.42, -r * 0.45, r * 0.55, r * 0.35);
    fill(THEME.ink);
    if (parpadeo) {
        stroke(THEME.ink); strokeWeight(2);
        line(-r * 0.42, -r * 0.05, -r * 0.18, -r * 0.05); line(r * 0.18, -r * 0.05, r * 0.42, -r * 0.05);
    } else {
        ellipse(-r * 0.3, -r * 0.08, r * 0.2, r * 0.3); ellipse(r * 0.3, -r * 0.08, r * 0.2, r * 0.3);
    }
    noFill(); stroke(THEME.ink); strokeWeight(2.2);
    arc(0, r * 0.18, r * 0.6, r * 0.45, 0.15 * PI, 0.85 * PI);
    noStroke(); fill(255, 120, 150, 120);
    circle(-r * 0.58, r * 0.22, r * 0.3); circle(r * 0.58, r * 0.22, r * 0.3);
    pop();
}

// m = { clave, tag, txt, col }
function dibujarBocadillo(m, colMascota) {
    const { x, y, w, h } = BOCADILLO;
    if (m.clave !== bocadilloClave) {
        if (bocadilloClave) lanzarChispas(x + 26, y + h / 2, THEME.curva, 10);
        bocadilloClave = m.clave; bocadilloDesde = millis();
        anunciar(m.tag + '. ' + m.txt);
    }
    if (!THEME.fun) {
        stroke(THEME.border); strokeWeight(2); fill(THEME.panelBg);
        rect(x, y, w, h);
        noStroke(); fill(THEME.title); textStyle(BOLD); textSize(15); textAlign(LEFT, TOP);
        text(m.tag, x + 12, y + 8);
        textStyle(NORMAL); fill(THEME.text); textSize(15); textLeading(18);
        text(m.txt, x + 12, y + 30, w - 24, h - 32);
        return;
    }
    dibujarMascota(x + 24, y + h / 2, 20, colMascota);

    const bx = x + 56, my = y + h / 2;
    noStroke(); fill(THEME.ink); rect(bx, y + 3, w - 56, h, 16);
    stroke(THEME.border); strokeWeight(2); fill(THEME.panelBg);
    triangle(bx - 10, my, bx + 4, my - 8, bx + 4, my + 8);
    rect(bx, y, w - 56, h, 16);
    noStroke(); fill(THEME.panelBg);
    triangle(bx - 7, my, bx + 3, my - 6, bx + 3, my + 6);

    // Etiqueta arriba (da un salto al cambiar) y el texto debajo, a todo el ancho
    textStyle(BOLD); textSize(15);
    const tw = textWidth(m.tag) + 22;
    push();
    translate(bx + 12 + tw / 2, y + 17);
    scale(salto(bocadilloDesde));
    noStroke(); fill(THEME.ink); rect(-tw / 2, -10, tw, 23, 12);
    fill(m.col); rect(-tw / 2, -12, tw, 23, 12);
    fill(lightness(color(m.col)) > 55 ? THEME.ink : '#ffffff'); textAlign(CENTER, CENTER);
    text(m.tag, 0, -2);
    pop();
    textStyle(NORMAL);

    textFont(FUENTE_TEXTO);
    fill(THEME.text); textSize(15.5); textAlign(LEFT, TOP); textLeading(19);
    const tx = bx + 13;
    text(m.txt, tx, y + 33, x + w - tx - 10, h - 34);
    textFont('Fredoka');

    // Las chispas no salen de la zona de la mascota
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(x - 4, y - 8, 70, h + 14);
    drawingContext.clip();
    dibujarChispas();
    drawingContext.restore();
}

let ultimoAnuncio = '';
function anunciar(t) {
    if (t === ultimoAnuncio) return;
    ultimoAnuncio = t;
    const el = document.getElementById('anuncio');
    if (el) el.textContent = t;
}
