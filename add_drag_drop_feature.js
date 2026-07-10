const fs = require('fs');
const path = 'c:/Users/DELL/Máy tính/Script/kaiz-collection/modules/lore_world_map.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add CSS
const cssToAdd = `
        .lore-drag-mode-cell {
            border: 2px dashed rgba(255, 255, 255, 0.2) !important;
            background: rgba(255, 255, 255, 0.05) !important;
        }
        .lore-drag-mode-cell:hover {
            border-color: rgba(56, 189, 248, 0.5) !important;
            background: rgba(56, 189, 248, 0.1) !important;
        }
        .location-button[draggable="true"]:active {
            cursor: grabbing !important;
            opacity: 0.8;
            transform: scale(0.95);
        }
`;
if (!content.includes('.lore-drag-mode-cell')) {
    content = content.replace('.location-button.empty-location {', cssToAdd + '\\n        .location-button.empty-location {');
}

// 2. Add Button HTML
const btnHTML = `
                        <button id="lore_btn_drag_mode" class="lore-btn lore-btn-secondary" title="Sắp xếp kéo thả vị trí">
                            <img src="https://api.iconify.design/lucide:move.svg?color=%23cbd5e1" style="width:18px;height:18px;vertical-align:-3px;margin-right:6px;display:inline-block;" /> <span id="lore_btn_drag_text">Sắp Xếp</span>
                        </button>
`;
if (!content.includes('lore_btn_drag_mode')) {
    content = content.replace(
        /<button id="lore_btn_add_location" class="lore-btn lore-btn-secondary" title="Bật\/Tắt chế độ thêm địa điểm">\s*<img[^>]+> <span id="lore_btn_add_text">Thêm Địa Điểm<\/span>\s*<\/button>/g,
        (match) => match + '\\n' + btnHTML
    );
}

// 3. Add Button Logic
const logicJS = `
        // Xử lý nút Sắp Xếp (Bật / Tắt Drag Mode)
        overlay.querySelector('#lore_btn_drag_mode').addEventListener('click', () => {
            window._loreDragMode = !window._loreDragMode;
            if (window._loreAddMode) {
                window._loreAddMode = false;
                const addBtn = overlay.querySelector('#lore_btn_add_location');
                if (addBtn) {
                    addBtn.style.background = '';
                    addBtn.style.color = '';
                    addBtn.style.borderColor = '';
                }
                const addBtnText = overlay.querySelector('#lore_btn_add_text');
                if(addBtnText) addBtnText.innerText = 'Thêm Địa Điểm';
                const addBtnIcon = overlay.querySelector('#lore_btn_add_location img');
                if(addBtnIcon) addBtnIcon.src = 'https://api.iconify.design/lucide:plus.svg?color=%23cbd5e1';
            }
            const btnText = overlay.querySelector('#lore_btn_drag_text');
            const btnIcon = overlay.querySelector('#lore_btn_drag_mode img');
            const btn = overlay.querySelector('#lore_btn_drag_mode');
            if (window._loreDragMode) {
                btnText.innerText = 'Đang Sắp Xếp';
                if(btnIcon) btnIcon.src = 'https://api.iconify.design/lucide:check.svg?color=%23fca5a5';
                btn.style.background = 'rgba(239, 68, 68, 0.15)';
                btn.style.color = '#fca5a5';
                btn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            } else {
                btnText.innerText = 'Sắp Xếp';
                if(btnIcon) btnIcon.src = 'https://api.iconify.design/lucide:move.svg?color=%23cbd5e1';
                btn.style.background = '';
                btn.style.color = '';
                btn.style.borderColor = '';
            }
            renderAppGrid();
        });
`;
if (!content.includes('lore_btn_drag_mode img')) {
    content = content.replace(
        /\/\/ Xử lý nút Thêm Địa Điểm \(Bật \/ Tắt Add Mode\)/g,
        logicJS + '\\n        // Xử lý nút Thêm Địa Điểm (Bật / Tắt Add Mode)'
    );
}

// 3b. Update Add Mode Logic to disable Drag Mode
const disableDragJS = `
            if (window._loreDragMode) {
                window._loreDragMode = false;
                const dragBtn = overlay.querySelector('#lore_btn_drag_mode');
                if (dragBtn) {
                    dragBtn.style.background = '';
                    dragBtn.style.color = '';
                    dragBtn.style.borderColor = '';
                }
                const dragBtnText = overlay.querySelector('#lore_btn_drag_text');
                if(dragBtnText) dragBtnText.innerText = 'Sắp Xếp';
                const dragBtnIcon = overlay.querySelector('#lore_btn_drag_mode img');
                if(dragBtnIcon) dragBtnIcon.src = 'https://api.iconify.design/lucide:move.svg?color=%23cbd5e1';
            }
`;
if (!content.includes("const dragBtn = overlay.querySelector('#lore_btn_drag_mode')")) {
    content = content.replace(
        /window\._loreAddMode = !window\._loreAddMode;/g,
        `window._loreAddMode = !window._loreAddMode;\n${disableDragJS}`
    );
}

