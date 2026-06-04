// Configuración del contenedor circular (Dinámico)
let centroX, centroY;
let radioContenedor = 100; 
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

// Contadores de choques (Nuevas variables)
let totalChoques = 0;
let choquesEnEsteSegundo = 0;
let choquesPorSegundo = 0;
let ultimoTiempoMedido = 0; // Registra el tiempo en milisegundos

// Componentes de interfaz (Sliders)
let sliderParticulas;
let sliderTemperatura;
let temperaturaAnterior = 0; 

function setup() {
    let canvas = createCanvas(600, 600);
    canvas.parent('canvas-container');
    
    centroX = width / 2;
    centroY = height / 2;
    
    sliderParticulas = createSlider(1, 200, 50, 1);
    sliderParticulas.position(20, 70);
    
    sliderTemperatura = createSlider(0, 600, 0, 10);
    sliderTemperatura.position(20, 120);
    
    ultimoTiempoMedido = millis();
}

function draw() {
    background(30);
    
    let cantidadDeseada = sliderParticulas.value();
    let tempActual = sliderTemperatura.value();
    
    // Sincronizar partículas
    gestionarParticulas(cantidadDeseada, tempActual);
    
    // 1. CÁLCULO DE CHOQUES POR SEGUNDO (Frecuencia)
    // Si ha transcurrido 1 segundo (1000 milisegundos), actualiza el indicador y resetea el parcial
    if (millis() - ultimoTiempoMedido >= 1000) {
        choquesPorSegundo = choquesEnEsteSegundo;
        choquesEnEsteSegundo = 0;
        ultimoTiempoMedido = millis();
    }
    
    // 2. GESTIÓN DEL CERO ABSOLUTO Y VARIACIÓN TÉRMICA
    if (tempActual !== temperaturaAnterior) {
        if (tempActual === 0) {
            for (let i = 0; i < particulas.length; i++) {
                particulas[i].vx = 0;
                particulas[i].vy = 0;
            }
        } else if (temperaturaAnterior === 0) {
            for (let i = 0; i < particulas.length; i++) {
                let magnitudVel = random(1.5, 3.5) * sqrt(tempActual / 300);
                let anguloVel = random(0, TWO_PI);
                particulas[i].vx = magnitudVel * cos(anguloVel);
                particulas[i].vy = magnitudVel * sin(anguloVel);
            }
        } else {
            let factorEscala = sqrt(tempActual / temperaturaAnterior);
            for (let i = 0; i < particulas.length; i++) {
                particulas[i].vx *= factorEscala;
                particulas[i].vy *= factorEscala;
            }
        }
        temperaturaAnterior = tempActual;
    }
    
    // Interfaz de texto de datos físicos
    fill(255);
    noStroke();
    textSize(14);
    text("Cantidad de partículas: " + cantidadDeseada, 170, 35);
    text("Temperatura: " + tempActual + " K", 170, 55);
    text("Radio actual: " + nf(radioContenedor, 3, 1) + " px", 170, 75);
    text("Choques totales: " + totalChoques, 170, 95);
    text("Frecuencia (Choques/seg): " + choquesPorSegundo, 170, 115);
    
    // 3. DINÁMICA DE COLAPSO DE LA PARED
    let fuerzaElastica = -kElastica * (radioContenedor - radioBase);
    let fuerzaAmortiguacion = -amortiguacion * velocidadRadio;
    let fuerzaTotal = impulsoAcumulado + fuerzaElastica + fuerzaAmortiguacion;
    
    let aceleracionRadio = fuerzaTotal / masaPared;
    velocidadRadio += aceleracionRadio;
    radioContenedor += velocidadRadio;
    
    // RESTRICCIÓN: El radio mínimo debe ser 5 veces el radio de la partícula (5 * 5 = 25 px)
    let radioMinimoPermitido = radioParticula * 5;
    if (radioContenedor < radioMinimoPermitido) {
        radioContenedor = radioMinimoPermitido;
        velocidadRadio = 0;
    }
    
    impulsoAcumulado = 0; 
    
    // Dibujar contenedor circular
    stroke(255, 100, 100);
    strokeWeight(2);
    noFill();
    circle(centroX, centroY, radioContenedor * 2);
    
    // 4. ACTUALIZACIÓN DE POSICIONES Y PAREDES
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        p.x += p.vx;
        p.y += p.vy;
        comprobarParedes(p);
    }
    
    // 5. RESOLUCIÓN DE CHOQUES INTERPARTÍCULAS
    resolverChoquesParticulas();
    
    // 6. RENDERIZADO DE PARTÍCULAS
    for (let i = 0; i < particulas.length; i++) {
        let p = particulas[i];
        fill(0, 200, 255);
        noStroke();
        circle(p.x, p.y, radioParticula * 2);
    }
}

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
            
            // Incrementar contadores globales y temporales de choques
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