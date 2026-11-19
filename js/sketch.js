// Configuración de la Membrana Discreta (Malla de Nodos Pura)
let centroX, centroY;
let numNodos = 60;               // Resolución perimetral de la membrana
let posicionesNodos = [];         // Coordenadas actuales {x, y}
let velocidadesNodos = [];        // Componentes de velocidad {x, y}
let fuerzasNodos = [];            // Componentes de fuerza {x, y}

// Parámetros Físicos Ajustados (Menor Rigidez y Radio Inicial)
let radioOriginalReposito = 90;   // Radio inicial del globo
let radioParedFija = 90;          // Radio de la pared rígida (botones «Radio del Contenedor»)
let kEstructuraMalla = 0.15;      // Cohesión elástica lateral entre nodos contiguos
// La membrana no tiene forma propia: la atmósfera la empuja hacia dentro con
// una presión constante (1 atm) y el globo se infla hasta que la presión del
// gas iguala a la de fuera. Así, a presión constante, V ∝ T (ley de Charles)
// y V ∝ N. Solo cerca de los topes actúa un muelle: el látex no se deja
// estirar más allá del lienzo ni el globo se aplasta del todo a 0 K.
const P_ATMOSFERA = 1.0;          // atm, presión exterior sobre el globo
// Velocidad que una presión de 1 atm comunica a un nodo por fotograma y por px
// de membrana. Sale de cómo se mide la presión en este archivo: cada choque
// reparte 1,6·(1 + 2·0,6 + 2·0,3) = 4,48·v_normal entre 5 nodos y
// P = impulso/s · K_PRESION / perímetro, con impulso = 2·v_normal a 60 fps.
const K_EMPUJE_EXTERIOR = 4.48 / (2 * 60 * 4);   // 4 = K_PRESION
const RADIO_MIN_GLOBO = 28, RADIO_MAX_GLOBO = 235;
const K_TOPE = 0.08;
const K_REDONDEZ = 0.03;
let amortiguacionMalla = 0.86;    // Filtro viscoso de estabilidad
let radioMedioObservado = 90;     // Métrica de cálculo en tiempo real

// Propiedades de las partículas: 2 px de inicio, para que el volumen propio
// de las partículas apenas cuente y se cumplan las leyes de los gases
let radioParticula = 2;
let colorParticulaHex = "#00c8ff";
let colorCirculoHex = "#ff4646";
let colorPromedioHex = "#2ecc71"; 
let formatoPromedio = "punteado";  
let particulas = [];

// Contadores de choques
let totalChoques = 0;
let choquesEnEsteSegundo = 0;
let choquesPorSegundo = 0;
let ultimoTiempoMedido = 0; 
// Impulso transmitido a la pared (Σ 2·v_normal de cada choque): la presión es
// impulso / tiempo / perímetro, así que crece con el número de choques Y con
// lo fuerte que es cada uno (P ∝ N·v² ∝ T, ley de Gay-Lussac).
let impulsoEnEsteSegundo = 0;
let impulsoPorSegundo = 0;
let impulsosRecientes = [];
const K_PRESION = 4;   // calibra la escala en atm (≈ la de antes a 273 K)
const LITROS_POR_PX2 = 5.0 / (Math.PI * 220 * 220);

// Variables de control para el promedio acumulado de la gráfica (Cada 3 segundos)
let ultimoTiempoGrafica = 0;
let sumaPresionParaMedia = 0;
let sumaVolumenParaMedia = 0;
let cantidadMuestrasFrame = 0;

// Inicialización termodinámica de inicio a 273K
let temperaturaActualInt = 273;
let temperaturaAnterior = 273; 

// Gestión del modo de pared y estados de ejecución
let modoPared = 'flexible'; 
let temporizadorBoton = null;
let simulacionActiva = true; 
let historialPuntos = []; 

// Referencias de elementos HTML
let sliderParticulas, sliderTemperatura, sliderTamaño, checkFullscreen, btnPlayPause;
let pickerColor, elemColorHex, pickerColorCirculo, elemColorCirculoHex;
let checkEscalaTemp, elemRadioView, wrapperRadioManual, selectPared;
let mFrecuencia, mRadio, mTotales, lblSizeVal, mPresionFisica, mVolumenFisico;
let inputDirectParticles, inputDirectTemp, elemUnidadView, lblTempMin, lblTempMax;
let pickerColorPromedio, elemColorPromedioHex, selectFormatoPromedio; 
let wrapperColorPromedio, wrapperFormatPromedio; 
let checkMostrarGrafica; // NUEVO: Enlace para el checkbox de la gráfica