// 3c. Reset drag mode when resetting styles
const resetDragJS = `window._loreAddMode = false;
            window._loreDragMode = false;
            const dragBtnReset = overlay.querySelector('#lore_btn_drag_mode'); if(dragBtnReset) { dragBtnReset.style.background = ''; dragBtnReset.style.color = ''; dragBtnReset.style.borderColor = ''; }
            const dragBtnTextReset = overlay.querySelector('#lore_btn_drag_text'); if(dragBtnTextReset) dragBtnTextReset.innerText = 'Sắp Xếp';
            const dragBtnIconReset = overlay.querySelector('#lore_btn_drag_mode img'); if(dragBtnIconReset) dragBtnIconReset.src = 'https://api.iconify.design/lucide:move.svg?color=%23cbd5e1';`;
if (!content.includes("dragBtnReset = overlay.querySelector('#lore_btn_drag_mode')")) {
    content = content.replace(
        /window\._loreAddMode = false;/g,
        resetDragJS
    );
}

// 4. Update Node Attributes in renderAppGrid
if (!content.includes('window._loreDragMode ?')) {
    content = content.replace(
        /<div class="\$\{btnClass\}" data-loc-id="\$\{loc\.id\}" onclick="window\._loreOnLocationLeftClick/g,
        `<div class="\$\{btnClass\}" \$\{window._loreDragMode ? 'style="cursor: grab;" draggable="true" ondragstart="window._loreOnDragStart(event, \\''+loc.id+'\\')" ondragover="event.preventDefault()" ondrop="window._loreOnDrop(event, '+r+', '+c+')"' : ''\} data-loc-id="\$\{loc.id\}" onclick="window._loreOnLocationLeftClick`
    );
}

// 5. Update Empty Cell Rendering
const emptyCellDrag = `
                    } else if (window._loreDragMode) {
                        html += \`
                            <div class="location-button empty-location lore-drag-mode-cell" ondragover="event.preventDefault()" ondrop="window._loreOnDrop(event, \${r}, \${c})" title="Thả vào đây">
                            </div>
                        \`;
                    } else {
`;
if (!content.includes('lore-drag-mode-cell')) {
    content = content.replace(
        /\} else \{\s*html \+= `\s*<div class="location-button empty-location">\s*<\/div>\s*`;\s*\}/g,
        emptyCellDrag + '\n                        html += `\n                            <div class="location-button empty-location">\n                            </div>\n                        `;\n                    }\n                }'
    );
    content = content.replace(/\} \} else \{/g, '} else {'); // fix duplicate closing brace if any
}

// 6. Add Drag and Drop Functions
const dragDropFuncs = `
    window._loreOnDragStart = function(event, locId) {
        if (!window._loreDragMode) return;
        event.dataTransfer.setData('text/plain', locId);
        event.dataTransfer.effectAllowed = 'move';
    };

    window._loreOnDrop = function(event, r, c) {
        if (!window._loreDragMode) return;
        event.preventDefault();
        const draggedId = event.dataTransfer.getData('text/plain');
        if (!draggedId) return;
        
        const currentParent = navStack.length > 0 ? navStack[navStack.length - 1] : null;
        let list = currentParent ? (currentParent.subLocations || []) : mapData.locations;
        
        const draggedLoc = list.find(l => l.id === draggedId);
        if (!draggedLoc) return;

        let targetLoc = list.find(l => l.grid_hint === \`\${r},\${c}\`);
        
        if (targetLoc && targetLoc.id !== draggedId) {
            // Swap
            const tempGridHint = draggedLoc.grid_hint || '';
            draggedLoc.grid_hint = \`\${r},\${c}\`;
            targetLoc.grid_hint = tempGridHint;
        } else {
            // Move to empty spot
            draggedLoc.grid_hint = \`\${r},\${c}\`;
        }
        
        saveMapData();
        renderAppGrid();
    };
`;

if (!content.includes('_loreOnDrop')) {
    content = content.replace(
        /\/\/ CHUỘT TRÁI: Vào xem tập con \/ drill-down/g,
        dragDropFuncs + '\n    // CHUỘT TRÁI: Vào xem tập con / drill-down'
    );
}

fs.writeFileSync(path, content);
console.log("Applied drag and drop edits");
