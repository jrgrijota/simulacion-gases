// ── Estilo SimulaCiencia (el del juego) en el lienzo ───────────────
// Temas: Oscuro («Pizarra», por defecto), Claro («Día») y Alto contraste.
// Aquí están los colores del lienzo, el marco y las fichas de datos de arriba
// (T, P y V en grande para la pizarra digital).
// La física está en js/sketch.js y no depende de nada de este archivo.

const CV_W = 540, CV_H = 630;
const FRANJA_SUP = 76;                    // fichas de datos
const ZONA_SIM = 540;                     // cuadrado del gas (la física trabaja en él)
const FUENTE_TEXTO = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

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
