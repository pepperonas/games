// Komplette Neuimplementierung der Mobile-Anpassung für S24 Ultra
// Diese Datei als mobile-pong.js speichern und in index.html vor dem schließenden </body> Tag einbinden

// Warten auf DOM-Ladung
document.addEventListener('DOMContentLoaded', function() {
    // Mobile-Anpassungen sofort starten
    initMobilePong();
});

function initMobilePong() {
    // Debug-Informationen anzeigen
    showDebugInfo();

    // Touch-Events einrichten
    setupTouchControls();

    // Vollbild-Button hinzufügen
    addFullscreenButton();

    // Mobile-Optimierungen
    setupForMobile();

    // Auf Orientierungsänderungen reagieren
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            setupForMobile();
        }, 300);
    });

    // Auf Größenänderungen reagieren
    window.addEventListener('resize', function() {
        setTimeout(function() {
            setupForMobile();
        }, 300);
    });
}

// Debug-Overlay anzeigen
function showDebugInfo() {
    let debugDiv = document.getElementById('debug-overlay');

    if (!debugDiv) {
        debugDiv = document.createElement('div');
        debugDiv.id = 'debug-overlay';
        document.body.appendChild(debugDiv);
    }

    // Stil setzen
    debugDiv.style.cssText = `
        position: fixed;
        top: 5px;
        left: 5px;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 5px;
        font-size: 12px;
        z-index: 9999;
        border-radius: 3px;
    `;

    // Geräteinformationen anzeigen
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const ratio = window.devicePixelRatio || 1;

    debugDiv.innerHTML = `
        Screen: ${screenW}x${screenH}<br>
        Ratio: ${ratio}<br>
        UserAgent: ${navigator.userAgent.substring(0, 50)}...
    `;
}

// Mobilgeräte-Optimierung
function setupForMobile() {
    // Spielcanvas und Container holen
    const canvas = document.getElementById('game-canvas');
    const container = document.getElementById('game-container');

    if (!canvas || !container) return;

    // Bildschirmgröße ermitteln
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Sehr aggressive Skalierung für S24 Ultra (45% der Bildschirmbreite)
    let newWidth = Math.min(screenWidth * 0.45, 600);
    let newHeight = newWidth * (500/800);

    // Sicherstellen, dass die Höhe passt
    if (newHeight > screenHeight * 0.8) {
        newHeight = screenHeight * 0.8;
        newWidth = newHeight * (800/500);
    }

    // Auf ganze Pixel runden
    newWidth = Math.floor(newWidth);
    newHeight = Math.floor(newHeight);

    // Canvas-Größe anpassen
    canvas.width = newWidth;
    canvas.height = newHeight;
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';

    // Container-Style anpassen
    container.style.width = newWidth + 'px';
    container.style.height = newHeight + 'px';
    container.style.position = 'absolute';
    container.style.left = '50%';
    container.style.top = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.overflow = 'visible'; // Wichtig für die UI-Elemente

    // Scores anpassen
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) {
        scoreDisplay.style.fontSize = '14px';
        scoreDisplay.style.top = '5px';
    }

    // Start-Screen anpassen
    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.width = newWidth + 'px';
        startScreen.style.height = newHeight + 'px';
    }

    // Game-Over-Screen anpassen
    const gameOverScreen = document.getElementById('game-over');
    if (gameOverScreen) {
        gameOverScreen.style.width = newWidth + 'px';
        gameOverScreen.style.height = newHeight + 'px';
    }

    // Online-Connection-Screen anpassen
    const onlineScreen = document.getElementById('online-connection');
    if (onlineScreen) {
        onlineScreen.style.width = newWidth + 'px';
        onlineScreen.style.height = newHeight + 'px';
    }

    // Spiel-Variablen neu berechnen
    updateGameVariables(newWidth, newHeight);

    console.log(`Pong-Spiel auf ${newWidth}x${newHeight} Pixel angepasst`);
}

