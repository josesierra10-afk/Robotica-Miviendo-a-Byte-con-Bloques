
// --- SCRIPT PARA NIVELES (FACIL.HTML, MEDIO.HTML, DIFICIL.HTML) ---

// Configuración de API Key (vacía para entorno Canvas)
const apiKey = ""; 

// **VERIFICACIÓN DE SEGURIDAD CRÍTICA:**
document.body.classList.remove('content-hidden');

// 1. REFERENCIAS Y ESTADO GLOBAL
let microPasosCompletados = 0;
let pasoActual = 1; // Iniciamos en la Introducción (Paso 1)

// Elementos del DOM
const introContainer = document.getElementById('intro-container');
const scratchContainer = document.getElementById('scratch-container');
const emocionesContainer = document.getElementById('emociones-container');
const finalContainer = document.getElementById('final-container');

const pasosRutina = document.querySelectorAll('#pasos-lista .paso');
const backButton = document.getElementById('back-button');

const microPasos = document.querySelectorAll('.micro-paso');
const mensajeRetoCompleto = document.getElementById('mensaje-reto-completo');
const btnContinuarReto = document.getElementById('btn-goto-reto');
const btnContinuarEmociones = document.getElementById('btn-goto-emociones');

const botonesEmocion = document.querySelectorAll('.boton-emocion');
const feedbackRobot = document.getElementById('feedback-robot');
const robotEmocion = document.getElementById('robot-emocion');

const robotAudio = document.getElementById('robot-tts-audio');
const clickSound = document.getElementById('click-sound');

// --- TTS Y SONIDO (Funciones duplicadas aquí para asegurar que el script del nivel funcione independientemente) ---

/**
 * Convierte base64 a ArrayBuffer.
 */
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Función auxiliar para escribir strings en DataView
 */
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * Convierte un ArrayBuffer de PCM en un Blob WAV.
 */
function pcmToWav(pcm16, sampleRate) {
    const numChannels = 1;
    const numSamples = pcm16.length;
    const bytesPerSample = 2; 
    const buffer = new ArrayBuffer(44 + numSamples * bytesPerSample);
    const view = new DataView(buffer);

    // Escribir cabecera WAV
    writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + numSamples * bytesPerSample, true);
    writeString(view, 8, 'WAVE'); writeString(view, 12, 'fmt '); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, bytesPerSample * 8, true); writeString(view, 36, 'data');
    view.setUint32(40, numSamples * bytesPerSample, true);

    // Escribir datos PCM
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        view.setInt16(offset, pcm16[i], true);
        offset += bytesPerSample;
    }
    return new Blob([buffer], { type: 'audio/wav' });
}


// Mapa de instrucciones TTS por nivel y paso
const ttsInstructions = {
    // Nivel 1: Secuencia
    'Nivel 1-intro': "Bienvenido al Nivel Fácil. Primero, mira el Genially para entender la Secuencia. Luego, haz clic en el botón para ir al reto.",
    'Nivel 1-reto': "Estás en el Reto de Secuencia. Ordena los bloques de código en el panel izquierdo y replícalos en Scratch a tu derecha. ¡Haz clic en mí si necesitas repetir la instrucción!",
    'Nivel 1-emociones': "Ahora, selecciona cómo te sentiste al terminar el reto. ¡Tu emoción es importante para mí!",

    // Nivel 2: Bucle
    'Nivel 2-intro': "¡Nivel Intermedio! En esta introducción, aprenderás sobre los bucles o repeticiones. Observa atentamente el Genially.",
    'Nivel 2-reto': "Estás en el Reto de Bucle. Tu objetivo es crear una repetición para mover a Byte. Completa la secuencia en el panel izquierdo y programa en Scratch.",
    'Nivel 2-emociones': "Selecciona la emoción que sentiste al programar. ¡Me encanta que participes!",
    
    // Nivel 3: Condicional
    'Nivel 3-intro': "¡Nivel Avanzado! Aquí aprenderás a tomar decisiones con los condicionales Si/Entonces. Mira el Genially para la explicación.",
    'Nivel 3-reto': "Estás en el Reto Condicional. Debes enseñarle a Byte a tomar una decisión sobre un obstáculo. Completa los micro-pasos y programa en Scratch.",
    'Nivel 3-emociones': "Cuéntame cómo te sientes ahora que terminaste. ¡Tu estado de ánimo me ayuda a mejorar las lecciones!",
};