function setup() {
    // Lienzo de 540 × 690: arriba las fichas de T, P y V; en medio el gas (540 × 540,
    // la física trabaja en ese cuadrado); abajo, un margen.
    let canvas = createCanvas(CV_W, CV_H);
    canvas.parent('canvas-container');
    pixelDensity(Math.max(2, displayDensity()));   // nítido al ampliarlo en la pizarra
    if (document.fonts) document.fonts.load('600 12px Fredoka');
    updateTheme();
    iniciarSelectorTema();
    
    centroX = width / 2;
    centroY = FRANJA_SUP + ZONA_SIM / 2;
    
    inicializarMembranaPura();
    
    sliderParticulas = createSlider(1, 500, 50, 1);
    sliderParticulas.attribute('aria-label', i18n.t('Cantidad de partículas'));
    sliderParticulas.parent('particle-slider-container');
    
    sliderTemperatura = createSlider(0, 500, 273, 1);
    sliderTemperatura.attribute('aria-label', i18n.t('Temperatura'));
    sliderTemperatura.parent('temp-slider-container');
    
    sliderTamaño = createSlider(1, 15, 2, 1); 
    sliderTamaño.attribute('aria-label', i18n.t('Tamaño partícula'));
    sliderTamaño.parent('size-slider-container');
    
    // Mapear elementos del DOM
    inputDirectParticles = select('#input-direct-particles');
    inputDirectTemp = select('#input-direct-temp');
    elemUnidadView = select('#unit-temp-view');
    lblTempMin = select('#lbl-temp-min');
    lblTempMax = select('#lbl-temp-max');
    
    checkEscalaTemp = select('#check-escala-temp');
    elemRadioView = select('#input-radio-view');
    wrapperRadioManual = select('#wrapper-radio-manual');
    selectPared = select('#select-pared');
    checkTermografico = select('#check-termografico');
    checkFullscreen = select('#check-fullscreen'); 
    btnPlayPause = select('#play-pause-btn');
    
    pickerColor = select('#color-picker-particula');
    elemColorHex = select('#color-hex-val');
    pickerColorCirculo = select('#color-picker-circulo');
    elemColorCirculoHex = select('#color-circulo-hex-val');
    
    pickerColorPromedio = select('#color-picker-promedio');
    elemColorPromedioHex = select('#color-promedio-hex-val');
    selectFormatoPromedio = select('#select-formato-promedio');
    wrapperColorPromedio = select('#wrapper-color-promedio');
    wrapperFormatPromedio = select('#wrapper-format-promedio');
    
    
    mFrecuencia = select('#metric-frecuencia');
    mRadio = select('#metric-radio');
    mTotales = select('#metric-totales');
    mPresionFisica = select('#metric-presion-fisica');
    mVolumenFisico = select('#metric-volumen-fisico');
    lblSizeVal = select('#size-val');

    checkMostrarGrafica = select('#check-mostrar-grafica');
    
    // Vinculación de listeners interactivos
    if (selectPared) selectPared.changed(actualizarModoPared);
    if (checkEscalaTemp) checkEscalaTemp.changed(sincronizarEscalaTermica); 
    if (checkFullscreen) checkFullscreen.changed(alternarPantallaCompleta); 
    
    // Sincronizadores bilaterales UX
    if (sliderParticulas) sliderParticulas.input(sincronizarSliderHaciaInputTeclado);
    if (inputDirectParticles) {
        inputDirectParticles.changed(sincronizarInputTecladoHaciaSlider);
        inputDirectParticles.elt.addEventListener('blur', sincronizarInputTecladoHaciaSlider);
    }
    if (sliderTemperatura) sliderTemperatura.input(sincronizarSliderTempHaciaInputTeclado);
    if (inputDirectTemp) {
        inputDirectTemp.changed(sincronizarInputTecladoTemp);
        inputDirectTemp.elt.addEventListener('blur', sincronizarInputTecladoTemp);
    }
    
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && checkFullscreen) { checkFullscreen.checked(false); }
    });
    
    let tiempoActual = millis();
    ultimoTiempoMedido = tiempoActual;
    ultimoTiempoGrafica = tiempoActual;
    
    actualizarEstiloSliderTemperatura();
    gestionarParticulas(sliderParticulas.value(), temperaturaActualInt);

    // Ajustes de la dirección (fichas del alumnado): ver js/parametros.js.
    // Temperatura en K. «volumen» (en L) fija el radio de la pared rígida, en
    // pasos de 5 px como los botones.
    aplicarParametrosUrl({
        particulas:  urlParam.range('input-direct-particles'),
        temperatura: urlParam.range('input-direct-temp'),
        recipiente:  (v) => {
            urlParam.select('select-pared')({ rigido: 'fija', 'rígido': 'fija', globo: 'flexible' }[v] || v);
            // Al abrir, el globo aún no tiene radio medio: se parte del de reposo.
            if (modoPared === 'fija') {
                radioParedFija = constrain(int(radioOriginalReposito), 30, 210);
                mostrarVolumenPared();
            }
        },
        volumen:     (v) => {
            const litros = parseFloat(v.replace(',', '.'));
            if (!(litros > 0) || modoPared !== 'fija') return;
            const r = Math.sqrt(litros / (Math.PI * LITROS_POR_PX2));
            radioParedFija = constrain(Math.round(r / 5) * 5, 30, 210);
            mostrarVolumenPared();
        },
        grafica:     urlParam.toggle('check-mostrar-grafica', (c) => c.checked),
    });
}

