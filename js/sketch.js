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

// Propiedades de las partículas (Dinamizadas a 3px de inicio)
let radioParticula = 3;    
let colorParticulaHex = "#00c8ff";
let colorCirculoHex = "#ff4646";
let particulas = [];

// Contadores de choques
let totalChoques = 0;
let choquesEnEsteSegundo = 0;
let choquesPorSegundo = 0;
let ultimoTiempoMedido = 0; 

// Inicialización termodinámica de inicio a 273K
let temperaturaActualInt = 273;
let temperaturaAnterior = 273; 

// Gestión del modo de pared y estados
let modoPared = 'flexible'; 
let temporizadorBoton = null;
let simulacionActiva = true; 
let historialPuntos = []; 

// Referencias de elementos HTML
let sliderParticulas, sliderTamaño, checkTermografico, checkFullscreen, btnPlayPause;
let pickerColor, elemColorHex, pickerColorCirculo, elemColorCirculoHex;
let elemTempView, elemUnidadView, checkEscalaTemp, elemRadioView, wrapperRadioManual, selectPared;
let mFrecuencia, mRadio, mTotales, lblParticleVal, lblSizeVal;
let mPresionFisica, mVolumenFisico;

function setup() {
    let canvas = createCanvas(540, 540);
    canvas.parent('canvas-container');
    
    centroX = width / 2 + 40;
    centroY = height / 2 - 40;
    
    inicializarMembranaPura();
    
    // CORRECCIÓN: Rango del deslizador ampliado de 1 a 500 partículas
    sliderParticulas = createSlider(1, 500, 50, 1);
    sliderParticulas.parent('particle-slider-container');
    
    sliderTamaño = createSlider(1, 15, 3, 1); 
    sliderTamaño.parent('size-slider-container');
    
    // Mapear elementos del DOM
    elemTempView = select('#input-temp-view');
    elemUnidadView = select('#unit-temp-view');
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
    
    mFrecuencia = select('#metric-frecuencia');
    mRadio = select('#metric-radio');
    mTotales = select('#metric-totales');
    mPresionFisica = select('#metric-presion-fisica');
    mVolumenFisico = select('#metric-volumen-fisico');
    lblParticleVal = select('#particle-val');
    lblSizeVal = select('#size-val');
    
    if (selectPared) selectPared.changed(actualizarModoPared);
    if (checkEscalaTemp) checkEscalaTemp.changed(renderizarValorTemperatura); 
    if (checkFullscreen) checkFullscreen.changed(alternarPantallaCompleta); 
    
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && checkFullscreen) {
            checkFullscreen.checked(false);
        }
    });
    
    ultimoTiempoMedido = millis();
    gestionarParticulas(sliderParticulas.value(), temperaturaActualInt);
}

function inicializarMembranaPura() {
    posicionesNodos = [];
    velocidadesNodos = [];
    fuerzasNodos = [];
    for (let i = 0; i < numNodos; i++) {
        let angulo = map(i, 0, numNodos, 0, TWO_PI);
        posicionesNodos.push({
            x: centroX + cos(angulo) * radioOriginalReposito,
            y: centroY + sin(angulo) * radioOriginalReposito
        });
        velocidadesNodos.push({ x: 0, y: 0 });
        fuerzasNodos.push({ x: 0, y: 0 });
    }
}