/**
 * Llama a la API de TTS y reproduce el audio.
 * @param {string} stepKey - La clave del paso actual (ej: 'Nivel 1-reto').
 */
async function reproduceInstructions(stepKey) {
    // Determinar nivel actual
    const levelMatch = document.title.match(/Nivel (\d+)/);
    const levelNumber = levelMatch ? levelMatch[1] : 1;
    
    // Construir la clave de la instrucción (ej: 'Nivel 1-reto')
    let instructionKey;
    if (stepKey === 'intro') instructionKey = `Nivel ${levelNumber}-intro`;
    else if (stepKey === 'reto') instructionKey = `Nivel ${levelNumber}-reto`;
    else if (stepKey === 'emociones') instructionKey = `Nivel ${levelNumber}-emociones`;
    else return;

    const text = ttsInstructions[instructionKey];
    if (!text) return;

    // Pausar audio previo
    if (robotAudio) {
        robotAudio.pause();
        robotAudio.currentTime = 0;
    }

    // Payload para TTS
    const payload = {
        contents: [{ parts: [{ text: text }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } 
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

    try {
        let response;
        let attempt = 0;
        const maxAttempts = 3;
        
        while (attempt < maxAttempts) {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) break;

            attempt++;
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            } else {
                console.error("TTS failed after multiple retries.");
                return; 
            }
        }

        const result = await response.json();
        const part = result?.candidates?.[0]?.content?.parts?.[0];
        const audioData = part?.inlineData?.data;
        const mimeType = part?.inlineData?.mimeType;

        if (audioData && mimeType && mimeType.startsWith("audio/L16")) {
            const sampleRateMatch = mimeType.match(/rate=(\d+)/);
            const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
            
            const pcmData = base64ToArrayBuffer(audioData);
            const pcm16 = new Int16Array(pcmData);
            const wavBlob = pcmToWav(pcm16, sampleRate);
            
            const audioUrl = URL.createObjectURL(wavBlob);

            if (robotAudio) {
                robotAudio.src = audioUrl;
                robotAudio.play();
            }
        } else {
            console.error("Invalid TTS response format or missing data.");
        }
    } catch (error) {
        console.error("Error fetching TTS:", error);
    }
}

/** Reproduce un sonido de clic. */
function playClickSound() {
    if (clickSound) {
        clickSound.currentTime = 0;
        clickSound.play().catch(e => console.log("Sound blocked by browser.", e));
    }
}

// Agregar sonido de click a todos los botones y enlaces relevantes
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('.boton-accion') || e.target.closest('.boton-emocion')) {
        playClickSound();
    }
});

// --- 2. FUNCIONES DE FLUJO Y NAVEGACIÓN ---
function cambiarContenedor() {
    // Ocultar todos
    if (introContainer) introContainer.style.display = 'none';
    if (scratchContainer) scratchContainer.style.display = 'none';
    if (emocionesContainer) emocionesContainer.style.display = 'none';
    if (finalContainer) finalContainer.style.display = 'none';
    
    // Mostrar el activo
    if (pasoActual === 1 && introContainer) {
        introContainer.style.display = 'block';
        reproduceInstructions('intro');
    } else if (pasoActual === 2 && scratchContainer) {
        scratchContainer.style.display = 'block';
        reproduceInstructions('reto');
    } else if (pasoActual === 3 && emocionesContainer) {
        emocionesContainer.style.display = 'block';
        reproduceInstructions('emociones');
    } else if (pasoActual === 4 && finalContainer) {
        finalContainer.style.display = 'block';
    }
}

function actualizarAsistenteVisual() {
    pasosRutina.forEach(p => {
        const numPaso = parseInt(p.id.split('-')[1]);
        p.classList.remove('activo', 'completado');

        if (numPaso < pasoActual) {
            p.classList.add('completado');
        } else if (numPaso === pasoActual) {
            p.classList.add('activo');
        }
    });

    // Actualizar botón de "Volver"
    if (backButton) {
        backButton.style.display = (pasoActual > 1 && pasoActual < 4) ? 'block' : 'none';
    }
}

function avanzarPaso() {
    if (pasoActual < 4) {
        pasoActual++;
        cambiarContenedor();
        actualizarAsistenteVisual();
        narrarAvancePaso(pasoActual); // narrador al avanzar
    }
}

function retrocederPaso() {
    if (pasoActual > 1 && pasoActual < 4) {
        pasoActual--;
        cambiarContenedor();
        actualizarAsistenteVisual();
        narrarAvancePaso(pasoActual); // narrador al retroceder
    }
}

