const fs = require('fs');
let code = fs.readFileSync('modules/shimeji.js', 'utf8');

const regex = /                    setTimeout\(\(\) => \{\r?\n                        let newShi = new Shimeji\(this\.x \+ \(this\.faceRight \? -30 : 30\), this\.y, 'Falling'\);\r?\n                        activeShimejis\.push\(newShi\); ensureEngineRunning\(\);\r?\n                    \}, 2000\);/;

const replacement = `                    setTimeout(() => {
                        if (aiConfig.enabled === false) return;
                        let newShi = new Shimeji(this.x + (this.faceRight ? -30 : 30), this.y, 'Falling');
                        activeShimejis.push(newShi); ensureEngineRunning();
                    }, 2000);`;

code = code.replace(regex, replacement);
fs.writeFileSync('modules/shimeji.js', code);
console.log("Patched SplitIntoTwo successfully!");
