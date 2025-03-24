// Prüfen, ob es sich um ein mobiles Gerät handelt
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Anpassungen für mobile Geräte
if (isMobile) {
    // CSS-Variablen für mobile Geräte anpassen
    document.documentElement.style.setProperty('--button-padding', '15px 20px');
    document.documentElement.style.setProperty('--button-font-size', '1.2em');
    document.documentElement.style.setProperty('--text-max-height', '35vh');

    // Zusätzliche Touch-Event Handler für Buttons hinzufügen
    document.addEventListener('DOMContentLoaded', () => {
        // Notebook-Toggle-Button Touch-Event
        const notebookToggle = document.getElementById('notebookToggle');
        if (notebookToggle) {
            notebookToggle.addEventListener('touchend', function (e) {
                e.preventDefault(); // Verhindert doppelte Klicks
            });
        }

        console.log('Mobile Anpassungen aktiviert ✨');
    });
}

console.log('Game initialization complete ✨');