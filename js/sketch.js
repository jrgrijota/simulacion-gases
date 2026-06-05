// Configuración de la Membrana Discreta (Malla de Nodos Pura)
let centroX, centroY;
let numNodos = 60;               // Resolución perimetral de la membrana
let posicionesNodos = [];         // Coordenadas actuales {x, y}
let velocidadesNodos = [];        // Componentes de velocidad {x, y}
let fuerzasNodos = [];            // Componentes de fuerza {x, y}

// Parámetros Físicos Ajustados (Menor Rigidez y Radio Inicial)
let radioOriginalReposito = 90;   // Radio inicial menor para favorecer expansión
let kEstructuraMalla = 0.15;      // Cohesión elástica lateral entre nodos contiguos
let kRecuperacionForma = 0.02;    // Paredes menos rígidas (tensión de látex reducida)
let amortiguacionMalla = 0.86;    // Filtro viscoso de estabilidad
let radioMedioObservado = 90;     // Métrica de cálculo en tiempo real

// Propiedades de las partículas (Dinamizadas a 3px de inicio)
let radioParticula = 3;    
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
    let canvas = createCanvas(540, 540);
    canvas.parent('canvas-container');
    
    centroX = width / 2;
    centroY = height / 2;
    
    inicializarMembranaPura();
    
    sliderParticulas = createSlider(1, 500, 50, 1);
    sliderParticulas.parent('particle-slider-container');
    
    sliderTemperatura = createSlider(0, 500, 273, 1);
    sliderTemperatura.parent('temp-slider-container');
    
    sliderTamaño = createSlider(1, 15, 3, 1); 
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
    background(20); 
    
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
        choquesPorSegundo = choquesEnEsteSegundo; choquesEnEsteSegundo = 0; ultimoTiempoMedido = millis();
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
    
    let volumenLitros = map(areaPoligono, PI*25*25, PI*220*220, 0.5, 5.0, true);
    let perimetroEstimado = TWO_PI * radioMedioObservado;
    let presionAtm = (choquesPorSegundo * 15) / perimetroEstimado;
    if (temperaturaActualInt === 0) presionAtm = 0; 
    
    if (mFrecuencia) mFrecuencia.html(choquesPorSegundo);
    if (mRadio) mRadio.html(nf(radioMedioObservado, 3, 1));
    if (mTotales) mTotales.html(totalChoques);
    if (mPresionFisica) mPresionFisica.html(nf(presionAtm, 1, 2));
    if (mVolumenFisico) mVolumenFisico.html(nf(volumenLitros, 1, 2));
    
    sumaPresionParaMedia += presionAtm; sumaVolumenParaMedia += areaPoligono; cantidadMuestrasFrame++;

    if (millis() - ultimoTiempoGrafica >= 3000) {
        if (cantidadMuestrasFrame > 0) {
            let mediaPresion = sumaPresionParaMedia / cantidadMuestrasFrame; 
            let mediaArea = sumaVolumenParaMedia / cantidadMuestrasFrame;
            historialPuntos.push({
                v: map(mediaArea, PI*25*25, PI*220*220, 50, 200),
                p: map(mediaPresion * perimetroEstimado / 15, 0, 300, 500, 390) 
            });
            if (historialPuntos.length > 35) historialPuntos.shift();
        }
        sumaPresionParaMedia = 0; sumaVolumenParaMedia = 0; cantidadMuestrasFrame = 0;
        ultimoTiempoGrafica = millis();
    }

    if (checkMostrarGrafica && checkMostrarGrafica.checked()) {
        dibujarPlanoCartesiano();
    }
    
    if (modoPared === 'flexible') {
        for (let i = 0; i < numNodos; i++) {
            let nAct = posicionesNodos[i];
            let dxCentro = nAct.x - centroX; let dyCentro = nAct.y - centroY;
            let distCentro = sqrt(dxCentro * dxCentro + dyCentro * dyCentro) || 1;
            let nx = dxCentro / distCentro; let ny = dyCentro / distCentro;
            
            let nIzq = posicionesNodos[(i - 1 + numNodos) % numNodos];
            let nDer = posicionesNodos[(i + 1) % numNodos];
            let fMuelleX = (nIzq.x - nAct.x) * kEstructuraMalla + (nDer.x - nAct.x) * kEstructuraMalla;
            let fMuelleY = (nIzq.y - nAct.y) * kEstructuraMalla + (nDer.y - nAct.y) * kEstructuraMalla;
            
            let deltaRadioReposito = distCentro - radioOriginalReposito;
            let fRestauracionX = -nx * deltaRadioReposito * kRecuperacionForma;
            let fRestauracionY = -ny * deltaRadioReposito * kRecuperacionForma;
            
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
            posicionesNodos[i].x = centroX + cos(angulo) * radioOriginalReposito;
            posicionesNodos[i].y = centroY + sin(angulo) * radioOriginalReposito;
            velocidadesNodos[i].x = 0; velocidadesNodos[i].y = 0;
        }
    }
    
    if (modoPared === 'flexible') {
        stroke(color(colorPromedioHex)); strokeWeight(1.2); noFill();
        if (formatoPromedio === "punteado") { drawingContext.setLineDash([4, 6]); }
        circle(centroX, centroY, radioMedioObservado * 2);
        if (formatoPromedio === "punteado") { drawingContext.setLineDash([]); }
    }

    if (modoPared === 'flexible') { stroke(color(colorCirculoHex)); } else { stroke(0, 200, 255); }
    strokeWeight(2.5); noFill();
    beginShape();
    for (let i = 0; i < numNodos; i++) { vertex(posicionesNodos[i].x, posicionesNodos[i].y); }
    endShape(CLOSE);
    
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i]; p.x += p.vx; p.y += p.vy; comprobarParedesLocalesPuras(p);
    }
    resolverChoquesParticulas();
    
    let colorFijo = color(colorParticulaHex);
    let colorFrio = color(0, 100, 255); let colorCaliente = color(255, 50, 50); 
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        if (checkTermografico && checkTermografico.checked()) {
            let vInstantanea = sqrt(p.vx * p.vx + p.vy * p.vy);
            let factorTermo = map(vInstantanea, 0, 6, 0, 1, true);
            fill(lerpColor(colorFrio, colorCaliente, factorTermo));
        } else { fill(colorFijo); }
        noStroke(); circle(p.x, p.y, radioParticula * 2);
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
    if (checkEscalaTemp && checkEscalaTemp.checked()) { lblTempMin.html("-273 ºC"); lblTempMax.html("227 ºC"); }
    else { lblTempMin.html("0 K"); lblTempMax.html("500 K"); }
}
function renderizarValorTemperatura() {
    if (!inputDirectTemp || !elemUnidadView) return;
    if (checkEscalaTemp && checkEscalaTemp.checked()) { inputDirectTemp.value(temperaturaActualInt - 273); elemUnidadView.html("ºC"); }
    else { inputDirectTemp.value(temperaturaActualInt); elemUnidadView.html("K"); }
}
function actualizarEstiloSliderTemperatura() {
    if (!sliderTemperatura) return;
    sliderTemperatura.elt.style.background = `linear-gradient(to right, #0077ff, #ff3300)`;
}

