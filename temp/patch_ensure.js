const fs = require('fs');
let code = fs.readFileSync('modules/shimeji.js', 'utf8');

const regex = /    function ensureEngineRunning\(\) \{\r?\n        if \(\!isEngineRunning\) \{\r?\n            isEngineRunning = true;\r?\n            lastTime = performance\.now\(\);\r?\n    \r?\n        \}\r?\n    \}/;

const replacement = `    function ensureEngineRunning() {
        if (!isEngineRunning) {
            isEngineRunning = true;
            lastTime = performance.now();
            parentDocument.shmMainLoop = requestAnimationFrame(engineLoop);
        }
    }`;

code = code.replace(regex, replacement);
fs.writeFileSync('modules/shimeji.js', code);
console.log("Patched ensureEngineRunning successfully!");