function inicializarMembranaPura() {
    posicionesNodos = []; velocidadesNodos = []; fuerzasNodos = [];
    for (let i = 0; i < numNodos; i++) {
        let angulo = map(i, 0, numNodos, 0, TWO_PI);
        posicionesNodos.push({
            x: centroX + cos(angulo) * radioOriginalReposito,
            y: centroY + sin(angulo) * radioOriginalReposito
        });
        velocidadesNodos.push({ x: 0, y: 0 }); fuerzasNodos.push({ x: 0, y: 0 });
    }
}

function draw() {
    updateTheme();
    dibujarFondoLienzo();
    rellenoDeslizador(sliderParticulas);
    rellenoDeslizador(sliderTamaño);
    
    let cantidadDeseada = sliderParticulas.value();
    radioParticula = sliderTamaño.value();
    if (lblSizeVal) lblSizeVal.html(radioParticula + " px");
    
    if (pickerColor && elemColorHex) {
        colorParticulaHex = pickerColor.value(); elemColorHex.html(colorParticulaHex.toUpperCase());
    }
    if (pickerColorCirculo && elemColorCirculoHex) {
        colorCirculoHex = pickerColorCirculo.value(); elemColorCirculoHex.html(colorCirculoHex.toUpperCase());
    }
    if (pickerColorPromedio && elemColorPromedioHex) {
        colorPromedioHex = pickerColorPromedio.value(); elemColorPromedioHex.html(colorPromedioHex.toUpperCase());
    }
    if (selectFormatoPromedio) { formatoPromedio = selectFormatoPromedio.value(); }
    
    gestionarParticulas(cantidadDeseada, temperaturaActualInt);
    
    let areaPoligono = 0;
    for (let i = 0; i < numNodos; i++) {
        let siguiente = (i + 1) % numNodos;
        areaPoligono += (posicionesNodos[i].x - centroX) * (posicionesNodos[siguiente].y - centroY) - 
                        (posicionesNodos[siguiente].x - centroX) * (posicionesNodos[i].y - centroY);
    }
    areaPoligono = abs(areaPoligono) / 2;
    
    radioMedioObservado = 0;
    for (let i = 0; i < numNodos; i++) { radioMedioObservado += dist(centroX, centroY, posicionesNodos[i].x, posicionesNodos[i].y); }
    radioMedioObservado /= numNodos;

    if (millis() - ultimoTiempoMedido >= 1000) {
        choquesPorSegundo = choquesEnEsteSegundo; choquesEnEsteSegundo = 0;
        // La presión es la media de los últimos 3 s: con un solo segundo de
        // choques saltaba varias décimas y no se podía leer un valor estable
        impulsosRecientes.push(impulsoEnEsteSegundo); impulsoEnEsteSegundo = 0;
        if (impulsosRecientes.length > 3) impulsosRecientes.shift();
        impulsoPorSegundo = impulsosRecientes.reduce((a, b) => a + b, 0) / impulsosRecientes.length;
        ultimoTiempoMedido = millis();
    }
    
    if (temperaturaActualInt !== temperaturaAnterior) {
        if (temperaturaActualInt === 0) {
            for (let i = 0; i < particulas.length; i++) { particulas[i].vx = 0; particulas[i].vy = 0; }
        } else if (temperaturaAnterior === 0) {
            for (let i = 0; i < particulas.length; i++) {
                let magnitudVel = random(1.5, 3.5) * sqrt(temperaturaActualInt / 300);
                let anguloVel = random(0, TWO_PI);
                particulas[i].vx = magnitudVel * cos(anguloVel);
                particulas[i].vy = magnitudVel * sin(anguloVel);
            }
        } else {
            let factorEscala = sqrt(temperaturaActualInt / temperaturaAnterior);
            for (let i = 0; i < particulas.length; i++) { particulas[i].vx *= factorEscala; particulas[i].vy *= factorEscala; }
        }
        temperaturaAnterior = temperaturaActualInt;
    }
    
    // V ∝ área (recta que pasa por el origen): 5 L con el radio máximo (220 px)
    let volumenLitros = areaPoligono * LITROS_POR_PX2;
    let perimetroEstimado = TWO_PI * radioMedioObservado;
    let presionAtm = (impulsoPorSegundo * K_PRESION) / perimetroEstimado;
    if (temperaturaActualInt === 0) presionAtm = 0; 
    
    if (mFrecuencia) mFrecuencia.html(choquesPorSegundo);
    if (mRadio) mRadio.html(conComaDecimal(nf(radioMedioObservado, 3, 1)));
    if (mTotales) mTotales.html(totalChoques);
    if (mPresionFisica) mPresionFisica.html(conComaDecimal(nf(presionAtm, 1, 2)));
    if (mVolumenFisico) mVolumenFisico.html(conComaDecimal(nf(volumenLitros, 1, 2)));
    
    sumaPresionParaMedia += presionAtm; sumaVolumenParaMedia += areaPoligono; cantidadMuestrasFrame++;

    if (millis() - ultimoTiempoGrafica >= 3000) {
        if (cantidadMuestrasFrame > 0) {
            let mediaPresion = sumaPresionParaMedia / cantidadMuestrasFrame; 
            let mediaArea = sumaVolumenParaMedia / cantidadMuestrasFrame;
            // Se guardan P (atm) y V (L); la escala se calcula al dibujar
            historialPuntos.push({ v: mediaArea * LITROS_POR_PX2, p: mediaPresion });
            if (historialPuntos.length > 35) historialPuntos.shift();
        }
        sumaPresionParaMedia = 0; sumaVolumenParaMedia = 0; cantidadMuestrasFrame = 0;
        ultimoTiempoGrafica = millis();
    }

    
    if (modoPared === 'flexible') {
        for (let i = 0; i < numNodos; i++) {
            let nAct = posicionesNodos[i];
            let dxCentro = nAct.x - centroX; let dyCentro = nAct.y - centroY;
            let distCentro = sqrt(dxCentro * dxCentro + dyCentro * dyCentro) || 1;
            let nx = dxCentro / distCentro; let ny = dyCentro / distCentro;
            
            let nIzq = posicionesNodos[(i - 1 + numNodos) % numNodos];
            let nDer = posicionesNodos[(i + 1) % numNodos];
            // Cohesión: cada nodo tiende al radio medio de sus vecinos. Alisa los
            // bultos sin tirar del globo hacia dentro (en un círculo no hace nada),
            // así la única presión exterior es la de la atmósfera.
            let rVecinos = (dist(centroX, centroY, nIzq.x, nIzq.y) + dist(centroX, centroY, nDer.x, nDer.y)) / 2;
            // Además, una tendencia suave al radio medio mantiene el globo redondo
            // (tampoco cambia la presión: suma cero a lo largo de la membrana).
            let fRadial = (rVecinos - distCentro) * 2 * kEstructuraMalla + (radioMedioObservado - distCentro) * K_REDONDEZ;
            let fMuelleX = nx * fRadial;
            let fMuelleY = ny * fRadial;
            
            // Empuje de la atmósfera, proporcional al trozo de membrana del nodo
            let tramo = (dist(nAct.x, nAct.y, nIzq.x, nIzq.y) + dist(nAct.x, nAct.y, nDer.x, nDer.y)) / 2;
            let empujeExterior = K_EMPUJE_EXTERIOR * P_ATMOSFERA * tramo;
            if (distCentro > RADIO_MAX_GLOBO) empujeExterior += (distCentro - RADIO_MAX_GLOBO) * K_TOPE;
            if (distCentro < RADIO_MIN_GLOBO) empujeExterior -= (RADIO_MIN_GLOBO - distCentro) * K_TOPE;
            let fRestauracionX = -nx * empujeExterior;
            let fRestauracionY = -ny * empujeExterior;
            
            let fTotalAcumuladaX = fMuelleX + fRestauracionX; let fTotalAcumuladaY = fMuelleY + fRestauracionY;
            let fuerzaProyectadaEscalar = (fTotalAcumuladaX * nx) + (fTotalAcumuladaY * ny);
            
            fuerzasNodos[i].x += nx * fuerzaProyectadaEscalar; fuerzasNodos[i].y += ny * fuerzaProyectadaEscalar;
            velocidadesNodos[i].x += fuerzasNodos[i].x; velocidadesNodos[i].y += fuerzasNodos[i].y;
            velocidadesNodos[i].x *= amortiguacionMalla; velocidadesNodos[i].y *= amortiguacionMalla;
            
            nAct.x += velocidadesNodos[i].x; nAct.y += velocidadesNodos[i].y;
            fuerzasNodos[i].x = 0; fuerzasNodos[i].y = 0;
        }
    } else {
        for (let i = 0; i < numNodos; i++) {
            let angulo = map(i, 0, numNodos, 0, TWO_PI);
            posicionesNodos[i].x = centroX + cos(angulo) * radioParedFija;
            posicionesNodos[i].y = centroY + sin(angulo) * radioParedFija;
            velocidadesNodos[i].x = 0; velocidadesNodos[i].y = 0;
        }
    }
    
    if (modoPared === 'flexible') {
        stroke(color(colorPromedioHex)); strokeWeight(THEME.fun ? 2 : 1.2); noFill();
        if (formatoPromedio === "punteado") { drawingContext.setLineDash(THEME.fun ? [6, 7] : [4, 6]); }
        circle(centroX, centroY, radioMedioObservado * 2);
        if (formatoPromedio === "punteado") { drawingContext.setLineDash([]); }
    }

    dibujarRecipiente();
    
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i]; p.x += p.vx; p.y += p.vy; comprobarParedesLocalesPuras(p);
    }
    resolverChoquesParticulas();
    
    let colorFijo = color(colorParticulaHex);
    let colorFrio = color(THEME.frio); let colorCaliente = color(THEME.caliente); 
    // Con el estilo juego, las partículas grandes llevan contorno de tinta y brillo
    const conTinta = THEME.fun && radioParticula >= 4;
    if (conTinta) { stroke(THEME.ink); strokeWeight(radioParticula >= 7 ? 2 : 1.4); } else noStroke();
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        if (checkTermografico && checkTermografico.checked()) {
            let vInstantanea = sqrt(p.vx * p.vx + p.vy * p.vy);
            let factorTermo = map(vInstantanea, 0, 6, 0, 1, true);
            fill(lerpColor(colorFrio, colorCaliente, factorTermo));
        } else { fill(colorFijo); }
        circle(p.x, p.y, radioParticula * 2);
    }
    if (conTinta && radioParticula >= 5) {
        noStroke(); fill(255, 255, 255, 150);
        const rb = radioParticula * 0.35;
        for (const p of particulas) circle(p.x - radioParticula * 0.35, p.y - radioParticula * 0.35, rb * 2);
    }

    // La gráfica va en la esquina del cuadrado del gas, por encima del globo
    // (si no, el globo grande tapa los ejes)
    if (checkMostrarGrafica && checkMostrarGrafica.checked()) {
        push(); translate(0, FRANJA_SUP);
        dibujarPlanoCartesiano();
        pop();
    }

    const enCelsius = checkEscalaTemp && checkEscalaTemp.checked();
    dibujarFichasDatos(temperaturaActualInt, enCelsius, presionAtm, volumenLitros);
}

