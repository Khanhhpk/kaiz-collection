/**
 * Module: App Infinite Craft - 9
 * ID: 3ad72e0d-22a7-4301-8d0b-db5b1f41aa0f
 * Converted for SillyTavern Native Extension
 */

// ==================== VÔ CỰC GIỚI (INFINITE CRAFT MINI) ====================
// Thể loại: Sáng tạo, Giải đố, Kéo thả
// Bản vá: Lưu dữ liệu toàn cục (Dùng chung 1 túi đồ cho mọi Chat), Sửa lỗi Header đè Status Bar, Lỗi tự va chạm & Lỗi trôi dạt thẻ bài khi thả

(function () {
    'use strict';

    const APP_ID = 'infinite_craft';
    const APP_NAME = 'Vô Cực Giới';
    const APP_ICON = '<img src="https://api.iconify.design/noto:milky-way.svg" style="width:75%;height:75%">';
    
    // Đã đổi key để tạo ra một file save chung duy nhất cho tất cả các chat
    const STORAGE_KEY = 'phone_infinite_craft_global_save';

    // ==================== KHO NGUYÊN TỐ CƠ BẢN (Dành cho New Game) ====================
    const BASE_ELEMENTS = [
        { name: 'Nước', emoji: '💧' }, { name: 'Lửa', emoji: '🔥' }, { name: 'Đất', emoji: '🌍' }, 
        { name: 'Gió', emoji: '💨' }, { name: 'Ánh sáng', emoji: '✨' }, { name: 'Bóng tối', emoji: '🌑' },
        { name: 'Kim loại', emoji: '⚙️' }, { name: 'Gỗ', emoji: '🪵' }, { name: 'Sét', emoji: '⚡' },
        { name: 'Băng', emoji: '❄️' }, { name: 'Đá', emoji: '🪨' }, { name: 'Hạt giống', emoji: '🌱' },
        { name: 'Linh hồn', emoji: '👻' }, { name: 'Máu', emoji: '🩸' }, { name: 'Thời gian', emoji: '⏳' },
        { name: 'Không gian', emoji: '🌌' }, { name: 'Công nghệ', emoji: '💻' }, { name: 'Ma thuật', emoji: '🪄' },
        { name: 'Hỗn mang', emoji: '🌪️' }, { name: 'Trật tự', emoji: '⚖️' }
    ];

    // ==================== QUẢN LÝ TRẠNG THÁI GAME ====================
    let GameState = {
        inventory: [], 
        workspace: []  
    };

    // Đã xóa hàm getChatId() vì không còn cần thiết phân tách dữ liệu theo chat nữa

    function getStoreKey() {
        return STORAGE_KEY; // Trả về đúng 1 key duy nhất cho toàn bộ hệ thống
    }

    function hasSavedGame() {
        return !!localStorage.getItem(getStoreKey());
    }

    function loadGame() {
        try {
            const saved = localStorage.getItem(getStoreKey());
            if (saved) {
                GameState = JSON.parse(saved);
                return true;
            }
        } catch (e) {}
        return false;
    }

    function saveGame() {
        localStorage.setItem(getStoreKey(), JSON.stringify(GameState));
    }

    function startNewGame() {
        const shuffled = [...BASE_ELEMENTS].sort(() => 0.5 - Math.random());
        const starters = shuffled.slice(0, 4);

        GameState = {
            inventory: starters,
            workspace: []
        };
        saveGame();
    }

    // ==================== CSS CỦA GAME ====================
    const CRAFT_STYLES = `
        .craft-app { display: flex; flex-direction: column; height: 100%; background: #1a1a2e; color: #fff; font-family: 'Segoe UI', sans-serif; overflow: hidden; user-select: none; touch-action: none; padding-top: 44px; box-sizing: border-box;}
        
        .craft-header { background: rgba(15, 15, 25, 0.9); backdrop-filter: blur(10px); padding: 12px 16px; display: flex; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 100; height: 48px; box-sizing: border-box;}
        .craft-back-btn { font-size: 20px; cursor: pointer; opacity: 0.8; transition: opacity 0.2s; padding-right: 15px;}
        .craft-back-btn:active { opacity: 1; }
        .craft-title { flex: 1; font-weight: 600; font-size: 16px; text-align: center; background: -webkit-linear-gradient(45deg, #ff9a9e, #fecfef); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .craft-clear-btn { font-size: 18px; cursor: pointer; opacity: 0.8; padding-left: 15px;}
        
        .craft-menu { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: radial-gradient(circle at center, #2a2a4a 0%, #1a1a2e 100%); padding: 20px; text-align: center;}
        .craft-menu-logo { font-size: 70px; margin-bottom: 10px; filter: drop-shadow(0 0 20px rgba(255,255,255,0.3)); animation: floatLogo 3s ease-in-out infinite;}
        .craft-menu-title { font-size: 28px; font-weight: 800; margin-bottom: 40px; letter-spacing: 2px;}
        .craft-menu-btn { width: 80%; padding: 15px; border-radius: 12px; border: none; font-size: 16px; font-weight: bold; cursor: pointer; margin-bottom: 15px; transition: transform 0.1s, filter 0.2s; }
        .craft-menu-btn:active { transform: scale(0.95); }
        .btn-continue { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; box-shadow: 0 4px 15px rgba(0, 242, 254, 0.4);}
        .btn-new { background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%); color: white; box-shadow: 0 4px 15px rgba(255, 8, 68, 0.4);}
        
        @keyframes floatLogo { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }

        .craft-game { display: none; flex-direction: column; height: 100%; flex: 1; }
        .craft-game.active { display: flex; }
        
        .craft-workspace { flex: 1; position: relative; background: #11111f; overflow: hidden; }
        
        .craft-inventory-wrap { height: 35%; background: rgba(25, 25, 35, 0.95); border-top: 2px solid rgba(255,255,255,0.1); display: flex; flex-direction: column;}
        .craft-inventory-header { padding: 8px 15px; font-size: 12px; color: #888; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;}
        .craft-inventory { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-wrap: wrap; gap: 10px; align-content: flex-start;}
        
        .craft-item { 
            background: #fff; color: #000; padding: 8px 12px; border-radius: 8px; font-size: 15px; font-weight: 600; 
            display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            border: 1px solid #ddd; cursor: grab; user-select: none; touch-action: none;
            transition: transform 0.1s;
        }
        .craft-item:active { cursor: grabbing; transform: scale(0.95); }
        .craft-item.new-discovery { border: 2px solid #FFD700; box-shadow: 0 0 10px #FFD700; background: #fffdf0; }
        
        .craft-item.dragging { position: absolute; z-index: 1000; box-shadow: 0 10px 20px rgba(0,0,0,0.5); pointer-events: none; opacity: 0.9;}
        
        .craft-loading { position: absolute; inset: 0; background: rgba(0,0,0,0.6); z-index: 2000; display: none; flex-direction: column; align-items: center; justify-content: center; }
        .craft-loading.show { display: flex; }
        .craft-spinner { font-size: 40px; animation: spin 1s infinite linear; margin-bottom: 10px;}
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .craft-flash { position: absolute; width: 100px; height: 100px; background: radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; animation: flashAnim 0.5s ease-out forwards; z-index: 500;}
        @keyframes flashAnim { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
    `;

    // ==================== TẠO HTML ====================
    function generateHTML() {
        return `
            <div class="craft-app" id="craft-app-container">
                <div class="craft-header">
                    <div class="craft-back-btn" id="btn-exit-app" title="Thoát">🔙</div>
                    <div class="craft-title">Vô Cực Giới</div>
                    <div class="craft-clear-btn" id="btn-clear-workspace" title="Dọn dẹp bàn" style="display:none;">🧹</div>
                </div>

                <div class="craft-menu" id="craft-view-menu">
                    <div class="craft-menu-logo">✨</div>
                    <div class="craft-menu-title">Vô Cực Giới</div>
                    
                    <button class="craft-menu-btn btn-continue" id="btn-continue-game" style="display: none;">
                        Tiếp Tục Chơi (<span id="menu-item-count">0</span> Đồ)
                    </button>
                    
                    <button class="craft-menu-btn btn-new" id="btn-new-game">
                        Bắt Đầu Mới
                    </button>
                    
                    <div style="font-size:12px; color:#888; margin-top:20px; line-height: 1.5;">
                        Kéo thả 2 nguyên tố vào nhau để kết hợp.<br>Sử dụng AI để khám phá vô hạn!<br>(Chế độ dùng chung túi đồ Toàn Cục)
                    </div>
                </div>

                <div class="craft-game" id="craft-view-game">
                    <div class="craft-workspace" id="craft-workspace">
                        </div>
                    
                    <div class="craft-inventory-wrap">
                        <div class="craft-inventory-header">
                            <span>Kho Đồ</span>
                            <span id="inventory-count">4</span>
                        </div>
                        <div class="craft-inventory" id="craft-inventory">
                            </div>
                    </div>
                </div>

                <div class="craft-loading" id="craft-loading">
                    <div class="craft-spinner">⚙️</div>
                    <div style="font-weight:bold;">Đang kết hợp...</div>
                </div>
            </div>
        `;
    }

    // ==================== LOGIC GAME CỐT LÕI ====================
    let currentIframeDoc = null;
    let isDragging = false;
    let dragEl = null;
    let offsetX = 0, offsetY = 0;
    
    let draggedData = null; 
    let sourceArea = null;  

    function getDoc() { return currentIframeDoc || document; }

    function updateMenuUI() {
        const doc = getDoc();
        if (hasSavedGame()) {
            loadGame();
            doc.getElementById('btn-continue-game').style.display = 'block';
            doc.getElementById('menu-item-count').innerText = GameState.inventory.length;
        } else {
            doc.getElementById('btn-continue-game').style.display = 'none';
        }
    }

    function startGame(isNew) {
        if (isNew) startNewGame();
        else loadGame();

        const doc = getDoc();
        doc.getElementById('craft-view-menu').style.display = 'none';
        doc.getElementById('craft-view-game').classList.add('active');
        doc.getElementById('btn-clear-workspace').style.display = 'block';
        
        renderInventory();
        renderWorkspace();
    }

    function renderInventory() {
        const doc = getDoc();
        const invContainer = doc.getElementById('craft-inventory');
        doc.getElementById('inventory-count').innerText = GameState.inventory.length;
        
        invContainer.innerHTML = GameState.inventory.map(item => `
            <div class="craft-item" data-name="${item.name}" data-emoji="${item.emoji}" data-source="inventory">
                ${item.emoji} ${item.name}
            </div>
        `).join('');

        bindDragEvents(invContainer.querySelectorAll('.craft-item'));
    }

    function renderWorkspace() {
        const doc = getDoc();
        const wsContainer = doc.getElementById('craft-workspace');
        
        wsContainer.innerHTML = GameState.workspace.map(item => `
            <div class="craft-item" data-id="${item.id}" data-name="${item.name}" data-emoji="${item.emoji}" data-source="workspace"
                 style="position: absolute; left: ${item.x}px; top: ${item.y}px;">
                ${item.emoji} ${item.name}
            </div>
        `).join('');

        bindDragEvents(wsContainer.querySelectorAll('.craft-item'));
    }

    // ==================== HỆ THỐNG KÉO THẢ (DRAG & DROP) ====================
    function bindDragEvents(elements) {
        elements.forEach(el => {
            el.addEventListener('mousedown', handleDragStart, { passive: false });
            el.addEventListener('touchstart', handleDragStart, { passive: false });
        });
    }

    function handleDragStart(e) {
        if (e.target !== e.currentTarget) return; 
        const doc = getDoc();
        
        isDragging = true;
        const target = e.currentTarget;
        
        sourceArea = target.dataset.source;
        draggedData = {
            id: target.dataset.id,
            name: target.dataset.name,
            emoji: target.dataset.emoji
        };

        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        if (sourceArea === 'inventory') {
            dragEl = target.cloneNode(true);
            dragEl.dataset.id = Date.now().toString() + '_' + Math.floor(Math.random() * 1000); 
            dragEl.dataset.source = 'workspace';
            doc.getElementById('craft-workspace').appendChild(dragEl);
            
            const rect = target.getBoundingClientRect();
            offsetX = rect.width / 2;
            offsetY = rect.height / 2;
        } 
        else {
            dragEl = target;
            const rect = dragEl.getBoundingClientRect();
            offsetX = clientX - rect.left;
            offsetY = clientY - rect.top;
            
            GameState.workspace = GameState.workspace.filter(i => i.id !== draggedData.id);
        }

        dragEl.classList.add('dragging');
        updateDragPosition(clientX, clientY);
    }

    function handleDragMove(e) {
        if (!isDragging || !dragEl) return;
        e.preventDefault(); 
        
        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        
        updateDragPosition(clientX, clientY);
    }

    function updateDragPosition(clientX, clientY) {
        const doc = getDoc();
        const wsRect = doc.getElementById('craft-workspace').getBoundingClientRect();
        
        let x = clientX - wsRect.left - offsetX;
        let y = clientY - wsRect.top - offsetY;

        dragEl.style.left = `${x}px`;
        dragEl.style.top = `${y}px`;
    }

    function handleDragEnd(e) {
        if (!isDragging || !dragEl) return;
        
        const doc = getDoc();
        const wsRect = doc.getElementById('craft-workspace').getBoundingClientRect();
        const rect = dragEl.getBoundingClientRect();
        
        // 1. Nếu thả ra khỏi không gian bàn -> Xóa vật phẩm đó
        if (rect.bottom > wsRect.bottom) {
            dragEl.remove();
            saveGame();
            dragEl = null;
            isDragging = false;
            return;
        }

        // 2. Tắt chế độ "đang kéo" để khôi phục va chạm vật lý bình thường
        isDragging = false;
        dragEl.classList.remove('dragging');
        
        // VÁ LỖI TẠI ĐÂY: Ép cứng Position Absolute để thẻ bài không bị trôi sau khi tắt 'dragging'
        dragEl.style.position = 'absolute'; 

        const dropX = parseFloat(dragEl.style.left);
        const dropY = parseFloat(dragEl.style.top);

        // 3. KIỂM TRA VA CHẠM ĐỂ GHÉP ĐỒ
        let collisionTarget = null;
        const allWorkspaceItems = doc.getElementById('craft-workspace').querySelectorAll('.craft-item');
        
        for (let item of allWorkspaceItems) {
            // VÁ LỖI: Bỏ qua việc tự check va chạm với chính thẻ bài đang cầm
            if (item === dragEl) continue; 
            
            const itemRect = item.getBoundingClientRect();
            if (!(rect.right < itemRect.left || 
                  rect.left > itemRect.right || 
                  rect.bottom < itemRect.top || 
                  rect.top > itemRect.bottom)) {
                collisionTarget = item;
                break;
            }
        }

        if (collisionTarget) {
            // NẾU CÓ VA CHẠM -> CHUẨN BỊ GHÉP
            const item2Data = {
                id: collisionTarget.dataset.id,
                name: collisionTarget.dataset.name,
                emoji: collisionTarget.dataset.emoji
            };
            
            dragEl.remove();
            collisionTarget.remove();
            GameState.workspace = GameState.workspace.filter(i => i.id !== item2Data.id);
            
            // Tiến hành gọi AI ghép đồ
            mergeElements(draggedData, item2Data, dropX, dropY);
        } else {
            // KHÔNG VA CHẠM -> RỚT XUỐNG BÀN (LƯU TỌA ĐỘ)
            GameState.workspace.push({
                id: dragEl.dataset.id,
                name: dragEl.dataset.name,
                emoji: dragEl.dataset.emoji,
                x: dropX,
                y: dropY
            });
            
            // Gắn lại sự kiện mousedown cho cục vừa rớt (để kéo tiếp được)
            dragEl.addEventListener('mousedown', handleDragStart, { passive: false });
            dragEl.addEventListener('touchstart', handleDragStart, { passive: false });
        }

        saveGame();
        dragEl = null;
    }

    // ==================== LOGIC GỌI AI ĐỂ GHÉP ĐỒ ====================
    async function mergeElements(item1, item2, dropX, dropY) {
        const doc = getDoc();
        const loading = doc.getElementById('craft-loading');
        loading.classList.add('show');

        try {
            const PhoneSystem = window.parent.PhoneSystem;
            const settings = PhoneSystem.getSettings();
            if (!settings.apiConfig || !settings.apiConfig.apiKey) {
                throw new Error('Chưa cài đặt API Key trong Cài đặt điện thoại!');
            }

            const prompt = `You are the logic engine for an "Infinite Craft" game.
I am combining two elements. You must decide logically or creatively what they create.
Element 1: "${item1.emoji} ${item1.name}"
Element 2: "${item2.emoji} ${item2.name}"

Reply ONLY in JSON format: {"name": "Result Name", "emoji": "ResultEmoji"}
Rule 1: Translate the "name" to Vietnamese. Keep it short (1-3 words).
Rule 2: Use exactly ONE suitable emoji.
Rule 3: NO markdown, NO code blocks, ONLY valid JSON.`;

            console.log(`[Infinite Craft] Đang ghép: ${item1.name} + ${item2.name}`);

            const resultStr = await PhoneSystem.callExternalAPI([
                { role: 'user', content: prompt }
            ], { temperature: 0.7 });

            const jsonMatch = resultStr.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('AI không trả về JSON hợp lệ');

            const resultObj = JSON.parse(jsonMatch[0]);
            
            if (!resultObj.name || !resultObj.emoji) throw new Error('Thiếu trường dữ liệu');

            handleMergeSuccess(resultObj.name, resultObj.emoji, dropX, dropY);

        } catch (e) {
            console.error('[Infinite Craft] Lỗi ghép đồ:', e);
            alert("Lỗi ghép đồ: " + e.message);
            // Phục hồi lại 2 item nếu lỗi mạng
            GameState.workspace.push({ ...item1, x: dropX - 20, y: dropY });
            GameState.workspace.push({ ...item2, x: dropX + 20, y: dropY });
            renderWorkspace();
        } finally {
            loading.classList.remove('show');
            saveGame();
        }
    }

    function handleMergeSuccess(newName, newEmoji, x, y) {
        const doc = getDoc();
        const wsContainer = doc.getElementById('craft-workspace');

        const flash = doc.createElement('div');
        flash.className = 'craft-flash';
        flash.style.left = `${x + 30}px`; 
        flash.style.top = `${y + 15}px`;
        wsContainer.appendChild(flash);
        setTimeout(() => flash.remove(), 500);

        const isNew = !GameState.inventory.some(i => i.name.toLowerCase() === newName.toLowerCase());
        
        if (isNew) {
            GameState.inventory.push({ name: newName, emoji: newEmoji });
            renderInventory(); 
        }

        const newId = Date.now().toString() + '_' + Math.floor(Math.random() * 1000);
        GameState.workspace.push({ id: newId, name: newName, emoji: newEmoji, x: x, y: y });
        
        const el = doc.createElement('div');
        el.className = `craft-item ${isNew ? 'new-discovery' : ''}`;
        el.dataset.id = newId;
        el.dataset.name = newName;
        el.dataset.emoji = newEmoji;
        el.dataset.source = 'workspace';
        el.style.position = 'absolute';
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.innerHTML = `${newEmoji} ${newName}`;
        
        el.addEventListener('mousedown', handleDragStart, { passive: false });
        el.addEventListener('touchstart', handleDragStart, { passive: false });
        
        wsContainer.appendChild(el);

        if (isNew) {
            setTimeout(() => el.classList.remove('new-discovery'), 2000);
        }
    }


    // ==================== KHỞI TẠO & ĐĂNG KÝ VÀO ĐIỆN THOẠI ====================
    async function openApp() {
        const phoneSystem = window.parent.PhoneSystem;
        if (!phoneSystem || !phoneSystem.iframeWindow) {
            setTimeout(openApp, 200);
            return;
        }

        const iframeDoc = phoneSystem.iframeWindow.document;
        currentIframeDoc = iframeDoc;

        const appContainer = iframeDoc.getElementById('app-container');
        if (!appContainer) return;

        iframeDoc.getElementById('home-screen').style.display = 'none';
        appContainer.innerHTML = '';
        appContainer.style.display = 'block';
        appContainer.style.pointerEvents = 'auto';

        let styleTag = iframeDoc.getElementById('craft-app-styles');
        if (!styleTag) {
            styleTag = iframeDoc.createElement('style');
            styleTag.id = 'craft-app-styles';
            iframeDoc.head.appendChild(styleTag);
        }
        styleTag.textContent = CRAFT_STYLES;

        const appDiv = iframeDoc.createElement('div');
        appDiv.id = 'craft-app-wrapper';
        appDiv.style.cssText = 'width:100%;height:100%;';
        appDiv.innerHTML = generateHTML();
        appContainer.appendChild(appDiv);

        iframeDoc.getElementById('btn-exit-app').addEventListener('click', () => {
            window.parent.PhoneSystem.goHome();
        });

        iframeDoc.getElementById('btn-continue-game').addEventListener('click', () => startGame(false));
        
        iframeDoc.getElementById('btn-new-game').addEventListener('click', () => {
            if (hasSavedGame()) {
                if(confirm("Tạo mới sẽ xóa toàn bộ túi đồ hiện tại. Bạn chắc chứ?")) startGame(true);
            } else {
                startGame(true);
            }
        });

        iframeDoc.getElementById('btn-clear-workspace').addEventListener('click', () => {
            GameState.workspace = [];
            saveGame();
            renderWorkspace();
        });

        iframeDoc.removeEventListener('mousemove', handleDragMove);
        iframeDoc.removeEventListener('touchmove', handleDragMove);
        iframeDoc.removeEventListener('mouseup', handleDragEnd);
        iframeDoc.removeEventListener('touchend', handleDragEnd);

        iframeDoc.addEventListener('mousemove', handleDragMove, { passive: false });
        iframeDoc.addEventListener('touchmove', handleDragMove, { passive: false });
        iframeDoc.addEventListener('mouseup', handleDragEnd);
        iframeDoc.addEventListener('touchend', handleDragEnd);

        updateMenuUI();
    }

    function closeApp() {
        if (!window.parent?.PhoneSystem?.iframeWindow) return;
        const iframeDoc = window.parent.PhoneSystem.iframeWindow.document;
        const appContainer = iframeDoc.getElementById('app-container');
        if (appContainer) {
            appContainer.innerHTML = '';
            appContainer.style.pointerEvents = 'none';
        }
        iframeDoc.getElementById('home-screen').style.display = 'block';
        
        iframeDoc.removeEventListener('mousemove', handleDragMove);
        iframeDoc.removeEventListener('touchmove', handleDragMove);
        iframeDoc.removeEventListener('mouseup', handleDragEnd);
        iframeDoc.removeEventListener('touchend', handleDragEnd);
        
        currentIframeDoc = null;
        isDragging = false;
        dragEl = null;
    }

    const check = setInterval(() => {
        if (window.parent && window.parent.PhoneSystem) {
            clearInterval(check);
            window.parent.PhoneSystem.registerApp({ 
                id: APP_ID, 
                name: APP_NAME, 
                icon: APP_ICON, 
                color: '#1a1a2e', 
                order: 9 
            });
            window.parent.PhoneSystem.on('app-opened', (data) => { if (data.id === APP_ID) openApp(); });
            window.parent.PhoneSystem.on('go-home', closeApp);
            console.log('✅ App Vô Cực Giới (Infinite Craft) đã được cập nhật lưu chung túi đồ toàn cục!');
        }
    }, 100);

})();