// Spiel-Variablen an neue Größe anpassen
function updateGameVariables(newWidth, newHeight) {
    // Verhältnis zum Original berechnen
    const widthRatio = newWidth / 800;
    const heightRatio = newHeight / 500;

    // Spielkonstanten neu berechnen
    window.PADDLE_HEIGHT = Math.floor(100 * heightRatio);
    window.PADDLE_WIDTH = Math.floor(15 * widthRatio);
    window.BALL_RADIUS = Math.floor(10 * Math.min(widthRatio, heightRatio));

    // Spielvariablen anpassen, wenn sie bereits existieren
    if (typeof window.leftPaddleY !== 'undefined') {
        window.leftPaddleY = newHeight / 2 - window.PADDLE_HEIGHT / 2;
    }

    if (typeof window.rightPaddleY !== 'undefined') {
        window.rightPaddleY = newHeight / 2 - window.PADDLE_HEIGHT / 2;
    }

    if (typeof window.ballX !== 'undefined' && typeof window.ballY !== 'undefined') {
        window.ballX = newWidth / 2;
        window.ballY = newHeight / 2;
    }

    // Wenn das Spiel läuft, Ball-Geschwindigkeit anpassen
    if (typeof window.ballSpeedX !== 'undefined' && typeof window.ballSpeedY !== 'undefined') {
        const speedFactor = Math.min(widthRatio, heightRatio);
        if (window.ballSpeedX !== 0 || window.ballSpeedY !== 0) {
            window.ballSpeedX *= speedFactor;
            window.ballSpeedY *= speedFactor;
        }
    }
}

// Touch-Steuerung einrichten
function setupTouchControls() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    // Touch-Variablen
    let touchStartY = 0;
    let activePaddle = null;

    // Touch-Start
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();

        touchStartY = touch.clientY - rect.top;
        const touchX = touch.clientX - rect.left;

        // Bestimmen, welches Paddel gesteuert wird
        if (window.gameMode === 'local-multiplayer') {
            activePaddle = touchX < canvas.width / 2 ? 'left' : 'right';
        } else if (window.gameMode === 'online-multiplayer') {
            activePaddle = window.isHost ? 'left' : 'right';
        } else {
            activePaddle = 'left';
        }
    }, {passive: false});

    // Touch-Bewegung
    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        if (!activePaddle) return;

        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();

        const currentY = touch.clientY - rect.top;
        const deltaY = currentY - touchStartY;

        // Paddel bewegen
        if (activePaddle === 'left' && typeof window.leftPaddleY !== 'undefined') {
            window.leftPaddleY += deltaY;
            window.leftPaddleY = Math.max(0, Math.min(canvas.height - window.PADDLE_HEIGHT, window.leftPaddleY));
        } else if (activePaddle === 'right' && typeof window.rightPaddleY !== 'undefined') {
            window.rightPaddleY += deltaY;
            window.rightPaddleY = Math.max(0, Math.min(canvas.height - window.PADDLE_HEIGHT, window.rightPaddleY));
        }

        touchStartY = currentY;
    }, {passive: false});

    // Touch-Ende
    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
        activePaddle = null;
    }, {passive: false});

    // Touch-Abbruch
    canvas.addEventListener('touchcancel', function(e) {
        e.preventDefault();
        activePaddle = null;
    }, {passive: false});
}

// Vollbildmodus-Button hinzufügen
function addFullscreenButton() {
    if (document.getElementById('fullscreen-btn')) return;

    const button = document.createElement('button');
    button.id = 'fullscreen-btn';
    button.textContent = 'Vollbild';
    button.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 1000;
        background-color: #2C2E3B;
        color: white;
        border: none;
        border-radius: 5px;
        padding: 8px 12px;
        font-size: 14px;
    `;

    button.addEventListener('click', function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('Fehler beim Aktivieren des Vollbildmodus:', err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });

    document.body.appendChild(button);
}

// CSS für Portrait-Modus-Warnung hinzufügen
function addOrientationWarning() {
    const style = document.createElement('style');
    style.textContent = `
        @media (orientation: portrait) {
            body::after {
                content: "Bitte Gerät drehen";
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(44, 46, 59, 0.9);
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 24px;
                z-index: 9999;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialisierung beim Laden
addOrientationWarning();