// Relleno del color de acento hasta la bola del deslizador (estilo juego)
function rellenoDeslizador(sl) {
    if (!sl) return;
    const el = sl.elt;
    const pct = ((el.value - el.min) / (el.max - el.min) * 100).toFixed(1) + '%';
    if (el.style.getPropertyValue('--fill') !== pct) el.style.setProperty('--fill', pct);
}

// Globo (membrana) o pared rígida
function dibujarRecipiente() {
    const colMembrana = modoPared === 'flexible' ? color(colorCirculoHex) : color(THEME.pared);
    const contorno = () => {
        beginShape();
        for (let i = 0; i < numNodos; i++) { vertex(posicionesNodos[i].x, posicionesNodos[i].y); }
        endShape(CLOSE);
    };
    if (!THEME.fun) {
        stroke(modoPared === 'flexible' ? colMembrana : color(THEME.pared)); strokeWeight(2.5); noFill();
        contorno();
        return;
    }
    strokeJoin(ROUND);
    if (modoPared === 'flexible') {
        // Globo: látex translúcido con contorno de tinta, nudo abajo y un brillo
        const relleno = color(colorCirculoHex); relleno.setAlpha(34);
        noStroke(); fill(relleno); contorno();
        noFill(); stroke(THEME.ink); strokeWeight(7); contorno();
        stroke(colMembrana); strokeWeight(3.5); contorno();
        const n = posicionesNodos[Math.round(numNodos / 4)];   // el nodo de abajo
        stroke(THEME.ink); strokeWeight(2.5); fill(colMembrana);
        triangle(n.x, n.y + 2, n.x - 8, n.y + 14, n.x + 8, n.y + 14);
        noFill(); stroke(255, 255, 255, 110); strokeWeight(4); strokeCap(ROUND);
        const rb = radioMedioObservado * 0.78;
        arc(centroX, centroY, rb * 2, rb * 2, PI * 1.1, PI * 1.38);
    } else {
        // Pared rígida: aro de metal grueso con contorno de tinta
        noFill(); stroke(THEME.ink); strokeWeight(11); contorno();
        stroke(colMembrana); strokeWeight(6); contorno();
        stroke(THEME.paredBrillo); strokeWeight(2); strokeCap(ROUND);
        arc(centroX, centroY, radioParedFija * 2 - 2, radioParedFija * 2 - 2, PI * 1.1, PI * 1.45);
    }
}

