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
