// DOM Elemente
const gridOutput = document.getElementById('grid-output');
const cameraSelect = document.getElementById('camera-select');

// Einstellungen
const GRID_SIZE = 64; // Zeichen pro Zeile und Spalte
const GRAYSCALE_LEVELS = 5;
const UPDATE_INTERVAL = 150;
const CONTRAST_FACTOR = 1.5;

// ASCII-Art Zeichen für Graustufen (dunkel → hell)
const GRAYSCALE_CHARS = ['@', '%', '#', '*', '.'];

let capture = null;
let lastUpdate = 0;
let activeDeviceId = null;
let cameraListenerAttached = false;

function setup() {
    const parent = document.getElementById('p5-container') || document.body;
    const canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent(parent);
    pixelDensity(1);
    startCapture();
    attachCameraListener();
}

function draw() {
    background(0);

    if (!capture) {
        return;
    }

    const now = millis();
    const isReady = capture.elt?.readyState >= capture.elt.HAVE_CURRENT_DATA;

    if (isReady && now - lastUpdate >= UPDATE_INTERVAL) {
        capture.loadPixels();
        const grid = pixelsToGrid(capture.pixels);
        if (grid) {
            displayGrid(grid);
            lastUpdate = now;
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function startCapture(deviceId = null) {
    if (capture) {
        const oldStream = capture.elt?.srcObject;
        capture.remove();
        capture = null;
        if (oldStream) {
            oldStream.getTracks().forEach(track => track.stop());
        }
    }

    const constraints = {
        video: {
            width: GRID_SIZE,
            height: GRID_SIZE
        }
    };

    if (deviceId) {
        constraints.video.deviceId = { exact: deviceId };
    } else {
        constraints.video.facingMode = 'user';
    }

    capture = createCapture(constraints, () => {});
    capture.size(GRID_SIZE, GRID_SIZE);
    capture.hide();

    capture.elt.onloadedmetadata = async () => {
        activeDeviceId = capture.elt.srcObject?.getVideoTracks()[0]?.getSettings()?.deviceId || deviceId || null;
        await populateCameraOptions(activeDeviceId);
    };
}

function pixelsToGrid(pixels) {
    if (!pixels || pixels.length === 0) {
        return null;
    }

    const grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            const index = (y * GRID_SIZE + x) * 4;
            const r = pixels[index];
            const g = pixels[index + 1];
            const b = pixels[index + 2];

            if (r === undefined || g === undefined || b === undefined) {
                continue;
            }

            let gray = (r + g + b) / 3;
            gray = ((gray - 128) * CONTRAST_FACTOR) + 128;
            gray = Math.max(0, Math.min(255, gray));

            const level = Math.floor((gray / 255) * (GRAYSCALE_LEVELS - 1));
            grid[y][x] = level;
        }
    }

    return grid;
}

function displayGrid(grid) {
    if (!gridOutput) return;

    let html = '';
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const level = grid[y][x] ?? 0;
            const char = GRAYSCALE_CHARS[level];
            html += `<span class="cell level-${level}">${char}</span>`;
        }
        html += '<br>';
    }

    gridOutput.innerHTML = html;
}

// Kamera-Auswahl
function attachCameraListener() {
    if (!cameraSelect || cameraListenerAttached) {
        return;
    }

    cameraSelect.addEventListener('change', event => {
        const deviceId = event.target.value;
        if (deviceId) {
            startCapture(deviceId);
        }
    });

    cameraListenerAttached = true;
}

async function getCameraDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
        return [];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
}

async function populateCameraOptions(selectedId = null) {
    if (!cameraSelect) return;

    const cameras = await getCameraDevices();
    cameraSelect.innerHTML = '';

    if (cameras.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'Keine Kamera gefunden';
        option.disabled = true;
        cameraSelect.appendChild(option);
        cameraSelect.disabled = true;
        return;
    }

    cameras.forEach((camera, index) => {
        const option = document.createElement('option');
        option.value = camera.deviceId;
        option.textContent = camera.label || `Kamera ${index + 1}`;
        if (selectedId) {
            option.selected = camera.deviceId === selectedId;
        } else if (index === 0) {
            option.selected = true;
        }
        cameraSelect.appendChild(option);
    });

    cameraSelect.disabled = cameras.length <= 1;
}

window.addEventListener('beforeunload', () => {
    if (capture?.elt?.srcObject) {
        capture.elt.srcObject.getTracks().forEach(track => track.stop());
    }
});