// NUEVO: Función controladora del cajón derecho (Drawer UX)
function alternarDrawer() {
    let drawer = select('#visual-drawer');
    if (!drawer) return;
    if (drawer.hasClass('drawer-closed')) {
        drawer.removeClass('drawer-closed'); drawer.addClass('drawer-open');
    } else {
        drawer.removeClass('drawer-open'); drawer.addClass('drawer-closed');
    }
}

// SINCRONIZADORES DE CONTROL SIDEBAR
function sincronizarSliderHaciaInputTeclado() { if (inputDirectParticles && sliderParticulas) { inputDirectParticles.value(sliderParticulas.value()); } }
function sincronizarInputTecladoHaciaSlider() {
    if (!inputDirectParticles || !sliderParticulas) return;
    let val = constrain(int(inputDirectParticles.value()), 1, 500); inputDirectParticles.value(val); sliderParticulas.value(val);
}
function ajustarParticulasBotones(cambio) {
    if (!simulacionActiva || !sliderParticulas || !inputDirectParticles) return;
    let val = constrain(sliderParticulas.value() + cambio, 1, 500); sliderParticulas.value(val); inputDirectParticles.value(val);
}
function sincronizarSliderTempHaciaInputTeclado() {
    if (!sliderTemperatura || !inputDirectTemp) return;
    temperaturaActualInt = sliderTemperatura.value(); renderizarValorTemperatura(); actualizarEstiloSliderTemperatura();
}
function sincronizarInputTecladoTemp() {
    if (!inputDirectTemp || !sliderTemperatura) return;
    let valIngresado = int(inputDirectTemp.value());
    if (checkEscalaTemp && checkEscalaTemp.checked()) {
        let celsius = constrain(valIngresado, -273, 227); temperaturaActualInt = celsius + 273;
    } else { temperaturaActualInt = constrain(valIngresado, 0, 500); }
    sliderTemperatura.value(temperaturaActualInt); renderizarValorTemperatura(); actualizarEstiloSliderTemperatura();
}
// CORRECCIÓN: Corrección de la firma del callback del stepper
function ajustarTemperaturaBotones(cambio) {
    if (!simulacionActiva || !sliderTemperatura || !inputDirectTemp) return;
    temperaturaActualInt = constrain(sliderTemperatura.value() + cambio, 0, 500); sliderTemperatura.value(temperaturaActualInt);
    renderizarValorTemperatura(); actualizarEstiloSliderTemperatura();
}
function sincronizarEscalaTermica() {
    renderizarValorTemperatura(); if (!lblTempMin || !lblTempMax) return;
    if (checkEscalaTemp && checkEscalaTemp.checked()) { lblTempMin.html("-273 °C"); lblTempMax.html("227 °C"); }
    else { lblTempMin.html("0 K"); lblTempMax.html("500 K"); }
}
function renderizarValorTemperatura() {
    if (!inputDirectTemp || !elemUnidadView) return;
    if (checkEscalaTemp && checkEscalaTemp.checked()) { inputDirectTemp.value(temperaturaActualInt - 273); elemUnidadView.html("°C"); }
    else { inputDirectTemp.value(temperaturaActualInt); elemUnidadView.html("K"); }
}
function actualizarEstiloSliderTemperatura() {
    if (!sliderTemperatura) return;
    sliderTemperatura.elt.style.background = `linear-gradient(to right, #0077ff, #ff3300)`;
}

