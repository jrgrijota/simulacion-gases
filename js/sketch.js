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

// Propiedades de las partículas
let radioParticula = 5;    
let particulas = [];

// Contadores de choques
let totalChoques = 0;
let choquesEnEsteSegundo = 0;
let choquesPorSegundo = 0;
let ultimoTiempoMedido = 0; 

// Variables globales de control térmico interno
let temperaturaActualInt = 0;
let temperaturaAnterior = 0; 

// Referencias de elementos HTML (Ecosistema DOM)
let sliderParticulas;
let elemTempView;
let mFrecuencia, mRadio, mTotales, lblParticleVal;

function setup() {
    let canvas = createCanvas(580, 580);
    canvas.parent('canvas-container');
    
    centroX = width / 2;
    centroY = height / 2;
    
    // Alojar el slider creado en el contenedor HTML diseñado
    sliderParticulas = createSlider(1, 200, 50, 1);
    sliderParticulas.parent('particle-slider-container');
    
    // Mapear elementos del DOM
    elemTempView = select('#input-temp-view');
    mFrecuencia = select('#metric-frecuencia');
    mRadio = select('#metric-radio');
    mTotales = select('#metric-totales');
    lblParticleVal = select('#particle-val');
    
    // Asignar listeners a los botones del panel de control
    select('#btn-subir').mousePressed(subirTemperatura);
    select('#btn-bajar').mousePressed(bajarTemperatura);
    
    ultimoTiempoMedido = millis();
}

function draw() {
    background(20); // Fondo gris oscuro limpio coincidente con la interfaz
    
    // Sincronización bidireccional UI -> Datos
    let cantidadDeseada = sliderParticulas.value();
    lblParticleVal.html(cantidadDeseada);
    
    gestionarParticulas(cantidadDeseada, temperaturaActualInt);
    
    // 1. Monitor de impactos por segundo
    if (millis() - ultimoTiempoMedido >= 1000) {
        choquesPorSegundo = choquesEnEsteSegundo;
        choquesEnEsteSegundo = 0;
        ultimoTiempoMedido = millis();
    }
    
    // 2. Modificación de velocidad molecular según temperatura
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
    
    // 3. Inyección directa de datos físicos en el panel HTML
    mFrecuencia.html(choquesPorSegundo);
    mRadio.html(nf(radioContenedor, 3, 1));
    mTotales.html(totalChoques);
    
    // 4. Renderizado estético del termómetro integrado en el lienzo
    dibujarTermometro(temperaturaActualInt);
    
    // 5. Simulación de la pared elástica
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
    
    impulsoAcumulado = 0; 
    
    // Contenedor elástico (Color de alerta dinámico)
    stroke(255, 70, 70);
    strokeWeight(2.5);
    noFill();
    circle(centroX, centroY, radioContenedor * 2);
    
    // 6. Actualización cinemática de las partículas
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        p.x += p.vx;
        p.y += p.vy;
        comprobarParedes(p);
    }
    
    resolverChoquesParticulas();
    
    // 7. Renderizado estricto de las partículas
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        fill(0, 200, 255);
        noStroke();
        circle(p.x, p.y, radioParticula * 2);
    }
}

// --- MANEJADORES DE EVENTOS DE INTERFAZ ---

function subirTemperatura() {
    temperaturaActualInt = constrain(temperaturaActualInt + 10, 0, 500);
    elemTempView.html(temperaturaActualInt);
}

function bajarTemperatura() {
    temperaturaActualInt = constrain(temperaturaActualInt - 10, 0, 500);
    elemTempView.html(temperaturaActualInt);
}

function dibujarTermometro(temp) {
    let x = 35;
    let yBase = 540;
    let altoTubo = 160;
    let anchoTubo = 10;
    let radioBulbo = 15;
    
    let colorFrio = color(0, 120, 255);
    let colorCalor = color(255, 40, 40);
    
    let factorInterp = map(temp, 0, 500, 0, 1);
    let colorMercurio = lerpColor(colorFrio, colorCalor, factorInterp);
    
    stroke(70);
    strokeWeight(2);
    fill(30);
    rect(x - anchoTubo / 2, yBase - altoTubo, anchoTubo, altoTubo, 5, 5, 0, 0);
    circle(x, yBase, radioBulbo * 2);
    
    noStroke();
    fill(colorMercurio);
    circle(x, yBase, radioBulbo * 1.5);
    let alturaLiquido = map(temp, 0, 500, 8, altoTubo - 10);
    rect(x - (anchoTubo * 0.6) / 2, yBase - alturaLiquido, anchoTubo * 0.6, alturaLiquido);
}

// --- NÚCLEO DE CÁLCULO FÍSICO ---

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
            let distanciaMinima = radioParticula * 2;
            
            if (distancia < distanciaMinima) {
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