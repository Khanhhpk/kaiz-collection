const fs = require('fs');
let code = fs.readFileSync('modules/shimeji.js', 'utf8');

const regex = /    async function wipeMemory\(\) \{\r?\n        if \(parentDocument\.shmMainLoop\) cancelAnimationFrame\(parentDocument\.shmMainLoop\);/;

const replacement = `    async function wipeMemory() {
        if (parentDocument.shmMainLoop) cancelAnimationFrame(parentDocument.shmMainLoop);
        isEngineRunning = false;`;

code = code.replace(regex, replacement);
fs.writeFileSync('modules/shimeji.js', code);
console.log("Patched wipeMemory successfully!");
