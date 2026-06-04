// Configuración del contenedor circular (Dinámico)
let centroX, centroY;
let radioContenedor = 120; 
let radioBase = 0;         
let velocidadRadio = 0;    
let impulsoAcumulado = 0;  

// Parámetros físicos de la membrana
let kElastica = 0.05;      
let amortiguacion = 0.12;  
let masaPared = 8;         

// Propiedades de las partículas (Dinamizadas)
let radioParticula = 5;    
let colorParticulaHex = "#00c8ff";
let colorCirculoHex = "#ff4646";
let particulas = [];

// Contadores de choques
let totalChoques = 0;
let choquesEnEsteSegundo = 0;
let choquesPorSegundo = 0;
let ultimoTiempoMedido = 0; 

// Variables globales de control térmico interno
let temperaturaActualInt = 0;
let temperaturaAnterior = 0; 

// Gestión del modo de pared
let modoPared = 'flexible'; 

// Variable global para controlar la repetición de los botones
let temporizadorBoton = null;

// Referencias de elementos HTML
let sliderParticulas;
let sliderTamaño;
let pickerColor, elemColorHex;
let pickerColorCirculo, elemColorCirculoHex;
let elemTempView, elemRadioView, wrapperRadioManual, selectPared;
let mFrecuencia, mRadio, mTotales, lblParticleVal, lblSizeVal;

function setup() {
    let canvas = createCanvas(540, 540);
    canvas.parent('canvas-container');
    
    centroX = width / 2;
    centroY = height / 2;
    
    // Inicializar deslizadores nativos en sus contenedores (Mínimo de tamaño configurado a 1 px)
    sliderParticulas = createSlider(1, 200, 50, 1);
    sliderParticulas.parent('particle-slider-container');
    
    sliderTamaño = createSlider(1, 15, 5, 1);
    sliderTamaño.parent('size-slider-container');
    
    // Mapear elementos del DOM
    elemTempView = select('#input-temp-view');
    elemRadioView = select('#input-radio-view');
    wrapperRadioManual = select('#wrapper-radio-manual');
    selectPared = select('#select-pared');
    
    pickerColor = select('#color-picker-particula');
    elemColorHex = select('#color-hex-val');
    
    pickerColorCirculo = select('#color-picker-circulo');
    elemColorCirculoHex = select('#color-circulo-hex-val');
    
    mFrecuencia = select('#metric-frecuencia');
    mRadio = select('#metric-radio');
    mTotales = select('#metric-totales');
    lblParticleVal = select('#particle-val');
    lblSizeVal = select('#size-val');
    
    selectPared.changed(actualizarModoPared);
    
    ultimoTiempoMedido = millis();
}

function draw() {
    background(20); 
    
    // Sincronización de variables desde la interfaz HTML
    let cantidadDeseada = sliderParticulas.value();
    lblParticleVal.html(cantidadDeseada);
    
    radioParticula = sliderTamaño.value();
    lblSizeVal.html(radioParticula + " px");
    
    colorParticulaHex = pickerColor.value();
    elemColorHex.html(colorParticulaHex.toUpperCase());
    
    colorCirculoHex = pickerColorCirculo.value();
    elemColorCirculoHex.html(colorCirculoHex.toUpperCase());
    
    gestionarParticulas(cantidadDeseada, temperaturaActualInt);
    
    if (millis() - ultimoTiempoMedido >= 1000) {
        choquesPorSegundo = choquesEnEsteSegundo;
        choquesEnEsteSegundo = 0;
        ultimoTiempoMedido = millis();
    }
    
    // Modificación de velocidad molecular
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
    
    // Inyección de datos en la UI
    mFrecuencia.html(choquesPorSegundo);
    mRadio.html(nf(radioContenedor, 3, 1));
    mTotales.html(totalChoques);
    
    // Dinámica según modo de pared
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
    
    // Renderizado del Contenedor Circular con Color Dinámico (Solo en Flexible muta según impactos si se desea, aquí fijado por el Picker)
    if (modoPared === 'flexible') {
        stroke(color(colorCirculoHex));
    } else {
        stroke(0, 200, 255); // Azul fijo en Modo Rígido para diferenciar comportamientos
    }
    strokeWeight(2.5);
    noFill();
    circle(centroX, centroY, radioContenedor * 2);
    
    // Actualización de posiciones y colisión con paredes
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        p.x += p.vx;
        p.y += p.vy;
        comprobarParedes(p);
    }
    
    resolverChoquesParticulas();
    
    // Renderizado de partículas con color dinámico
    let colorP5 = color(colorParticulaHex);
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        fill(colorP5);
        noStroke();
        circle(p.x, p.y, radioParticula * 2);
    }
}

