// DOM Elemente
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const gridOutput = document.getElementById('grid-output');

// Einstellungen
const GRID_SIZE = 120; // Größeres Raster für ganzen Bildschirm
const GRAYSCALE_LEVELS = 5; // Reduzierte Graustufen für bessere Performance
const UPDATE_INTERVAL = 150; // Update alle 150ms (ca. 6-7 FPS) für bessere Performance
const CONTRAST_FACTOR = 1.5; // Kontrast-Verstärkung

// ASCII-Art Zeichen für Graustufen
// Klassische ASCII-Art-Palette (von dunkel zu hell)
// Dunkle Stellen auf Kamera → dunkle ASCII-Zeichen
// Helle Stellen auf Kamera → helle ASCII-Zeichen
const GRAYSCALE_CHARS = [
    '@', // 0 - sehr dunkel → @ (dichtestes Zeichen)
    '%', // 1 - dunkel → % (dicht)
    '#', // 2 - mittel → # (mittel-dicht)
    '*', // 3 - hell → * (hell)
    '.'  // 4 - sehr hell → . (hellstes Zeichen)
];

let stream = null;
let animationFrame = null;

// Kamera starten
async function startCamera() {
    try {
        // Kamera-Zugriff anfordern
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user', // Front-Kamera
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        
        video.srcObject = stream;
        video.play();
        
        // Warten bis Video geladen ist
        video.addEventListener('loadedmetadata', () => {
            canvas.width = GRID_SIZE;
            canvas.height = GRID_SIZE;
            
            // Starte kontinuierliche Konvertierung
            startConversion();
        });
        
    } catch (error) {
        console.error('Kamera-Fehler:', error);
    }
}

// Video-Frame in Graustufen-Raster konvertieren
function videoFrameToGrayscaleGrid() {
    // Video auf Canvas zeichnen (skaliert auf Raster-Größe)
    ctx.drawImage(video, 0, 0, GRID_SIZE, GRID_SIZE);
    
    // Pixel-Daten lesen
    const imageData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
    const data = imageData.data;
    
    // Graustufen-Raster erstellen
    const grid = [];
    for (let i = 0; i < GRID_SIZE; i++) {
        grid[i] = [];
        for (let j = 0; j < GRID_SIZE; j++) {
            const index = (i * GRID_SIZE + j) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            
            // Graustufen berechnen (0-255)
            let gray = (r + g + b) / 3;
            
            // Kontrast erhöhen (zentriert um 128)
            gray = ((gray - 128) * CONTRAST_FACTOR) + 128;
            gray = Math.max(0, Math.min(255, gray)); // Clamp auf 0-255
            
            // In Graustufen-Level umwandeln mit schärferen Schwellenwerten
            // Verwendet gleichmäßige Intervalle für weniger Artefakte
            const level = Math.floor((gray / 255) * (GRAYSCALE_LEVELS - 1));
            grid[i][j] = level;
        }
    }
    
    return grid;
}

// Raster anzeigen (optimiert für Performance)
function displayGrid(grid) {
    let html = '';
    
    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {
            const level = grid[i][j];
            const char = GRAYSCALE_CHARS[level];
            const className = `cell level-${level}`;
            html += `<span class="${className}">${char}</span>`;
        }
        html += '<br>';
    }
    
    gridOutput.innerHTML = html;
}

// Kontinuierliche Konvertierung starten
function startConversion() {
    let lastUpdate = 0;
    
    function update() {
        const now = Date.now();
        
        if (now - lastUpdate >= UPDATE_INTERVAL) {
            const grid = videoFrameToGrayscaleGrid();
            displayGrid(grid);
            lastUpdate = now;
        }
        
        animationFrame = requestAnimationFrame(update);
    }
    
    update();
}

// Aufräumen beim Verlassen der Seite
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
});

// Kamera automatisch beim Laden starten
window.addEventListener('load', () => {
    startCamera();
});
