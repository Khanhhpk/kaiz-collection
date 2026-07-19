const fs = require('fs');
let code = fs.readFileSync('modules/shimeji.js', 'utf8');

// Replace the very last ensureEngineRunning(); back to startEngine();
// Since there might be other ensureEngineRunning(), we should be careful.
// Originally, there was exactly one startEngine(); call at the bottom.
// We can just find the end of the file where it says `ensureEngineRunning();\n})();` and change it back.
code = code.replace(/ensureEngineRunning\(\);\r?\n\}\)\(\);/g, 'startEngine();\n})();');

fs.writeFileSync('modules/shimeji.js', code, 'utf8');
console.log('Restored startEngine() call at the end of the file.');
