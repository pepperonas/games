# Pong Statistik-System - Anleitung

## Einführung

Das Pong-Statistiksystem ermöglicht es, Spielstatistiken zu erfassen, anzuzeigen und zu exportieren.
Die Statistiken werden lokal im Browser gespeichert und können zwischen verschiedenen Geräten
übertragen werden.

## Funktionen

- **Spielerprofile**: Erstellen und Verwalten von Spielerprofilen
- **Statistik-Tracking**: Automatisches Erfassen von:
    - Gewonnenen und verlorenen Spielen
    - Verstrichener Spielzeit
    - Anzahl der Ballwechsel
- **Statistik-Anzeige**: Visualisierung der Statistiken mit Diagrammen
- **Export/Import**: Übertragen von Statistiken zwischen Geräten

## Erste Schritte

1. **Profilname eingeben**: Beim ersten Start des Spiels wirst du nach deinem Spielernamen gefragt.
   Dieser wird für deine Statistiken verwendet.

2. **Spielen**: Wähle einen Spielmodus (Einzelspieler, lokaler Multiplayer oder Online-Multiplayer).

3. **Statistiken nach dem Spiel**: Nach jedem Spiel erhältst du eine kurze Übersicht über die
   Spielzeit und Ballwechsel.

4. **Statistik-Übersicht**: Über den "Statistiken"-Button im Hauptmenü gelangst du zur detaillierten
   Statistik-Übersicht.

## Statistik-Anzeige

Die Statistik-Seite bietet:

- **Spielerauswahl**: Wechsle zwischen verschiedenen Spielerprofilen
- **Basisstatistiken**: Gespielte, gewonnene und verlorene Spiele
- **Detailstatistiken**: Gesamtspielzeit, Ballwechsel und mehr
- **Diagramme**: Visuelle Darstellung deiner Spielfortschritte
- **Verlauf**: Detaillierte Auflistung aller Spiele

## Export/Import der Statistiken

Um deine Statistiken auf ein anderes Gerät zu übertragen:

1. **Export**: Klicke auf der Statistik-Seite auf "Exportieren". Eine JSON-Datei wird
   heruntergeladen.

2. **Import**:
    - Auf dem neuen Gerät, wähle oder erstelle das gleiche Profil
    - Gehe zur Statistik-Seite
    - Klicke auf "Importieren"
    - Wähle die zuvor exportierte JSON-Datei aus

## Tipps

- **Mehrere Profile**: Du kannst mehrere Spielerprofile erstellen und zwischen ihnen wechseln
- **Regelmäßiger Export**: Sichere deine Statistiken regelmäßig, falls der Browser-Speicher gelöscht
  wird
- **Gewinnrate verbessern**: Analyse deiner Spielmuster in den Diagrammen kann dir helfen, deine
  Spielstrategie zu verbessern

## Technische Details

- Die Daten werden im localStorage des Browsers gespeichert
- Die Statistiken werden als JSON-Struktur im Speicher abgelegt
- Keine Daten werden an Server übertragen; alles bleibt lokal auf deinem Gerät

# Spielerwechsel im StartScreen

Diese Dokumentation erklärt, wie die neue Spielerwechsel-Funktion im StartScreen implementiert wurde
und was für die Integration in das bestehende Projekt notwendig ist.

## Überblick der Funktionalität

Die neue Spielerwechsel-Funktion ermöglicht es Benutzern:

- Den aktuellen Spieler direkt aus dem StartScreen zu wechseln, ohne zum Profilbildschirm
  zurückkehren zu müssen
- Zwischen bereits erstellten Spielerprofilen zu wechseln
- Bei Bedarf zur Erstellung eines neuen Spielers zurückzukehren
- Die Funktion auf allen Geräten (Desktop, Tablet, Smartphone) nutzen zu können

## Benötigte Änderungen

### 1. StartScreen.jsx

Der StartScreen wurde erweitert, um:

- Einen Wechsel-Button neben dem Spielernamen anzuzeigen
- Eine Spielerliste darzustellen, wenn der Button geklickt wird
- Die Auswahl eines vorhandenen Spielers zu ermöglichen
- Die Option zur Erstellung eines neuen Spielers anzubieten

### 2. StartScreen.css

Das CSS wurde um folgende Stile erweitert:

- Styling für den Spielerwechsel-Button
- Design der Spielerliste im Modal/Dropdown
- Responsive Anpassungen für verschiedene Bildschirmgrößen und Ausrichtungen
- Animationen für ein zeitgemäßes Benutzererlebnis

### 3. App.jsx

In der App-Komponente muss:

- Eine neue `handleSwitchPlayer`-Funktion implementiert werden
- Diese Funktion als Prop an den StartScreen übergeben werden

## Implementierungsschritte

### In App.jsx hinzufügen:

```jsx
// Neue Funktion zum Wechseln des Spielers
const handleSwitchPlayer = (newPlayerName = null) => {
    if (newPlayerName) {
        // Wenn ein Spieler ausgewählt wurde, direkt zu diesem wechseln
        setPlayerName(newPlayerName);
        localStorage.setItem('pongLastProfile', newPlayerName);
    } else {
        // Wenn kein Spieler ausgewählt wurde, zum Profilbildschirm wechseln
        setGameState({
            ...gameState,
            screen: 'profile'
        });
    }
};

// Die Prop an StartScreen übergeben
{
    gameState.screen === 'start' && (
        <StartScreen
            // Bestehende Props...
            onSwitchPlayer={handleSwitchPlayer} // Neue Prop
        />
    )
}
```

### In StartScreen.jsx:

Den StartScreen entsprechend der bereitgestellten Implementierung aktualisieren. Hauptpunkte:

- `showPlayerList` State zum Anzeigen/Verbergen der Spielerliste
- `availablePlayers` State zum Laden der verfügbaren Spieler
- Funktionen für den Spielerwechsel und die Auswahl
- UI-Elemente für den Button und die Spielerliste

### CSS-Stile:

Die CSS-Stile aus der bereitgestellten Implementierung in StartScreen.css einfügen.

## Designentscheidungen

1. **Overlay statt Dropdown**: Für bessere mobile Unterstützung wurde ein Vollbild-Overlay gewählt
2. **Erkennbar als aktueller Spieler**: Der aktuelle Spieler wird mit einem Häkchen und
   hervorgehobenem Hintergrund markiert
3. **Animationen**: Sanfte Ein-/Ausblendanimationen für ein modernes Gefühl
4. **Responsive Design**: Anpassungen für verschiedene Bildschirmgrößen und Orientierungen
5. **Farbschema**: Konsistente Farben mit #2C2E3B als Hauptfarbton gemäß Anforderung

## Verbesserungen für die Zukunft

Mögliche zukünftige Erweiterungen könnten sein:

- Suchfunktion für viele Spielerprofile
- Option zum Bearbeiten oder Löschen von Spielerprofilen
- Avatare oder Icons für Spielerprofile
- Pagination für sehr viele Spieler

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section
about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more
information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for
more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time.
This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel,
ESLint, etc) right into your project so you have full control over them. All of the commands except
`eject` will still work, but they will point to the copied scripts so you can tweak them. At this
point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle
deployments, and you shouldn't feel obligated to use this feature. However we understand that this
tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in
the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved
here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved
here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved
here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved
here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved
here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved
here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
