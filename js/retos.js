// ═══════════════════════════════════════════════════════════════════
//  RETOS Y ÁLBUM DE LEYES (opcionales)
//
//  Ocultos por defecto: el botón «★ Retos» los despliega (o ?retos=1 en la
//  dirección). Lo conseguido se guarda en este navegador con localStorage
//  (sin cookies y sin enviar nada a ningún sitio). «Borrar lo conseguido»
//  lo vacía. La simulación avisa con retosGanar(ley, x) cuando comprueba
//  de verdad una ley (js/escena.js): x = 2 (doble) o 0.5 (mitad).
// ═══════════════════════════════════════════════════════════════════

const RETOS_CLAVE = 'simulaciencia-gases-retos';

// Sellos del álbum: una ley comprobada en la simulación
const ALBUM_LEYES = [
    { id: 'boyle',     nombre: 'Ley de Boyle',      corto: 'P·V', col: '#ffd84a', txt: 'P · V = constante' },
    { id: 'charles',   nombre: 'Ley de Charles',    corto: 'V/T', col: '#ff9a4a', txt: 'V / T = constante' },
    { id: 'gayLussac', nombre: 'Ley de Gay-Lussac', corto: 'P/T', col: '#ff7fd0', txt: 'P / T = constante' },
    { id: 'avogadro',  nombre: 'Ley de Avogadro',   corto: 'V/N', col: '#2ee6a6', txt: 'V / N = constante' },
    { id: 'cero',      nombre: 'Cero absoluto',     corto: '0 K', col: '#86c8ff', txt: 'P = 0' },
];
const NOMBRE_CORTO = { boyle: 'Boyle', charles: 'Charles', gayLussac: 'Gay-Lussac', avogadro: 'Avogadro', cero: '0 K' };

// Cada reto pide una ley concreta, en un sentido concreto (x: 2, 0.5 o cualquiera)
const RETOS = [
    { ley: 'boyle',     x: 0.5,  txt: 'Reduce el volumen a la mitad sin cambiar la temperatura. ¿Y la presión?' },
    { ley: 'charles',   x: 2,    txt: 'Haz que el globo doble su volumen sin meterle moléculas' },
    { ley: 'gayLussac', x: 2,    txt: 'Duplica la presión del recipiente rígido sin mover el émbolo ni meter gas' },
    { ley: 'avogadro',  x: 2,    txt: 'Duplica el volumen del globo sin cambiar la temperatura' },
    { ley: 'cero',      x: null, txt: 'Lleva el gas a 0 K: ¿qué queda de la presión?' },
];

const ALMACEN = crearAlmacen(RETOS_CLAVE, () => ({ retos: [], sellos: {} }));   // js/escena-comun.js
let retosDatos = ALMACEN.leer();
if (!Array.isArray(retosDatos.retos)) retosDatos.retos = [];
if (!retosDatos.sellos) retosDatos.sellos = {};

function retosGanar(ley, x) {
    let cambio = false;
    if (!retosDatos.sellos[ley]) { retosDatos.sellos[ley] = true; cambio = true; }
    RETOS.forEach((r, i) => {
        if (r.ley === ley && (r.x == null || r.x === x) && !retosDatos.retos[i]) { retosDatos.retos[i] = true; cambio = true; }
    });
    if (cambio) { ALMACEN.guardar(retosDatos); pintarRetos(); }
}

function pintarRetos() {
    const lista = document.getElementById('lista-retos');
    if (!lista) return;
    const modo = document.getElementById('retos-modo');
    if (modo) modo.textContent = '· ' + i18n.t('Cinética de gases');
    lista.innerHTML = '';
    RETOS.forEach((r, i) => {
        const hecho = !!retosDatos.retos[i];
        const txt = i18n.t(r.txt);
        const li = document.createElement('li');
        li.className = hecho ? 'hecho' : '';
        li.style.setProperty('--progreso', hecho ? '1' : '0');
        li.innerHTML = `<span class="anillo" aria-hidden="true"></span><span class="reto-txt"></span><span class="reto-estrella" aria-hidden="true">${hecho ? '★' : '☆'}</span>`;
        li.querySelector('.reto-txt').textContent = txt;
        if (hecho) li.setAttribute('aria-label', txt + ' · ' + i18n.t('conseguido'));
        lista.appendChild(li);
    });

    // Álbum en miniatura
    const mini = document.getElementById('album-mini');
    mini.innerHTML = '';
    let n = 0;
    ALBUM_LEYES.forEach(c => {
        const ok = !!retosDatos.sellos[c.id];
        if (ok) n++;
        const celda = document.createElement('span');
        celda.className = 'celda-sello';
        const el = document.createElement('span');
        el.className = 'sello' + (ok ? ' ganado' : '');
        el.style.setProperty('--col', c.col);
        el.textContent = ok ? c.corto : '?';
        el.title = i18n.t(c.nombre) + (ok ? '' : ' · ' + i18n.t('pendiente'));
        const nom = document.createElement('span');
        nom.className = 'nombre-sello';
        nom.textContent = i18n.t(NOMBRE_CORTO[c.id]);
        celda.appendChild(el); celda.appendChild(nom);
        mini.appendChild(celda);
    });
    document.getElementById('album-cuenta').textContent = `${n} / ${ALBUM_LEYES.length}`;
}

function pintarAlbum() {
    const tabla = document.getElementById('album-tabla');
    let h = '<div class="leyes-fila">';
    ALBUM_LEYES.forEach(c => {
        const ok = !!retosDatos.sellos[c.id];
        h += `<div class="ley-celda"><span class="sello grande${ok ? ' ganado' : ''}" style="--col:${c.col}">${ok ? c.corto : '?'}</span>` +
             `<strong>${i18n.t(c.nombre)}</strong><small>${ok ? i18n.t(c.txt) : i18n.t('pendiente')}</small></div>`;
    });
    h += '</div>';
    tabla.innerHTML = h;
}

// Abrir y cerrar el panel y el álbum, «Borrar lo conseguido» con
// confirmación y Escape: en js/escena-comun.js
document.addEventListener('DOMContentLoaded', () => iniciarPanelRetos({
    pintar: pintarRetos,
    pintarAlbum,
    alBorrar: () => { retosDatos = ALMACEN.vacio(); pintarRetos(); },
}, ALMACEN));