function dibujarPlanoCartesiano() {
    const fun = THEME.fun;
    if (fun) tablero(20, 360, 200, 160, 16);
    else { fill(THEME.panelBg); stroke(THEME.border); strokeWeight(1); rect(20, 360, 200, 160, 6); }
    stroke(THEME.grid); strokeWeight(1);
    for(let x = 80; x < 200; x += 35)  line(x, 380, x, 500);
    for(let y = 410; y < 500; y += 30) line(50, y, 200, y);
    stroke(THEME.textDim); strokeWeight(fun ? 2.5 : 1.5); strokeCap(ROUND); line(50, 380, 50, 500); line(50, 500, 200, 500); 
    noStroke(); fill(THEME.text); textStyle(BOLD); textSize(fun ? 13 : 11); textAlign(CENTER, CENTER); text("V (L)", 194, 488); text("P (atm)", 66, 370);
    textStyle(NORMAL);
    
    // Ejes desde 0: V de 0 a 5 L; P de 0 al máximo reciente (redondeado hacia arriba)
    let pMax = 2;
    for (let pt of historialPuntos) pMax = max(pMax, ceil(pt.p * 1.2));
    let xDe = (v) => constrain(map(v, 0, 5, 50, 200), 50, 200);
    let yDe = (p) => constrain(map(p, 0, pMax, 500, 385), 380, 500);
    noStroke(); fill(THEME.textDim); textSize(fun ? 11 : 9);
    textAlign(RIGHT, CENTER); text(pMax, 45, 385); text('0', 45, 500);
    textAlign(CENTER, TOP); text('5', 200, 503);

    noFill(); stroke(THEME.curva); strokeWeight(fun ? 3.5 : 2); strokeJoin(ROUND); beginShape();
    for (let i = 0; i < historialPuntos.length; i++) { vertex(xDe(historialPuntos[i].v), yDe(historialPuntos[i].p)); }
    endShape();
    
    if (historialPuntos.length > 0) {
        let uP = historialPuntos[historialPuntos.length - 1];
        let px = xDe(uP.v); let py = yDe(uP.p);
        const guia = color(THEME.curva); guia.setAlpha(120);
        stroke(guia); strokeWeight(1); drawingContext.setLineDash([4, 4]);
        line(px, py, 50, py); line(px, py, px, 500); drawingContext.setLineDash([]);
        if (fun) { stroke(THEME.ink); strokeWeight(2); } else noStroke();
        fill(THEME.punto); circle(px, py, fun ? 10 : 7);
    }
}