function draw() {
    background(20); 
    
    let cantidadDeseada = sliderParticulas.value();
    if (lblParticleVal) lblParticleVal.html(cantidadDeseada);
    
    radioParticula = sliderTamaño.value();
    if (lblSizeVal) lblSizeVal.html(radioParticula + " px");
    
    if (pickerColor && elemColorHex) {
        colorParticulaHex = pickerColor.value();
        elemColorHex.html(colorParticulaHex.toUpperCase());
    }
    if (pickerColorCirculo && elemColorCirculoHex) {
        colorCirculoHex = pickerColorCirculo.value();
        elemColorCirculoHex.html(colorCirculoHex.toUpperCase());
    }
    
    gestionarParticulas(cantidadDeseada, temperaturaActualInt);
    
    let areaPoligono = 0;
    for (let i = 0; i < numNodos; i++) {
        let siguiente = (i + 1) % numNodos;
        areaPoligono += (posicionesNodos[i].x - centroX) * (posicionesNodos[siguiente].y - centroY) - 
                        (posicionesNodos[siguiente].x - centroX) * (posicionesNodos[i].y - centroY);
    }
    areaPoligono = abs(areaPoligono) / 2;
    
    let radioMedioObservado = 0;
    for (let i = 0; i < numNodos; i++) {
        radioMedioObservado += dist(centroX, centroY, posicionesNodos[i].x, posicionesNodos[i].y);
    }
    radioMedioObservado /= numNodos;

    if (millis() - ultimoTiempoMedido >= 1000) {
        choquesPorSegundo = choquesEnEsteSegundo;
        choquesEnEsteSegundo = 0;
        ultimoTiempoMedido = millis();
        
        historialPuntos.push({
            v: map(areaPoligono, PI*25*25, PI*220*220, 50, 200),
            p: map(choquesPorSegundo, 0, 300, 500, 390)
        });
        if (historialPuntos.length > 35) historialPuntos.shift();
    }
    
    if (temperaturaActualInt !== temperaturaAnterior) {
        if (temperaturaActualInt === 0) {
            for (let i = 0; i < particulas.length; i++) { 
                particulas[i].vx = 0; 
                particulas[i].vy = 0; 
            }
        } else if (temperaturaAnterior === 0) {
            for (let i = 0; i < particulas.length; i++) {
                let magnitudVel = random(1.5, 3.5) * sqrt(temperaturaActualInt / 300);
                let anguloVel = random(0, TWO_PI);
                particulas[i].vx = magnitudVel * cos(anguloVel);
                particulas[i].vy = magnitudVel * sin(anguloVel);
            }
        } else {
            let factorEscala = sqrt(temperaturaActualInt / temperaturaAnterior);
            for (let i = 0; i < particulas.length; i++) {
                particulas[i].vx *= factorEscala;
                particulas[i].vy *= factorEscala;
            }
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
    
    dibujarPlanoCartesiano();
    
    if (modoPared === 'flexible') {
        for (let i = 0; i < numNodos; i++) {
            let nAct = posicionesNodos[i];
            
            let dxCentro = nAct.x - centroX;
            let dyCentro = nAct.y - centroY;
            let distCentro = sqrt(dxCentro * dxCentro + dyCentro * dyCentro) || 1;
            let nx = dxCentro / distCentro;
            let ny = dyCentro / distCentro;
            
            let nIzq = posicionesNodos[(i - 1 + numNodos) % numNodos];
            let nDer = posicionesNodos[(i + 1) % numNodos];
            let fMuelleX = (nIzq.x - nAct.x) * kEstructuraMalla + (nDer.x - nAct.x) * kEstructuraMalla;
            let fMuelleY = (nIzq.y - nAct.y) * kEstructuraMalla + (nDer.y - nAct.y) * kEstructuraMalla;
            
            let deltaRadioReposito = distCentro - radioOriginalReposito;
            let fRestauracionX = -nx * deltaRadioReposito * kRecuperacionForma;
            let fRestauracionY = -ny * deltaRadioReposito * kRecuperacionForma;
            
            let fTotalAcumuladaX = fMuelleX + fRestauracionX;
            let fTotalAcumuladaY = fMuelleY + fRestauracionY;
            
            let fuerzaProyectadaEscalar = (fTotalAcumuladaX * nx) + (fTotalAcumuladaY * ny);
            
            fuerzasNodos[i].x += nx * fuerzaProyectadaEscalar;
            fuerzasNodos[i].y += ny * fuerzaProyectadaEscalar;
            
            velocidadesNodos[i].x += fuerzasNodos[i].x;
            velocidadesNodos[i].y += fuerzasNodos[i].y;
            
            velocidadesNodos[i].x *= amortiguacionMalla;
            velocidadesNodos[i].y *= amortiguacionMalla;
            
            nAct.x += velocidadesNodos[i].x;
            nAct.y += velocidadesNodos[i].y;
            
            fuerzasNodos[i].x = 0;
            fuerzasNodos[i].y = 0;
        }
    } else {
        for (let i = 0; i < numNodos; i++) {
            let angulo = map(i, 0, numNodos, 0, TWO_PI);
            posicionesNodos[i].x = centroX + cos(angulo) * radioOriginalReposito;
            posicionesNodos[i].y = centroY + sin(angulo) * radioOriginalReposito;
            velocidadesNodos[i].x = 0;
            velocidadesNodos[i].y = 0;
        }
    }
    
    if (modoPared === 'flexible') {
        stroke(46, 204, 113, 180); 
        strokeWeight(1.0);         
        noFill();
        circle(centroX, centroY, radioMedioObservado * 2);
    }

    if (modoPared === 'flexible') {
        stroke(color(colorCirculoHex));
    } else {
        stroke(0, 200, 255);
    }
    strokeWeight(2.5);
    noFill();
    beginShape();
    for (let i = 0; i < numNodos; i++) {
        vertex(posicionesNodos[i].x, posicionesNodos[i].y);
    }
    endShape(CLOSE);
    
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        p.x += p.vx; p.y += p.vy;
        comprobarParedesLocalesPuras(p);
    }
    
    resolverChoquesParticulas();
    
    let colorFijo = color(colorParticulaHex);
    let colorFrio = color(0, 100, 255); 
    let colorCaliente = color(255, 50, 50); 
    
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        if (checkTermografico && checkTermografico.checked()) {
            let vInstantanea = sqrt(p.vx * p.vx + p.vy * p.vy);
            let factorTermo = map(vInstantanea, 0, 6, 0, 1, true);
            fill(lerpColor(colorFrio, colorCaliente, factorTermo));
        } else {
            fill(colorFijo);
        }
        noStroke();
        circle(p.x, p.y, radioParticula * 2);
    }
}