function dibujarPlanoCartesiano() {
    fill(28, 28, 28); stroke(45); strokeWeight(1); rect(20, 360, 200, 160, 6);
    stroke(38); strokeWeight(1);
    for(let x = 80; x < 200; x += 35)  line(x, 380, x, 500);
    for(let y = 410; y < 500; y += 30) line(50, y, 200, y);
    stroke(120); strokeWeight(1.5); line(50, 380, 50, 500); line(50, 500, 200, 500); 
    noStroke(); fill(180); textSize(11); textAlign(CENTER, CENTER); text("V", 208, 500); text("P", 50, 370);
    //textSize(9); fill(100); textAlign(LEFT); text("GRÁFICA TERMODINÁMICA (3s)", 55, 392);
    
    noFill(); stroke(0, 200, 255); strokeWeight(2); beginShape();
    for (let i = 0; i < historialPuntos.length; i++) { vertex(constrain(historialPuntos[i].v, 50, 200), constrain(historialPuntos[i].p, 380, 500)); }
    endShape();
    
    if (historialPuntos.length > 0) {
        let uP = historialPuntos[historialPuntos.length - 1];
        let px = constrain(uP.v, 50, 200); let py = constrain(uP.p, 380, 500);
        stroke(0, 200, 255, 90); strokeWeight(1); drawingContext.setLineDash([4, 4]);
        line(px, py, 50, py); line(px, py, px, 500); drawingContext.setLineDash([]);
        fill(255, 200, 0); noStroke(); circle(px, py, 7);
    }
}

function actualizarModoPared() {
    if (!selectPared) return;
    modoPared = selectPared.value();
    if (modoPared === 'fija') {
        radioOriginalReposito = constrain(int(radioMedioObservado), 30, 210);
        if (wrapperRadioManual) wrapperRadioManual.removeClass('hidden');
        if (elemRadioView) elemRadioView.html(int(radioOriginalReposito));
        if (wrapperColorPromedio) wrapperColorPromedio.addClass('hidden');
        if (wrapperFormatPromedio) wrapperFormatPromedio.addClass('hidden');
    } else { 
        if (wrapperRadioManual) wrapperRadioManual.addClass('hidden'); 
        if (wrapperColorPromedio) wrapperColorPromedio.removeClass('hidden');
        if (wrapperFormatPromedio) wrapperFormatPromedio.removeClass('hidden');
    }
    historialPuntos = []; 
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
        btnPlayPause.html("⏸ Pausar"); btnPlayPause.removeClass("estado-pausado"); loop(); 
    } else { btnPlayPause.html("▶ Reanudar"); btnPlayPause.addClass("estado-pausado"); noLoop(); }
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
        let distanciaAleatoria = random(0, max(5, radioOriginalReposito - radioParticula - 10));
        let magnitudVel = 0; let anguloVel = random(0, TWO_PI);
        if (tempActual > 0) magnitudVel = random(1.5, 3.5) * sqrt(tempActual / 300);
        particulas.push({
            x: centroX + distanciaAleatoria * cos(anguloPos), y: centroY + sin(anguloPos) * distanciaAleatoria,
            vx: magnitudVel * cos(anguloVel), vy: magnitudVel * sin(anguloVel)
        });
    }
    while (particulas.length > cantidadObjetivo) { particulas.pop(); }
}