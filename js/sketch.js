// Configuración del contenedor circular (Dinámico)
let centroX, centroY;
let radioContenedor = 120; 
let radioBase = 0;         
let velocidadRadio = 0;    
let impulsoAcumulado = 0;  

// Parámetros físicos de la membrana elástica estándar
let kElastica = 0.05;      
let amortiguacion = 0.12;  
let masaPared = 8;         

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
let simulacionActiva = true; // --- NUEVO: Estado de reproducción
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
    
    sliderParticulas = createSlider(1, 200, 50, 1);
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
    btnPlayPause = select('#play-pause-btn'); // --- NUEVO
    
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
    
    // El reloj de muestreo analítico se detiene automáticamente si el loop no corre
    if (millis() - ultimoTiempoMedido >= 1000) {
        choquesPorSegundo = choquesEnEsteSegundo;
        choquesEnEsteSegundo = 0;
        ultimoTiempoMedido = millis();
        
        let volumenCalculado = PI * radioContenedor * radioContenedor;
        historialPuntos.push({
            v: map(volumenCalculado, PI*25*25, PI*220*220, 50, 200),
            p: map(choquesPorSegundo, 0, 300, 500, 390)
        });
        
        if (historialPuntos.length > 35) historialPuntos.shift();
    }
    
    if (temperaturaActualInt !== temperaturaAnterior) {
        if (temperaturaActualInt === 0) {
            for (let i = 0; i < particulas.length; i++) {
                particulas[i].vx = 0; particulas[i].vy = 0;
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
    
    let volumenLitros = map(PI * radioContenedor * radioContenedor, PI*25*25, PI*220*220, 0.5, 5.0, true);
    let perimetro = TWO_PI * radioContenedor;
    let presionAtm = (choquesPorSegundo * 15) / perimetro;
    if (temperaturaActualInt === 0) presionAtm = 0; 
    
    if (mFrecuencia) mFrecuencia.html(choquesPorSegundo);
    if (mRadio) mRadio.html(nf(radioContenedor, 3, 1));
    if (mTotales) mTotales.html(totalChoques);
    if (mPresionFisica) mPresionFisica.html(nf(presionAtm, 1, 2));
    if (mVolumenFisico) mVolumenFisico.html(nf(volumenLitros, 1, 2));
    
    dibujarPlanoCartesiano();
    
    if (modoPared === 'flexible') {
        let fuerzaElastica = -kElastica * (radioContenedor - radioBase);
        let fuerzaAmortiguacion = -amortiguacion * velocidadRadio;
        let fuerzaTotal = impulsoAcumulado + fuerzaElastica + fuerzaAmortiguacion;
        
        let aceleracionRadio = fuerzaTotal / masaPared;
        velocidadRadio += aceleracionRadio;
        radioContenedor += velocidadRadio;
        
        let radioMinimoPermitido = radioParticula * 5;
        if (radioContenedor < radioMinimoPermitido) {
            radioContenedor = radioMinimoPermitido;
            velocidadRadio = 0;
        }
    } else {
        velocidadRadio = 0;
    }
    
    impulsoAcumulado = 0; 
    
    if (modoPared === 'flexible') {
        stroke(color(colorCirculoHex));
    } else {
        stroke(0, 200, 255);
    }
    strokeWeight(2.5);
    noFill();
    circle(centroX, centroY, radioContenedor * 2);
    
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        p.x += p.vx; p.y += p.vy;
        comprobarParedes(p);
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

function dibujarPlanoCartesiano() {
    fill(28, 28, 28);
    stroke(45);
    strokeWeight(1);
    rect(20, 360, 200, 160, 6);
    
    stroke(120);
    strokeWeight(1.5);
    line(50, 380, 50, 500);  
    line(50, 500, 200, 500); 
    
    noStroke();
    fill(180);
    textSize(11);
    textAlign(CENTER, CENTER);
    text("V", 208, 500);
    text("P", 50, 370);
    
    textSize(9);
    fill(100);
    textAlign(LEFT);
    text("GRÁFICA TERMODINÁMICA", 55, 392);
    
    noFill();
    stroke(0, 200, 255);
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < historialPuntos.length; i++) {
        let pt = historialPuntos[i];
        vertex(constrain(pt.v, 50, 200), constrain(pt.p, 380, 500));
    }
    endShape();
    
    if (historialPuntos.length > 0) {
        let ultimoPunto = historialPuntos[historialPuntos.length - 1];
        fill(255, 200, 0);
        noStroke();
        circle(constrain(ultimoPunto.v, 50, 200), constrain(ultimoPunto.p, 380, 500), 7);
    }
}

// --- NUEVO: Función de control de la línea de tiempo ---
function alternarReproduccion() {
    if (!btnPlayPause) return;
    
    simulacionActiva = !simulacionActiva;
    
    if (simulacionActiva) {
        btnPlayPause.html("⏸ Pausar");
        btnPlayPause.removeClass("estado-pausado");
        loop(); // Reanuda el motor gráfico de p5.js
    } else {
        btnPlayPause.html("▶ Reanudar");
        btnPlayPause.addClass("estado-pausado");
        noLoop(); // Congela el motor gráfico de p5.js de forma asíncrona
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
    if (!simulacionActiva) return; // Bloquear interacción en pausa
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
    let radioMinimoPermitido = radioParticula * 5;
    radioContenedor = constrain(radioContenedor + cambio, radioMinimoPermitido, 210); 
    if (elemRadioView) elemRadioView.html(int(radioContenedor));
}

function actualizarModoPared() {
    if (!selectPared) return;
    modoPared = selectPared.value();
    if (modoPared === 'fija') {
        if (wrapperRadioManual) wrapperRadioManual.removeClass('hidden');
        if (elemRadioView) elemRadioView.html(int(radioContenedor));
    } else {
        if (wrapperRadioManual) wrapperRadioManual.addClass('hidden');
    }
    historialPuntos = []; 
}

function comprobarParedes(p) {
    let distX = p.x - centroX; let distY = p.y - centroY;
    let distancia = sqrt(distX * distX + distY * distY);
    
    if (distancia >= radioContenedor - radioParticula) {
        let nx = distX / distancia; let ny = distY / distancia;
        let productoEscalar = p.vx * nx + p.vy * ny;
        
        if (productoEscalar > 0) {
            impulsoAcumulado += 2 * productoEscalar; 
            totalChoques++; 
            choquesEnEsteSegundo++;
            
            p.vx = p.vx - 2 * productoEscalar * nx;
            p.vy = p.vy - 2 * productoEscalar * ny;
        }
        p.x = centroX + nx * (radioContenedor - radioParticula);
        p.y = centroY + ny * (radioContenedor - radioParticula);
    }
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
        let distanciaAleatoria = random(0, max(5, radioContenedor - radioParticula - 5));
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