function actualizarModoPared() {
    if (!selectPared) return;
    modoPared = selectPared.value();
    if (modoPared === 'fija') {
        // La pared rígida se fija en el tamaño que tenía el globo; el radio de
        // reposo del globo no se toca, así que al volver a «Membrana» recupera su forma
        radioParedFija = constrain(int(radioMedioObservado), 30, 210);
        if (wrapperRadioManual) wrapperRadioManual.removeClass('hidden');
        mostrarVolumenPared();
        if (wrapperColorPromedio) wrapperColorPromedio.addClass('hidden');
        if (wrapperFormatPromedio) wrapperFormatPromedio.addClass('hidden');
    } else { 
        if (wrapperRadioManual) wrapperRadioManual.addClass('hidden'); 
        if (wrapperColorPromedio) wrapperColorPromedio.removeClass('hidden');
        if (wrapperFormatPromedio) wrapperFormatPromedio.removeClass('hidden');
    }
    historialPuntos = []; 
}

// Botones «Radio del Contenedor» (solo con pared rígida): comprimir o expandir
// a temperatura constante para comprobar la ley de Boyle (P·V = constante).
// Con pared rígida se muestra el volumen (L), que es la magnitud de las leyes
// de los gases, no el radio en píxeles del dibujo.
// Coma decimal en español, catalán y euskera; en inglés (?lang=en) se deja el punto
function conComaDecimal(texto) {
    return i18n.lang === 'en' ? texto : texto.replace('.', ',');
}

function mostrarVolumenPared() {
    if (!elemRadioView) return;
    let litros = Math.PI * radioParedFija * radioParedFija * LITROS_POR_PX2;
    elemRadioView.html(conComaDecimal(nf(litros, 1, 2)));
}

function ajustarRadioManual(cambio) {
    if (!simulacionActiva || modoPared !== 'fija') return;
    radioParedFija = constrain(radioParedFija + cambio, 30, 210);
    mostrarVolumenPared();
}

