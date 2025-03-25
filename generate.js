const fs = require('fs');
const path = require('path');

// Scannen der Verzeichnisse
const baseDir = __dirname;
const directories = [];

const items = fs.readdirSync(baseDir, {withFileTypes: true});

for (const item of items) {
    if (!item.isDirectory() || item.name.startsWith('.') || item.name === 'node_modules') {
        continue;
    }

    const dirName = item.name;
    const dirPath = path.join(baseDir, dirName);
    const indexPath = path.join(dirPath, 'index.html');

    if (fs.existsSync(indexPath)) {
        directories.push({
            name: dirName.charAt(0).toUpperCase() + dirName.slice(1).replace(/-/g, ' '),
            path: dirName
        });
    }
}

// Sortieren
directories.sort((a, b) => a.name.localeCompare(b.name));

// HTML-Template lesen
const template = fs.readFileSync('index.html', 'utf8');

// Spielkarten generieren
let gameCardsHtml = '';

if (directories.length === 0) {
    gameCardsHtml = `
    <div class="no-games">
      <h2>No games found</h2>
      <p>There are no games with index.html files in the subfolders.</p>
    </div>
  `;
} else {
    directories.forEach(dir => {
        gameCardsHtml += `
      <div class="game-card">
        <a href="${dir.path}/index.html">
          <div class="game-icon">🎮</div>
          <div class="game-title">${dir.name}</div>
        </a>
      </div>
    `;
    });
}

// Template aktualisieren
const html = template.replace('<!-- GAME_CARDS_PLACEHOLDER -->', gameCardsHtml);

// In index.html schreiben
fs.writeFileSync('index.html', html);

console.log(`Statische index.html mit ${directories.length} Spielen wurde erstellt!`);