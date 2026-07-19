const fs = require('fs');
let code = fs.readFileSync('modules/shimeji.js', 'utf8');

const regex = /if \(activeShimejis\.length === 0\) \{ debugContent\.innerHTML = '<span style="color: #94a3b8;">Không có nhân vật\.<\/span>'; return; \}/g;
code = code.replace(regex, `if (activeShimejis.length === 0) { 
            const emptyHtml = '<span style="color: #94a3b8;">Không có nhân vật.</span>';
            if (debugContent.innerHTML !== emptyHtml) debugContent.innerHTML = emptyHtml;
            return; 
        }`);

const regex2 = /debugContent\.innerHTML = `[\s\S]*?`;/g;
code = code.replace(regex2, `const newHtml = \`
            <div style="display:flex; justify-content:space-between;"><span>Action:</span> <span style="color:#38bdf8">\${target.action}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>State:</span> <span style="color:#a78bfa">\${target.state}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Tọa độ:</span> <span style="color:#fcd34d">X:\${Math.round(target.x)} Y:\${Math.round(target.y)}</span></div>
        \`;
        if (debugContent.innerHTML !== newHtml) debugContent.innerHTML = newHtml;`);

fs.writeFileSync('modules/shimeji.js', code, 'utf8');
console.log('Fixed updateDebugPanel!');
