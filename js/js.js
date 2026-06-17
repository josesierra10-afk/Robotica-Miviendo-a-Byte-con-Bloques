
// --- SCRIPT PARA INDEX.HTML (MENÚ PRINCIPAL) ---

// VERIFICACIÓN DE SEGURIDAD CRÍTICA: Si algo falla, muestra el contenido después de 1 segundo.
setTimeout(() => {
    document.body.classList.remove('content-hidden');
}, 1000); 

// 1. REFERENCIAS Y ESTADO GLOBAL
let dialogoPaso = 0; 
const welcomeOverlay = document.getElementById('welcome-overlay');
const messageText = document.getElementById('message-text');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const menuNiveles = document.getElementById('menu-niveles');

// Elemento de audio para narrador (invisible en la página)
const welcomeAudio = document.getElementById('welcome-tts-audio');

const mensajes = [
    "¡Hola! Soy Byte. ¡Bienvenido a nuestra clase de robótica!", 
    "El proyecto de hoy se llama 'Aventuras de Programación'. Aquí tú eliges la dificultad.",
    "Todo está organizado por niveles (Fácil, Medio y Difícil) para que aprendas de forma progresiva.", 
    "¡Empecemos nuestra aventura! Haz clic en '¡Empezar!' y elige tu primer nivel." 
];

// --- NARRADOR DE BIENVENIDA Y MENÚ ---

/**
 * Narrar un mensaje usando SpeechSynthesis API
 */
function narrarMensaje(texto) {
    if (!texto) return;

    // Cancelar narraciones previas
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-ES";   // Español
    utterance.rate = 1;         // Velocidad normal
    utterance.pitch = 1;        // Tono normal

    speechSynthesis.speak(utterance);
}

// 2. LÓGICA DEL DIÁLOGO INICIAL
function mostrarMensaje(index) {
    dialogoPaso = index;
    if (messageText) messageText.innerHTML = mensajes[index];
    
    if (prevButton) prevButton.style.display = index > 0 ? 'block' : 'none';
    if (nextButton) nextButton.textContent = index < mensajes.length - 1 ? 'Adelante ➡️' : '¡Empezar! 🎉';

    // Narrar el mensaje actual
    narrarMensaje(mensajes[index]);
}

function avanzarDialogo() {
    if (dialogoPaso < mensajes.length - 1) {
        mostrarMensaje(dialogoPaso + 1);
    } else {
        // 1. Ocultamos el overlay con una transición
        if (welcomeOverlay) welcomeOverlay.style.opacity = '0';
        
        setTimeout(() => {
            // 2. Ocultamos el overlay completamente y mostramos el contenido principal
            if (welcomeOverlay) welcomeOverlay.style.display = 'none';
            if (menuNiveles) menuNiveles.style.display = 'block';
            document.body.classList.remove('content-hidden'); // Esto revela #main-content-wrapper

            // Activar narrador en las opciones del menú
            activarNarradorMenu();
        }, 1000);
    }
}

if (nextButton) nextButton.addEventListener('click', avanzarDialogo);
if (prevButton) prevButton.addEventListener('click', () => {
    if (dialogoPaso > 0) {
        mostrarMensaje(dialogoPaso - 1);
    }
});

// 3. NARRADOR EN EL MENÚ DE NIVELES
function activarNarradorMenu() {
    const opciones = document.querySelectorAll('.unidad-sticker');
    opciones.forEach(opcion => {
        opcion.addEventListener('mouseenter', () => {
            const texto = opcion.innerText.trim();
            narrarMensaje(`Has seleccionado ${texto}`);
        });
    });
}

// 4. INICIALIZACIÓN
function inicializarInterfaz() {
    if (menuNiveles) {
        menuNiveles.style.display = 'none';
    }
    
    // Si hay overlay, lo mostramos. El body debe estar .content-hidden por HTML.
    if (welcomeOverlay) {
        mostrarMensaje(0);
        welcomeOverlay.style.display = 'flex';
    } else {
        // En caso de fallo, mostramos el contenido principal.
        document.body.classList.remove('content-hidden');
        activarNarradorMenu();
    }
}

document.addEventListener('DOMContentLoaded', inicializarInterfaz);