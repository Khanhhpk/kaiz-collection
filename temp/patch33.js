const fs = require('fs');
let code = fs.readFileSync('modules/shimeji.js', 'utf8');

const regex = /    function engineLoop\(\) \{\r?\n        let currentTime = performance\.now\(\);\r?\n        let deltaTime = currentTime \- lastTime;\r?\n        lastTime = currentTime;/g;

const replacement = `    function engineLoop() {
        if (activeShimejis.length === 0 && activeToys.length === 0 && !activeTrampoline) {
            isEngineRunning = false;
            updateDebugPanel();
            return;
        }
        let currentTime = performance.now();
        let deltaTime = currentTime - lastTime;
        lastTime = currentTime;`;

if (!regex.test(code)) {
    console.log("Could not find the target string!");
} else {
    // Reset regex index before replace since we called test()
    code = code.replace(/    function engineLoop\(\) \{\r?\n        let currentTime = performance\.now\(\);\r?\n        let deltaTime = currentTime \- lastTime;\r?\n        lastTime = currentTime;/g, replacement);
    fs.writeFileSync('modules/shimeji.js', code, 'utf8');
    console.log("Successfully patched engineLoop!");
}