function comprobarParedesLocalesPuras(p) {
    let dxCentro = p.x - centroX;
    let dyCentro = p.y - centroY;
    let distanciaAlCentro = sqrt(dxCentro * dxCentro + dyCentro * dyCentro) || 1;
    
    let anguloParticula = atan2(dyCentro, dxCentro);
    if (anguloParticula < 0) anguloParticula += TWO_PI;
    
    let indiceNodo = floor(map(anguloParticula, 0, TWO_PI, 0, numNodos)) % numNodos;
    
    let nodoMalla = posicionesNodos[indiceNodo];
    let dxPared = nodoMalla.x - centroX;
    let dyPared = nodoMalla.y - centroY;
    let distanciaPared = sqrt(dxPared * dxPared + dyPared * dyPared);
    
    if (distanciaAlCentro >= distanciaPared - radioParticula) {
        let nx = dxCentro / distanciaAlCentro;
        let ny = dyCentro / distanciaAlCentro;
        let productoEscalar = p.vx * nx + p.vy * ny;
        
        if (productoEscalar > 0) {
            totalChoques++; 
            choquesEnEsteSegundo++;
            
            if (modoPared === 'flexible') {
                let fImpulsoX = nx * productoEscalar * 1.6;
                let fImpulsoY = ny * productoEscalar * 1.6;
                
                velocidadesNodos[indiceNodo].x += fImpulsoX;
                velocidadesNodos[indiceNodo].y += fImpulsoY;
                
                let iIzq1 = (indiceNodo - 1 + numNodos) % numNodos;
                let iDer1 = (indiceNodo + 1) % numNodos;
                velocidadesNodos[iIzq1].x += fImpulsoX * 0.6;
                velocidadesNodos[iIzq1].y += fImpulsoY * 0.6;
                velocidadesNodos[iDer1].x += fImpulsoX * 0.6;
                velocidadesNodos[iDer1].y += fImpulsoY * 0.6;
                
                let iIzq2 = (indiceNodo - 2 + numNodos) % numNodos;
                let iDer2 = (indiceNodo + 2) % numNodos;
                velocidadesNodos[iIzq2].x += fImpulsoX * 0.3;
                velocidadesNodos[iIzq2].y += fImpulsoY * 0.3;
                velocidadesNodos[iDer2].x += fImpulsoX * 0.3;
                velocidadesNodos[iDer2].y += fImpulsoY * 0.3;
            }
            
            p.vx = p.vx - 2 * productoEscalar * nx;
            p.vy = p.vy - 2 * productoEscalar * ny;
        }
        
        p.x = centroX + nx * (distanciaPared - radioParticula - 1);
        p.y = centroY + ny * (distanciaPared - radioParticula - 1);
    }
}