function comprobarParedesLocalesPuras(p) {
    let dxCentro = p.x - centroX; let dyCentro = p.y - centroY;
    let distanciaAlCentro = sqrt(dxCentro * dxCentro + dyCentro * dyCentro) || 1;
    let anguloParticula = atan2(dyCentro, dxCentro); if (anguloParticula < 0) anguloParticula += TWO_PI;
    let indiceNodo = floor(map(anguloParticula, 0, TWO_PI, 0, numNodos)) % numNodos;
    let nodoMalla = posicionesNodos[indiceNodo];
    let distanciaPared = sqrt((nodoMalla.x - centroX)*(nodoMalla.x - centroX) + (nodoMalla.y - centroY)*(nodoMalla.y - centroY));
    
    if (distanciaAlCentro >= distanciaPared - radioParticula) {
        let nx = dxCentro / distanciaAlCentro; let ny = dyCentro / distanciaAlCentro;
        let productoEscalar = p.vx * nx + p.vy * ny;
        if (productoEscalar > 0) {
            totalChoques++; choquesEnEsteSegundo++;
            impulsoEnEsteSegundo += 2 * productoEscalar;
            if (modoPared === 'flexible') {
                let fImpulsoX = nx * productoEscalar * 1.6; let fImpulsoY = ny * productoEscalar * 1.6;
                velocidadesNodos[indiceNodo].x += fImpulsoX; velocidadesNodos[indiceNodo].y += fImpulsoY;
                let iIzq1 = (indiceNodo - 1 + numNodos) % numNodos; let iDer1 = (indiceNodo + 1) % numNodos;
                velocidadesNodos[iIzq1].x += fImpulsoX * 0.6; velocidadesNodos[iIzq1].y += fImpulsoY * 0.6;
                velocidadesNodos[iDer1].x += fImpulsoX * 0.6; velocidadesNodos[iDer1].y += fImpulsoY * 0.6;
                let iIzq2 = (indiceNodo - 2 + numNodos) % numNodos; let iDer2 = (indiceNodo + 2) % numNodos;
                velocidadesNodos[iIzq2].x += fImpulsoX * 0.3; velocidadesNodos[iIzq2].y += fImpulsoY * 0.3;
                velocidadesNodos[iDer2].x += fImpulsoX * 0.3; velocidadesNodos[iDer2].y += fImpulsoY * 0.3;
            }
            p.vx = p.vx - 2 * productoEscalar * nx; p.vy = p.vy - 2 * productoEscalar * ny;
        }
        p.x = centroX + nx * (distanciaPared - radioParticula - 1); p.y = centroY + ny * (distanciaPared - radioParticula - 1);
    }
}

function alternarReproduccion() {
    if (!btnPlayPause) return;
    simulacionActiva = !simulacionActiva;
    if (simulacionActiva) {
        btnPlayPause.html(i18n.t("⏸ Pausar")); btnPlayPause.removeClass("estado-pausado"); loop(); 
    } else { btnPlayPause.html(i18n.t("▶ Reanudar")); btnPlayPause.addClass("estado-pausado"); noLoop(); }
}

function alternarPantallaCompleta() {
    if (!checkFullscreen) return;
    let contenedorGlobal = document.querySelector('.app-container');
    if (checkFullscreen.checked()) { if (contenedorGlobal && contenedorGlobal.requestFullscreen) { contenedorGlobal.requestFullscreen(); } }
    else { if (document.exitFullscreen) { document.exitFullscreen(); } }
}

function alternarMenuFlotante() {} // Depurada por migración a Drawer nativo lateral
function iniciarAccionContinuas(accion) { if (!simulacionActiva) return; accion(); if (temporizadorBoton === null) temporizadorBoton = setInterval(accion, 60); }
function detenerAccionContinuas() { if (temporizadorBoton !== null) { clearInterval(temporizadorBoton); temporizadorBoton = null; } }

function resolverChoquesParticulas() {
    for (let i = 0; i < particulas.length; i++) {
        for (let j = i + 1; j < particulas.length; j++) {
            let p1 = particulas[i]; let p2 = particulas[j];
            let dx = p2.x - p1.x; let dy = p2.y - p1.y;
            let distancia = sqrt(dx * dx + dy * dy);
            let distanciaMinima = (p1.vx === 0 && p2.vx === 0) ? 0 : radioParticula * 2;
            if (distancia < distanciaMinima && distanciaMinima > 0) {
                let sobreposicion = distanciaMinima - distancia;
                let nx = dx / (distancia || 1); let ny = dy / (distancia || 1);
                p1.x -= nx * (sobreposicion / 2); p1.y -= ny * (sobreposicion / 2);
                p2.x += nx * (sobreposicion / 2); p2.y += ny * (sobreposicion / 2);
                let rvx = p1.vx - p2.vx; let rvy = p1.vy - p2.vy; let productoEscalar = rvx * nx + rvy * ny;
                if (productoEscalar > 0) {
                    let impulsoX = productoEscalar * nx; let impulsoY = productoEscalar * ny;
                    p1.vx -= impulsoX; p1.vy -= impulsoY; p2.vx += impulsoX; p2.vy += impulsoY;
                }
            }
        }
    }
}

function gestionarParticulas(cantidadObjetivo, tempActual) {
    while (particulas.length < cantidadObjetivo) {
        let anguloPos = random(0, TWO_PI);
        let distanciaAleatoria = random(0, max(5, radioMedioObservado - radioParticula - 10));
        let magnitudVel = 0; let anguloVel = random(0, TWO_PI);
        if (tempActual > 0) magnitudVel = random(1.5, 3.5) * sqrt(tempActual / 300);
        particulas.push({
            x: centroX + distanciaAleatoria * cos(anguloPos), y: centroY + sin(anguloPos) * distanciaAleatoria,
            vx: magnitudVel * cos(anguloVel), vy: magnitudVel * sin(anguloVel)
        });
    }
    while (particulas.length > cantidadObjetivo) { particulas.pop(); }
}