// --- INTERFAZ DE USUARIO: DESPLEGABLE FLOTANTE ---

function alternarMenuFlotante() {
    let menu = select('#floating-menu');
    if (menu.hasClass('hidden')) {
        menu.removeClass('hidden');
    } else {
        menu.addClass('hidden');
    }
}

// --- FUNCIONES DE ACCIÓN CONTINUA ---

function iniciarAccionContinuas(accion) {
    accion(); 
    if (temporizadorBoton === null) {
        temporizadorBoton = setInterval(accion, 60); 
    }
}

function detenerAccionContinuas() {
    if (temporizadorBoton !== null) {
        clearInterval(temporizadorBoton);
        temporizadorBoton = null;
    }
}

function ajustarTemperatura(cambio) {
    temperaturaActualInt = constrain(temperaturaActualInt + cambio, 0, 500);
    if (elemTempView) elemTempView.html(temperaturaActualInt);
}

function ajustarRadioManual(cambio) {
    let radioMinimoPermitido = radioParticula * 5;
    radioContenedor = constrain(radioContenedor + cambio, radioMinimoPermitido, 260);
    if (elemRadioView) elemRadioView.html(int(radioContenedor));
}

function actualizarModoPared() {
    modoPared = selectPared.value();
    if (modoPared === 'fija') {
        wrapperRadioManual.removeClass('hidden');
        elemRadioView.html(int(radioContenedor));
    } else {
        wrapperRadioManual.addClass('hidden');
    }
}

// --- NÚCLEO FÍSICO ---

function comprobarParedes(p) {
    let distX = p.x - centroX;
    let distY = p.y - centroY;
    let distancia = sqrt(distX * distX + distY * distY);
    
    if (distancia >= radioContenedor - radioParticula) {
        let nx = distX / distancia;
        let ny = distY / distancia;
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
            let p1 = particulas[i];
            let p2 = particulas[j];
            
            let dx = p2.x - p1.x;
            let dy = p2.y - p1.y;
            let distancia = sqrt(dx * dx + dy * dy);
            let distanciaMinima = (p1.vx === 0 && p2.vx === 0) ? 0 : radioParticula * 2; 
            
            if (distancia < distanciaMinima && distanciaMinima > 0) {
                let sobreposicion = distanciaMinima - distancia;
                let nx = dx / (distancia || 1); 
                let ny = dy / (distancia || 1);
                
                p1.x -= nx * (sobreposicion / 2);
                p1.y -= ny * (sobreposicion / 2);
                p2.x += nx * (sobreposicion / 2);
                p2.y += ny * (sobreposicion / 2);
                
                let rvx = p1.vx - p2.vx;
                let rvy = p1.vy - p2.vy;
                let productoEscalar = rvx * nx + rvy * ny;
                
                if (productoEscalar > 0) {
                    let impulsoX = productoEscalar * nx;
                    let impulsoY = productoEscalar * ny;
                    
                    p1.vx -= impulsoX;
                    p1.vy -= impulsoY;
                    p2.vx += impulsoX;
                    p2.vy += impulsoY;
                }
            }
        }
    }
}

function gestionarParticulas(cantidadObjetivo, tempActual) {
    while (particulas.length < cantidadObjetivo) {
        let anguloPos = random(0, TWO_PI);
        let distanciaAleatoria = random(0, max(5, radioContenedor - radioParticula - 5));
        
        let magnitudVel = 0;
        let anguloVel = random(0, TWO_PI);
        
        if (tempActual > 0) {
            magnitudVel = random(1.5, 3.5) * sqrt(tempActual / 300);
        }
        
        particulas.push({
            x: centroX + distanciaAleatoria * cos(anguloPos),
            y: centroY + distanciaAleatoria * sin(anguloPos),
            vx: magnitudVel * cos(anguloVel),
            vy: magnitudVel * sin(anguloVel)
        });
    }
    while (particulas.length > cantidadObjetivo) {
        particulas.pop();
    }
}