function dibujarPlanoCartesiano() {
    fill(28, 28, 28); stroke(45); strokeWeight(1);
    rect(20, 360, 200, 160, 6);
    
    stroke(120); strokeWeight(1.5);
    line(50, 380, 50, 500); line(50, 500, 200, 500); 
    
    noStroke(); fill(180); textSize(11); textAlign(CENTER, CENTER);
    text("V", 208, 500); text("P", 50, 370);
    
    textSize(9); fill(100); textAlign(LEFT);
    text("GRÁFICA TERMODINÁMICA", 55, 392);
    
    noFill(); stroke(0, 200, 255); strokeWeight(2);
    beginShape();
    for (let i = 0; i < historialPuntos.length; i++) {
        let pt = historialPuntos[i];
        vertex(constrain(pt.v, 50, 200), constrain(pt.p, 380, 500));
    }
    endShape();
    
    if (historialPuntos.length > 0) {
        let ultimoPunto = historialPuntos[historialPuntos.length - 1];
        fill(255, 200, 0); noStroke();
        circle(constrain(ultimoPunto.v, 50, 200), constrain(ultimoPunto.p, 380, 500), 7);
    }
}

function alternarReproduccion() {
    if (!btnPlayPause) return;
    simulacionActiva = !simulacionActiva;
    if (simulacionActiva) {
        btnPlayPause.html("⏸ Pausar");
        btnPlayPause.removeClass("estado-pausado");
        loop(); 
    } else {
        btnPlayPause.html("▶ Reanudar");
        btnPlayPause.addClass("estado-pausado");
        noLoop(); 
    }
}

function alternarPantallaCompleta() {
    if (!checkFullscreen) return;
    let contenedorGlobal = document.querySelector('.app-container');
    if (checkFullscreen.checked()) {
        if (contenedorGlobal && contenedorGlobal.requestFullscreen) {
            contenedorGlobal.requestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function alternarMenuFlotante() {
    let menu = select('#floating-menu');
    if (menu) {
        if (menu.hasClass('hidden')) menu.removeClass('hidden');
        else menu.addClass('hidden');
    }
}

function iniciarAccionContinuas(accion) {
    if (!simulacionActiva) return;
    accion(); 
    if (temporizadorBoton === null) temporizadorBoton = setInterval(accion, 60); 
}

function detenerAccionContinuas() {
    if (temporizadorBoton !== null) {
        clearInterval(temporizadorBoton); temporizadorBoton = null;
    }
}

function ajustarTemperatura(cambio) {
    if (!simulacionActiva) return;
    temperaturaActualInt = constrain(temperaturaActualInt + cambio, 0, 500);
    renderizarValorTemperatura();
}

function renderizarValorTemperatura() {
    if (!elemTempView || !elemUnidadView) return;
    if (checkEscalaTemp && checkEscalaTemp.checked()) {
        let tempCelsius = temperaturaActualInt - 273;
        elemTempView.html(tempCelsius);
        elemUnidadView.html("ºC");
    } else {
        elemTempView.html(temperaturaActualInt);
        elemUnidadView.html("K");
    }
}

function ajustarRadioManual(cambio) {
    if (!simulacionActiva) return;
    radioOriginalReposito = constrain(radioOriginalReposito + cambio, 30, 210); 
    if (elemRadioView) elemRadioView.html(int(radioOriginalReposito));
}

function actualizarModoPared() {
    if (!selectPared) return;
    modoPared = selectPared.value();
    if (modoPared === 'fija') {
        if (wrapperRadioManual) wrapperRadioManual.removeClass('hidden');
        if (elemRadioView) elemRadioView.html(int(radioOriginalReposito));
    } else {
        if (wrapperRadioManual) wrapperRadioManual.addClass('hidden');
    }
    historialPuntos = []; 
}

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
                
                let rvx = p1.vx - p2.vx; let rvy = p1.vy - p2.vy;
                let productoEscalar = rvx * nx + rvy * ny;
                
                if (productoEscalar > 0) {
                    let impulsoX = productoEscalar * nx; let impulsoY = productoEscalar * ny;
                    p1.vx -= impulsoX; p1.vy -= impulsoY;
                    p2.vx += impulsoX; p2.vy += impulsoY;
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
            x: centroX + distanciaAleatoria * cos(anguloPos),
            y: centroY + distanciaAleatoria * sin(anguloPos),
            vx: magnitudVel * cos(anguloVel), vy: magnitudVel * sin(anguloVel)
        });
    }
    while (particulas.length > cantidadObjetivo) {
        particulas.pop();
    }
}