// --- 3. MANEJADORES DE EVENTOS ---
if (btnContinuarReto) btnContinuarReto.addEventListener('click', avanzarPaso);
if (btnContinuarEmociones) btnContinuarEmociones.addEventListener('click', avanzarPaso);
if (backButton) backButton.addEventListener('click', retrocederPaso);

// --- LÓGICA DE RETO (Paso 2) ---
microPasos.forEach(paso => {
    paso.addEventListener('click', (event) => {
        if (pasoActual === 2 && !event.target.classList.contains('completado-micro')) {
            const ordenEsperado = microPasosCompletados + 1; 
            const ordenReal = parseInt(event.target.dataset.paso);
            
            if (ordenReal === ordenEsperado) {
                event.target.classList.add('completado-micro');
                microPasosCompletados++;

                if (microPasosCompletados === microPasos.length) {
                    if (mensajeRetoCompleto) mensajeRetoCompleto.style.display = 'block';
                }
            } else {
                alert(`¡Error! El paso ${ordenReal} no es el ${ordenEsperado} en la secuencia. ¡Empieza de nuevo!`);
                microPasosCompletados = 0;
                microPasos.forEach(p => p.classList.remove('completado-micro'));
                if (mensajeRetoCompleto) mensajeRetoCompleto.style.display = 'none';
            }
        }
    });
});

// --- EMOCIONES (Paso 3) ---
const reacciones = {
    feliz: { mensaje: "¡Genial! Tu esfuerzo y lógica valieron la pena. ¡Sigue así!", imagen: "img/robot Feliz.png" },
    confundido: { mensaje: "Está bien sentirse así. Significa que tu cerebro está aprendiendo. Pide ayuda la próxima vez.", imagen: "img/robot pensando.png" },
    frustrado: { mensaje: "¡Espera! La frustración es normal. Respira y recuerda: ¡puedes lograrlo!", imagen: "img/robot triste.jpeg" }
};

botonesEmocion.forEach(boton => {
    boton.addEventListener('click', (event) => {
        if (pasoActual === 3) {
            const emocion = event.target.dataset.emocion;
            const reaccion = reacciones[emocion];

            if (feedbackRobot) feedbackRobot.textContent = reaccion.mensaje;
            if (feedbackRobot) feedbackRobot.style.display = 'block';
            if (robotEmocion) robotEmocion.src = reaccion.imagen;

            botonesEmocion.forEach(btn => btn.disabled = true); 

            // narrar emoción seleccionada
            narrarTexto(reaccion.mensaje);

            setTimeout(() => {
                avanzarPaso(); 
            }, 4000); 
        }
    });
});

// --- ACCESIBILIDAD (TAMAÑO DE FUENTE) ---
const fontSizes = ['font-size-small', 'font-size-medium', 'font-size-large'];
let currentFontSizeIndex = 1; // Inicia en medium

function updateFontSize() {
    document.body.classList.remove(...fontSizes);
    document.body.classList.add(fontSizes[currentFontSizeIndex]);
}

document.getElementById('increase-font').addEventListener('click', () => {
    if (currentFontSizeIndex < fontSizes.length - 1) {
        currentFontSizeIndex++;
        updateFontSize();
    }
});

document.getElementById('decrease-font').addEventListener('click', () => {
    if (currentFontSizeIndex > 0) {
        currentFontSizeIndex--;
        updateFontSize();
    }
});

// --- NARRADOR AUXILIAR ---
function narrarTexto(texto) {
    if (!texto) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-ES";
    utterance.rate = 1;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
}

function narrarTituloNivel() {
    const titulo = document.querySelector('h1');
    if (titulo) narrarTexto(titulo.textContent.trim());
}

function narrarAvancePaso(paso) {
    let textoExtra = "";
    if (paso === 2) textoExtra = "¡Muy bien! Ahora comienza tu reto de programación.";
    if (paso === 3) textoExtra = "Excelente, ahora dime cómo te sentiste.";
    if (paso === 4) textoExtra = "Has llegado al final del nivel. ¡Gran trabajo!";
    if (textoExtra) narrarTexto(textoExtra);
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    pasoActual = 1; 
    cambiarContenedor(); 
    actualizarAsistenteVisual();
    updateFontSize();

    // Narrar el título del nivel al entrar
    narrarTituloNivel();
});