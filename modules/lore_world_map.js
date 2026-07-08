/**
 * KAIZ Collection - Bản Đồ Thế Giới AI (Universal World Map) - v8.0 Native App-Style Overhaul (v1.3.0.3)
 * - Xóa bỏ hoàn toàn đồ thị vật lý trôi nổi (Vis.js Graph) gây khó chịu khi kéo thả & tối ưu kém.
 * - Chuyển đổi 100% sang dạng trình bày chuẩn App Bản Đồ Điện Thoại (`index-14.js` Style):
 *   1. [📱 Bố Cục Lưới & Đường Đi (`Interactive Grid & Roads`)]: Sắp xếp theo ô lưới gọn gàng (3x3 / 4x4) xen kẽ các đường giao thông (`road-horizontal`, `road-vertical`), 0% độ trễ, 60 FPS mượt mà.
 *   2. [👥 Biểu Tượng Nhân Vật Tại Địa Điểm (`Character Avatar Pins`)]: Hiển thị avatar tròn thu nhỏ (`24x24px`) kèm ghim nhọn (`marker-pin`) ngay trên đầu ô địa điểm nơi nhân vật đang đứng/kiểm soát.
 *   3. [🏢 Điều Hướng Phân Cấp Sâu (`Drill-down SubLocations`)]: Nhấp vào Khu Vực Lớn sẽ đi sâu vào các Phân Khu / Phòng nhỏ bên trong (`subLocations`). Có nút Trở về (`[⬅️ Trở lại]`) mượt mà.
 *   4. [📋 Hộp Thoại Chi Tiết & Sự Kiện (`Location Popup`)]: Nhấp vào địa điểm cụ thể để xem toàn bộ mô tả, nhân vật hiện diện, mức độ an toàn và sự kiện.
 *   5. [⚡ Tích hợp AI Quét Đa Thể Loại & Cấu Hình Model (`Universal AI Scan & Config`)]: Vẫn giữ nguyên sức mạnh AI tự động quét lịch sử chat dựng bản đồ theo đúng thể loại truyện kèm Tải danh sách Model.
 * - Phiên bản: v1.3.0.3
 */

(function () {
    'use strict';

    console.log('[Lore World Map] Đang khởi tạo Bản Đồ Thế Giới v8.0 Native App-Style Overhaul (v1.3.0.3)...');

    const MODULE_ID = 'lore_world_map_app';
    const MODULE_TITLE = 'Bản Đồ Thế Giới (App Lưới)';
    const STORAGE_PREFIX = 'kaiz_lore_app_map_';
    const AI_CONFIG_KEY = 'kaiz_lore_graph_ai_config';

    // ============ CẤU HÌNH AI ============
    let aiConfig = {
        source: 'sillytavern', // 'sillytavern' | 'custom'
        customUrl: 'https://api.openai.com/v1/chat/completions',
        customKey: '',
        customModel: 'gpt-4o-mini',
        historyCount: 30
    };

    function loadAiConfig() {
        const raw = localStorage.getItem(AI_CONFIG_KEY);
        if (raw) {
            try { Object.assign(aiConfig, JSON.parse(raw)); } catch (e) {}
        }
    }

    function saveAiConfig() {
        try { localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig)); } catch (e) {}
    }

    // ============ DỮ LIỆU BẢN ĐỒ (HIERARCHICAL STRUCTURE) ============
    // Cấu trúc chuẩn App Bản đồ: { locations: [ { id, name, icon, category, danger_level, controlled_by, context_type, description, status, characters: [], subLocations: [] } ] }
    let activeChatId = 'default_global_chat';
    let mapData = { locations: [] };
    let currentParentLocation = null; // null = trang chủ (danh sách khu vực lớn), object = đang ở trong subLocations của khu vực đó
    let selectedDetailLocation = null; // để hiển thị Location Popup

    const SVG_GLOBE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

    function getActiveChatId() {
        try {
            const win = window.parent || window;
            if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
                const ctx = win.SillyTavern.getContext();
                if (ctx && ctx.chatId) return String(ctx.chatId);
            }
            if (win.chatId) return String(win.chatId);
            if (win.selected_chat) return String(win.selected_chat);
        } catch (e) {}
        return 'default_global_chat';
    }

    function loadMapDataForCurrentChat() {
        activeChatId = getActiveChatId();
        const raw = localStorage.getItem(STORAGE_PREFIX + activeChatId);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.locations)) {
                    mapData = parsed;
                } else if (Array.isArray(parsed.nodes)) {
                    // Tự động chuyển đổi dữ liệu từ bản graph cũ sang chuẩn App Lưới
                    mapData = convertGraphToGridApp(parsed);
                    saveMapData();
                } else {
                    mapData = { locations: [] };
                }
            } catch (e) {
                mapData = { locations: [] };
            }
        } else {
            // Thử kiểm tra xem có dữ liệu graph cũ không để chuyển sang
            const oldRaw = localStorage.getItem('kaiz_lore_graph_map_' + activeChatId);
            if (oldRaw) {
                try {
                    const oldParsed = JSON.parse(oldRaw);
                    if (Array.isArray(oldParsed.nodes) && oldParsed.nodes.length > 0) {
                        mapData = convertGraphToGridApp(oldParsed);
                        saveMapData();
                        updateUI();
                        return;
                    }
                } catch (e) {}
            }

            mapData = {
                locations: [
                    {
                        id: 'loc_start',
                        name: 'Khu Vực Khởi Đầu',
                        icon: 'fa-building',
                        category: 'major_hub',
                        context_type: 'Khu vực chính',
                        danger_level: 'An toàn bình thường',
                        controlled_by: 'Chung / Không rõ',
                        status: 'Hoạt động bình thường',
                        description: 'Địa điểm xuất phát của câu chuyện trong phòng chat này. Nhấp vào đây để xem chi tiết hoặc thêm phân khu con bên trong.',
                        characters: ['Tôi', 'Nhân vật chính'],
                        subLocations: [
                            {
                                id: 'sub_room_1',
                                name: 'Phòng Chính / Trung Tâm',
                                icon: 'fa-door-open',
                                category: 'sub_location',
                                context_type: 'Phòng / Phân khu',
                                danger_level: 'An toàn',
                                controlled_by: 'Chung',
                                status: 'Bình thường',
                                description: 'Gian phòng chính nơi các cuộc trò chuyện thường xuyên diễn ra.',
                                characters: ['Tôi'],
                                subLocations: []
                            }
                        ]
                    }
                ]
            };
            saveMapData();
        }
        updateUI();
    }

    function convertGraphToGridApp(graphData) {
        let locations = [];
        const nodes = graphData.nodes || [];
        const edges = graphData.edges || [];

        // Lọc các major_hub làm cha
        const hubs = nodes.filter(n => n.category === 'major_hub' || !n.category);
        const subs = nodes.filter(n => n.category !== 'major_hub');

        if (hubs.length === 0 && nodes.length > 0) {
            hubs.push(nodes[0]);
        }

        hubs.forEach(h => {
            locations.push({
                id: h.id || ('loc_' + Math.random().toString(36).substr(2, 6)),
                name: h.label || 'Khu Vực',
                icon: getIconForCategory(h.category),
                category: h.category || 'major_hub',
                context_type: h.context_type || 'Khu vực',
                danger_level: h.danger_level || 'An toàn',
                controlled_by: h.controlled_by || 'Chung',
                status: h.status || 'Bình thường',
                description: h.description || '',
                characters: h.controlled_by && h.controlled_by !== 'Chung' ? [h.controlled_by] : [],
                subLocations: []
            });
        });

        // Đưa các sub_location vào subLocations của hub tương ứng (hoặc hub đầu tiên)
        subs.forEach(s => {
            const locObj = {
                id: s.id || ('sub_' + Math.random().toString(36).substr(2, 6)),
                name: s.label || 'Phân Khu',
                icon: getIconForCategory(s.category),
                category: s.category || 'sub_location',
                context_type: s.context_type || 'Phân khu',
                danger_level: s.danger_level || 'An toàn',
                controlled_by: s.controlled_by || 'Chung',
                status: s.status || 'Bình thường',
                description: s.description || '',
                characters: s.controlled_by && s.controlled_by !== 'Chung' ? [s.controlled_by] : [],
                subLocations: []
            };

            // Tìm xem có edge nào nối với hub không
            const parentEdge = edges.find(e => (e.from === s.id || e.to === s.id) && hubs.some(h => h.id === e.from || h.id === e.to));
            let parentHubId = parentEdge ? (hubs.find(h => h.id === parentEdge.from || h.id === parentEdge.to)?.id) : (locations[0]?.id);
            let parentLoc = locations.find(l => l.id === parentHubId) || locations[0];
            if (parentLoc) {
                parentLoc.subLocations.push(locObj);
            } else {
                locations.push(locObj);
            }
        });

        return { locations };
    }

    function getIconForCategory(cat) {
        switch (cat) {
            case 'major_hub': return 'fa-building';
            case 'sub_location': return 'fa-location-dot';
            case 'danger_zone': return 'fa-triangle-exclamation';
            case 'nature_or_open': return 'fa-tree';
            case 'secret_or_special': return 'fa-key';
            default: return 'fa-map-pin';
        }
    }

    function saveMapData() {
        activeChatId = getActiveChatId();
        try { localStorage.setItem(STORAGE_PREFIX + activeChatId, JSON.stringify(mapData)); } catch (e) {}
    }

    function getCharacterAvatar(charName) {
        if (!charName) return '';
        try {
            const win = window.parent || window;
            if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
                const ctx = win.SillyTavern.getContext();
                if (ctx && ctx.characters) {
                    const found = ctx.characters.find(c => c && (c.name === charName || charName.includes(c.name)));
                    if (found && found.avatar) {
                        return `/characters/${encodeURIComponent(found.avatar)}`;
                    }
                }
            }
        } catch (e) {}
        // Avatar ngẫu nhiên theo tên nếu không tìm thấy
        const hash = Array.from(charName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colors = ['#38bdf8', '#a855f7', '#f43f5e', '#10b981', '#f59e0b', '#6366f1'];
        return { isText: true, text: charName.substring(0, 2).toUpperCase(), bg: colors[hash % colors.length] };
    }

    const doc = (window.parent && window.parent.document) || document;

    function injectStyles() {
        if (doc.getElementById('lore-world-map-app-styles-v8')) return;
        const style = doc.createElement('style');
        style.id = 'lore-world-map-app-styles-v8';
        style.innerHTML = `
            #lore_app_modal_overlay {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.88);
                backdrop-filter: blur(14px);
                z-index: 99999999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 10px;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
            }
            #lore_app_modal_content {
                width: 100%;
                max-width: 1300px;
                height: 94vh;
                border-radius: 22px;
                box-shadow: 0 25px 70px rgba(0,0,0,0.9);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
                background: radial-gradient(circle at 50% 20%, #1e1b4b 0%, #090d16 100%);
                border: 1px solid rgba(192, 132, 252, 0.35);
                color: #f8fafc;
            }
            
            /* ============ HEADER TOOLBAR RESPONSIVE ============ */
            #lore_app_header {
                min-height: 64px;
                border-bottom: 1px solid rgba(255,255,255,0.15);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 18px;
                flex-shrink: 0;
                background: rgba(0,0,0,0.65);
                gap: 12px;
                z-index: 10;
            }
            .lore-header-left {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .lore-header-actions {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            .lore-btn {
                padding: 8px 14px;
                border-radius: 10px;
                border: none;
                font-weight: 700;
                font-size: 0.86em;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                transition: all 0.15s;
                color: #fff;
                white-space: nowrap;
            }
            .lore-btn-primary { background: linear-gradient(135deg, #2563eb, #7c3aed); box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4); }
            .lore-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(124, 58, 237, 0.6); }
            .lore-btn-success { background: linear-gradient(135deg, #059669, #10b981); }
            .lore-btn-danger { background: linear-gradient(135deg, #e11d48, #f43f5e); }
            .lore-btn-secondary { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.18); color: #e2e8f0; }
            .lore-btn-secondary:hover { background: rgba(255, 255, 255, 0.18); border-color: rgba(255,255,255,0.35); }
            
            /* ============ MAIN VIEWPORT & GRID APP STYLE (index-14.js Style) ============ */
            #lore_app_viewport {
                flex: 1 1 0%;
                display: flex;
                flex-direction: column;
                overflow-y: auto;
                padding: 22px;
                position: relative;
                box-sizing: border-box;
            }
            .lore-breadcrumb {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 20px;
                background: rgba(255,255,255,0.06);
                padding: 10px 16px;
                border-radius: 14px;
                border: 1px solid rgba(255,255,255,0.12);
                font-size: 0.95em;
                font-weight: bold;
                flex-shrink: 0;
            }
            .lore-breadcrumb-btn {
                background: rgba(56, 189, 248, 0.2);
                color: #38bdf8;
                border: 1px solid rgba(56, 189, 248, 0.4);
                padding: 5px 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s;
                font-size: 0.88em;
            }
            .lore-breadcrumb-btn:hover { background: rgba(56, 189, 248, 0.35); transform: scale(1.02); }

            /* BỐ CỤC LƯỚI & ĐƯỜNG ĐI CHUẨN APP BẢN ĐỒ */
            .lore-grid-container {
                display: flex;
                flex-direction: column;
                gap: 16px;
                max-width: 1050px;
                margin: 0 auto;
                width: 100%;
            }
            .lore-grid-row {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 18px;
                position: relative;
            }
            @media (max-width: 880px) {
                #lore_app_header { flex-direction: column; align-items: stretch; max-height: 38vh; overflow-y: auto; gap: 10px; }
                .lore-header-left { justify-content: space-between; width: 100%; }
                .lore-header-actions { width: 100%; display: flex; flex-wrap: wrap; gap: 6px; }
                .lore-header-actions .lore-btn { flex: 1 1 auto; justify-content: center; }
                .lore-grid-row { grid-template-columns: repeat(2, 1fr) !important; gap: 12px; }
            }
            @media (max-width: 520px) {
                .lore-grid-row { grid-template-columns: 1fr !important; }
            }

            .location-button {
                min-height: 140px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: relative;
                background: linear-gradient(145deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.96));
                border: 2px solid rgba(148, 163, 184, 0.35);
                border-radius: 16px;
                padding: 16px 12px;
                cursor: pointer;
                transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                color: #f8fafc;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                overflow: visible;
            }
            .location-button:hover {
                transform: translateY(-4px) scale(1.02);
                border-color: #38bdf8;
                box-shadow: 0 15px 35px rgba(56, 189, 248, 0.25);
                background: linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(30, 58, 138, 0.4));
            }
            .location-button.hub-button { border-color: #c084fc; background: linear-gradient(145deg, rgba(46, 16, 101, 0.65), rgba(15, 23, 42, 0.95)); }
            .location-button.hub-button:hover { border-color: #e9d5ff; box-shadow: 0 15px 35px rgba(192, 132, 252, 0.3); }
            .location-button.danger-button { border-color: #fb7185; background: linear-gradient(145deg, rgba(136, 19, 55, 0.65), rgba(15, 23, 42, 0.95)); }
            .location-button.danger-button:hover { border-color: #fca5a5; box-shadow: 0 15px 35px rgba(251, 113, 133, 0.3); }
            
            .location-button.empty-location {
                background: rgba(15, 23, 42, 0.4);
                border: 2px dashed rgba(148, 163, 184, 0.25);
                color: #64748b;
                cursor: default;
                box-shadow: none;
            }
            .location-button.empty-location:hover { transform: none; border-color: rgba(148, 163, 184, 0.25); background: rgba(15, 23, 42, 0.4); box-shadow: none; }

            .location-button > i { font-size: 28px; margin-bottom: 8px; color: #38bdf8; z-index: 1; transition: transform 0.2s; }
            .location-button.hub-button > i { color: #c084fc; }
            .location-button.danger-button > i { color: #fb7185; }
            .location-button:hover > i { transform: scale(1.15); }
            
            .location-button > .loc-name { font-weight: 800; font-size: 1.05em; z-index: 1; line-height: 1.3; max-width: 100%; word-break: break-word; color: #f8fafc; }
            .location-button > .loc-sub-count { font-size: 0.78em; color: #93c5fd; background: rgba(59, 130, 246, 0.2); padding: 2px 8px; border-radius: 8px; margin-top: 6px; border: 1px solid rgba(59, 130, 246, 0.4); }

            /* MARKER NHÂN VẬT STANDING TRÊN ĐỊA ĐIỂM (Chuẩn index-14.js) */
            .character-markers {
                position: absolute;
                top: -16px;
                left: 0;
                right: 0;
                display: flex;
                justify-content: center;
                gap: 6px;
                pointer-events: auto;
                z-index: 5;
            }
            .character-marker {
                display: flex;
                flex-direction: column;
                align-items: center;
                cursor: pointer;
                transition: transform 0.2s ease;
                filter: drop-shadow(0 4px 6px rgba(0,0,0,0.6));
            }
            .character-marker:hover { transform: scale(1.2) translateY(-2px); z-index: 10; }
            .character-marker-avatar {
                width: 26px;
                height: 26px;
                border-radius: 50%;
                border: 2px solid #38bdf8;
                background-color: #0f172a;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: 800;
                color: #fff;
                overflow: hidden;
            }
            .character-marker-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .marker-pin {
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 6px solid #38bdf8;
                margin-top: -1px;
            }

            /* ĐƯỜNG ĐI GIAO THÔNG GIỮA CÁC Ô (Roads) */
            .road-horizontal {
                height: 16px;
                background: linear-gradient(90deg, rgba(56,189,248,0.1) 0%, rgba(56,189,248,0.3) 50%, rgba(56,189,248,0.1) 100%);
                border-top: 1px dashed rgba(56,189,248,0.4);
                border-bottom: 1px dashed rgba(56,189,248,0.4);
                margin: 4px 0;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                color: #7dd3fc;
                letter-spacing: 2px;
            }
            .road-vertical {
                width: 16px;
                background: linear-gradient(180deg, rgba(56,189,248,0.1) 0%, rgba(56,189,248,0.3) 50%, rgba(56,189,248,0.1) 100%);
                border-left: 1px dashed rgba(56,189,248,0.4);
                border-right: 1px dashed rgba(56,189,248,0.4);
                margin: 0 auto;
                border-radius: 4px;
            }

            /* MODAL CHI TIẾT ĐỊA ĐIỂM & CÀI ĐẶT AI (Đã sửa lỗi không bị khuất phần đầu) */
            #lore_location_detail_modal, #lore_ai_config_modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(10px);
                z-index: 100000000 !important;
                display: none;
                overflow-y: auto;
                padding: 30px 16px;
                box-sizing: border-box;
            }
            #lore_location_detail_box, #lore_ai_config_box {
                width: 100%;
                max-width: 600px;
                background: #0f172a;
                border: 2px solid #38bdf8;
                border-radius: 20px;
                padding: 24px;
                color: #fff;
                box-shadow: 0 25px 60px rgba(0,0,0,0.95);
                display: flex;
                flex-direction: column;
                gap: 14px;
                margin: auto;
                flex-shrink: 0;
                position: relative;
            }
            .lore-input {
                padding: 8px 11px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.18);
                background: rgba(0,0,0,0.45);
                color: #fff;
                font-size: 0.88em;
                outline: none;
            }
            .lore-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }
            @keyframes lorePulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
                100% { transform: scale(1); }
            }
            .lore-ai-loading { animation: lorePulse 1.2s infinite ease-in-out; }
        `;
        doc.head.appendChild(style);
    }

    function registerToMasterBall() {
        const win = window.parent || window;
        const fmmConfig = {
            id: MODULE_ID,
            label: MODULE_TITLE,
            icon: SVG_GLOBE_ICON,
            color: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
            order: 18,
            onClick: () => toggleAppModal()
        };

        if (win.FloatingMenuManager && typeof win.FloatingMenuManager.registerButton === 'function') {
            win.FloatingMenuManager.registerButton(fmmConfig);
        } else {
            win._fmmPendingRegistrations = win._fmmPendingRegistrations || [];
            if (!win._fmmPendingRegistrations.some(b => b.id === fmmConfig.id)) {
                win._fmmPendingRegistrations.push(fmmConfig);
            }
        }
    }

    function createAppModal() {
        if (doc.getElementById('lore_app_modal_overlay')) return;
        loadAiConfig();

        const overlay = doc.createElement('div');
        overlay.id = 'lore_app_modal_overlay';
        overlay.innerHTML = `
            <div id="lore_app_modal_content">
                <!-- Header Toolbar Responsive -->
                <div id="lore_app_header">
                    <div class="lore-header-left">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #38bdf8, #818cf8); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 12px rgba(56,189,248,0.4); flex-shrink: 0;">
                            ${SVG_GLOBE_ICON}
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 1.1em; color: #f8fafc; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span>BẢN ĐỒ THẾ GIỚI (v1.3.0.3)</span>
                                <span id="lore_stats_badge" style="background: rgba(56,189,248,0.18); color: #38bdf8; font-size: 0.75em; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.3);">0 khu vực</span>
                                <span id="lore_ai_badge" style="background: rgba(168,85,247,0.18); color: #c084fc; font-size: 0.75em; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(168,85,247,0.3); cursor: pointer;" title="Nhấp để cấu hình AI">🤖 Nguồn AI</span>
                            </div>
                            <div id="lore_chat_status" style="font-size: 0.78em; color: #94a3b8; margin-top: 2px;">Chat ID: <span style="color: #c084fc;">...</span> | Chế độ Lưới & Phân Cấp Chuẩn App</div>
                        </div>
                    </div>

                    <div class="lore-header-actions">
                        <button id="lore_btn_ai_scan" class="lore-btn lore-btn-primary" title="AI quét lịch sử chat dựng bản đồ chính xác theo bối cảnh">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Quét & Xây Map
                        </button>

                        <button id="lore_btn_add_location" class="lore-btn lore-btn-secondary" title="Thêm địa điểm vào khu vực đang xem">
                            <i class="fa-solid fa-plus"></i> + Thêm Địa Điểm
                        </button>

                        <button id="lore_btn_ai_settings" class="lore-btn lore-btn-secondary" title="Cấu hình AI & Tải danh sách Model">
                            <i class="fa-solid fa-gear"></i> Cấu hình AI
                        </button>

                        <button id="lore_btn_close_app" class="lore-btn" style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #f87171; padding: 8px 12px; font-size: 1.05em;" title="Đóng bản đồ">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Viewport & Grid App -->
                <div id="lore_app_viewport">
                    <!-- Breadcrumb Header -->
                    <div id="lore_breadcrumb_container" class="lore-breadcrumb" style="display: none;">
                        <button id="btn_back_parent" class="lore-breadcrumb-btn"><i class="fa-solid fa-arrow-left"></i> Trở về Khu Vực Lớn</button>
                        <span style="color: #64748b;">/</span>
                        <span id="breadcrumb_current_name" style="color: #38bdf8; font-size: 1.05em;">Tên Phân Khu</span>
                    </div>

                    <!-- Lưới Địa Điểm & Đường Đi -->
                    <div id="lore_grid_container" class="lore-grid-container">
                        <!-- Nạp động -->
                    </div>
                </div>
            </div>

            <!-- MODAL CHI TIẾT ĐỊA ĐIỂM -->
            <div id="lore_location_detail_modal">
                <div id="lore_location_detail_box">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i id="det_icon" class="fas fa-building" style="font-size: 1.5em; color: #38bdf8;"></i>
                            <span id="det_name" style="font-size: 1.25em; font-weight: 800; color: #f8fafc;">Tên địa điểm</span>
                        </div>
                        <span id="det_close" style="cursor: pointer; color: #f87171; font-size: 1.2em; padding: 4px 8px;">✕</span>
                    </div>

                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span id="det_category_badge" style="padding: 4px 10px; border-radius: 8px; background: rgba(168,85,247,0.2); color: #d8b4fe; font-size: 0.82em; font-weight: bold; border: 1px solid rgba(168,85,247,0.4);">🏢 Khu vực lớn</span>
                        <span id="det_danger_badge" style="padding: 4px 10px; border-radius: 8px; background: rgba(34,197,94,0.2); color: #4ade80; font-size: 0.82em; font-weight: bold; border: 1px solid rgba(34,197,94,0.4);">🛡️ An toàn</span>
                        <span id="det_type_badge" style="padding: 4px 10px; border-radius: 8px; background: rgba(59,130,246,0.2); color: #93c5fd; font-size: 0.82em; font-weight: bold; border: 1px solid rgba(59,130,246,0.4);">🏷️ Khu vực</span>
                    </div>

                    <div style="background: rgba(255,255,255,0.05); border-radius: 14px; padding: 14px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">👥 Nhân vật kiểm soát / Hiện diện</div>
                        <div id="det_characters" style="font-size: 0.95em; color: #38bdf8; font-weight: bold;">Chung / Không rõ</div>
                    </div>

                    <div>
                        <div style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">📜 Mô tả chi tiết & Sự Kiện</div>
                        <div id="det_description" style="font-size: 0.92em; color: #e2e8f0; line-height: 1.6; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; min-height: 60px; white-space: pre-wrap;">Không có mô tả.</div>
                    </div>

                    <div style="display: flex; gap: 8px; margin-top: 6px; justify-content: flex-end;">
                        <button id="det_btn_edit" class="lore-btn lore-btn-primary" style="padding: 8px 16px;">
                            <i class="fa-solid fa-pen"></i> Chỉnh Sửa
                        </button>
                        <button id="det_btn_enter_sub" class="lore-btn lore-btn-success" style="padding: 8px 16px; display: none;">
                            <i class="fa-solid fa-door-open"></i> Vào Phân Khu Con
                        </button>
                        <button id="det_btn_delete" class="lore-btn lore-btn-danger" style="padding: 8px 16px;">
                            <i class="fa-solid fa-trash"></i> Xóa
                        </button>
                    </div>
                </div>
            </div>

            <!-- MODAL CÀI ĐẶT AI v8.0 -->
            <div id="lore_ai_config_modal">
                <div id="lore_ai_config_box">
                    <div style="font-weight: 800; font-size: 1.15em; color: #38bdf8; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 10px;">
                        <span>🤖 CẤU HÌNH NGUỒN KẾT NỐI AI</span>
                        <span id="ai_cfg_close" style="cursor: pointer; color: #f87171; font-size: 1.1em;">✕</span>
                    </div>

                    <div style="font-size: 0.85em; color: #cbd5e1; line-height: 1.5; background: rgba(56,189,248,0.1); padding: 10px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.25);">
                        ℹ️ <b>App Lưới Đa Thể Loại:</b> Tự động nhận diện bối cảnh truyện để xây dựng lưới khu vực và phân khu chính xác (Học đường, Tu tiên, Sci-Fi, Horror...).
                    </div>

                    <div>
                        <label style="font-size: 0.8em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Nguồn Kết Nối (Backend Source)</label>
                        <select id="cfg_source" class="lore-input" style="width: 100%; margin-top: 4px;">
                            <option value="sillytavern">⭐ Sử dụng AI đang kích hoạt của SillyTavern (Mặc định)</option>
                            <option value="custom">🔑 Chế độ 2: Custom API Endpoint & Model riêng</option>
                        </select>
                    </div>

                    <div id="cfg_custom_group" style="display: none; flex-direction: column; gap: 10px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);">
                        <div>
                            <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold;">API Endpoint URL</label>
                            <input id="cfg_url" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px;" placeholder="https://api.openai.com/v1/chat/completions">
                        </div>
                        <div>
                            <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold;">API Key</label>
                            <input id="cfg_key" type="password" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px;" placeholder="sk-.......">
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                                <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold;">Tên Model (Model Name)</label>
                                <button id="cfg_btn_fetch_models" class="lore-btn" style="background: rgba(56,189,248,0.2); border: 1px solid #38bdf8; color: #38bdf8; padding: 4px 10px; font-size: 0.78em;">
                                    <i class="fa-solid fa-arrows-rotate"></i> Tải danh sách Model
                                </button>
                            </div>
                            <div style="display: flex; gap: 6px; margin-top: 6px;">
                                <input id="cfg_model" type="text" class="lore-input" style="flex: 1; box-sizing: border-box;" placeholder="Nhập tên model hoặc chọn bên phải ->">
                                <select id="cfg_model_select" class="lore-input" style="width: 170px; display: none;"></select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style="font-size: 0.8em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Số tin nhắn quét gần nhất mỗi lần</label>
                        <select id="cfg_history_count" class="lore-input" style="width: 100%; margin-top: 4px;">
                            <option value="15">15 tin nhắn (Nhanh)</option>
                            <option value="30">30 tin nhắn (Khuyên dùng - Chuẩn xác)</option>
                            <option value="50">50 tin nhắn (Sâu & Chi tiết)</option>
                            <option value="100">100 tin nhắn (Toàn cảnh lịch sử dài)</option>
                        </select>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;">
                        <button id="ai_cfg_save" class="lore-btn lore-btn-success" style="padding: 10px 20px;">
                            <i class="fa-solid fa-check"></i> Lưu Cấu Hình AI
                        </button>
                    </div>
                </div>
            </div>
        `;
        doc.body.appendChild(overlay);

        overlay.querySelector('#lore_btn_close_app').addEventListener('click', () => overlay.style.display = 'none');
        overlay.querySelector('#btn_back_parent').addEventListener('click', () => {
            currentParentLocation = null;
            renderAppGrid();
        });

        // Xử lý nút Thêm Địa Điểm
        overlay.querySelector('#lore_btn_add_location').addEventListener('click', () => {
            const name = prompt('Nhập tên địa điểm/phân khu mới:', 'Phòng / Khu Vực Mới');
            if (!name || !name.trim()) return;
            const contextType = prompt('Loại địa điểm theo bối cảnh (VD: Phòng học, Trạm vũ trụ, Quán ăn, Động phủ...):', currentParentLocation ? 'Phân khu' : 'Khu vực lớn') || 'Khu vực';
            const danger = prompt('Mức độ an toàn / rủi ro tại đây:', 'An toàn bình thường') || 'An toàn';
            const controlled = prompt('Nhân vật nào đang đứng tại hoặc quản lý nơi này? (Nhập tên để hiện Avatar):', 'Tôi') || 'Chung';
            const desc = prompt('Mô tả chi tiết hoặc sự kiện diễn ra tại đây:', 'Một địa điểm vừa được thêm vào bản đồ.') || '';

            const newLoc = {
                id: 'loc_' + Date.now(),
                name: name.trim(),
                icon: currentParentLocation ? 'fa-door-open' : 'fa-building',
                category: currentParentLocation ? 'sub_location' : 'major_hub',
                context_type: contextType.trim(),
                danger_level: danger.trim(),
                controlled_by: controlled.trim(),
                status: 'Bình thường',
                description: desc.trim(),
                characters: controlled && controlled !== 'Chung' ? controlled.split(',').map(c => c.trim()) : [],
                subLocations: []
            };

            if (currentParentLocation) {
                currentParentLocation.subLocations = currentParentLocation.subLocations || [];
                currentParentLocation.subLocations.push(newLoc);
            } else {
                mapData.locations.push(newLoc);
            }
            saveMapData();
            renderAppGrid();
        });

        // Xử lý AI Quét Map
        overlay.querySelector('#lore_btn_ai_scan').addEventListener('click', async () => {
            await triggerAiWorldScan();
        });

        // Xử lý Cài đặt AI & Fetch Model
        const aiModal = overlay.querySelector('#lore_ai_config_modal');
        const btnAiSettings = overlay.querySelector('#lore_btn_ai_settings');
        const badgeAi = overlay.querySelector('#lore_ai_badge');

        function openAiConfig() {
            loadAiConfig();
            const sourceSelect = overlay.querySelector('#cfg_source');
            const customGroup = overlay.querySelector('#cfg_custom_group');
            sourceSelect.value = aiConfig.source || 'sillytavern';
            overlay.querySelector('#cfg_url').value = aiConfig.customUrl || '';
            overlay.querySelector('#cfg_key').value = aiConfig.customKey || '';
            overlay.querySelector('#cfg_model').value = aiConfig.customModel || 'gpt-4o-mini';
            overlay.querySelector('#cfg_history_count').value = String(aiConfig.historyCount || 30);

            customGroup.style.display = sourceSelect.value === 'custom' ? 'flex' : 'none';
            aiModal.style.display = 'flex';
        }

        btnAiSettings.addEventListener('click', openAiConfig);
        badgeAi.addEventListener('click', openAiConfig);

        overlay.querySelector('#cfg_source').addEventListener('change', e => {
            overlay.querySelector('#cfg_custom_group').style.display = e.target.value === 'custom' ? 'flex' : 'none';
        });

        overlay.querySelector('#ai_cfg_close').addEventListener('click', () => aiModal.style.display = 'none');

        const btnFetchModels = overlay.querySelector('#cfg_btn_fetch_models');
        const modelInput = overlay.querySelector('#cfg_model');
        const modelSelect = overlay.querySelector('#cfg_model_select');

        btnFetchModels.addEventListener('click', async () => {
            let url = overlay.querySelector('#cfg_url').value.trim();
            const key = overlay.querySelector('#cfg_key').value.trim();
            if (!url) { alert('Vui lòng nhập API Endpoint URL trước!'); return; }

            btnFetchModels.disabled = true;
            btnFetchModels.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...`;

            try {
                let modelsUrl = url;
                if (modelsUrl.endsWith('/chat/completions')) modelsUrl = modelsUrl.replace('/chat/completions', '/models');
                else if (modelsUrl.endsWith('/v1')) modelsUrl = modelsUrl + '/models';
                else if (!modelsUrl.endsWith('/models')) modelsUrl = modelsUrl.replace(/\/+$/, '') + '/models';

                const headers = { 'Content-Type': 'application/json' };
                if (key) headers['Authorization'] = `Bearer ${key}`;

                const res = await fetch(modelsUrl, { method: 'GET', headers });
                if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể kết nối tới ${modelsUrl}`);
                const data = await res.json();

                let list = [];
                if (data && Array.isArray(data.data)) list = data.data.map(m => m.id || m.name).filter(Boolean);
                else if (data && Array.isArray(data.models)) list = data.models.map(m => m.id || m.name || m).filter(Boolean);
                else if (Array.isArray(data)) list = data.map(m => m.id || m.name || String(m)).filter(Boolean);

                if (list.length === 0) throw new Error('Không tìm thấy danh sách model hợp lệ từ API!');

                modelSelect.innerHTML = list.map(m => `<option value="${m}" ${m === modelInput.value ? 'selected' : ''}>${m}</option>`).join('');
                modelSelect.style.display = 'block';
                modelInput.style.width = '160px';
                if (list[0] && !modelInput.value) modelInput.value = list[0];
                modelSelect.onchange = () => { modelInput.value = modelSelect.value; };
                alert(`🎉 Đã tải thành công ${list.length} model!`);
            } catch (err) {
                alert('⚠️ Lỗi tải model: ' + err.message);
            } finally {
                btnFetchModels.disabled = false;
                btnFetchModels.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> Tải danh sách Model`;
            }
        });

        overlay.querySelector('#ai_cfg_save').addEventListener('click', () => {
            aiConfig.source = overlay.querySelector('#cfg_source').value;
            aiConfig.customUrl = overlay.querySelector('#cfg_url').value.trim();
            aiConfig.customKey = overlay.querySelector('#cfg_key').value.trim();
            aiConfig.customModel = overlay.querySelector('#cfg_model').value.trim();
            aiConfig.historyCount = parseInt(overlay.querySelector('#cfg_history_count').value, 10) || 30;
            saveAiConfig();
            updateUI();
            aiModal.style.display = 'none';
            alert('Đã lưu cấu hình AI!');
        });

        // Xử lý Modal Chi Tiết
        const detModal = overlay.querySelector('#lore_location_detail_modal');
        overlay.querySelector('#det_close').addEventListener('click', () => detModal.style.display = 'none');

        overlay.querySelector('#det_btn_edit').addEventListener('click', () => {
            if (!selectedDetailLocation) return;
            const newName = prompt('Tên địa điểm:', selectedDetailLocation.name);
            if (!newName || !newName.trim()) return;
            selectedDetailLocation.name = newName.trim();
            selectedDetailLocation.context_type = prompt('Loại địa điểm:', selectedDetailLocation.context_type || 'Khu vực') || 'Khu vực';
            selectedDetailLocation.controlled_by = prompt('Nhân vật đứng tại / kiểm soát:', selectedDetailLocation.controlled_by || 'Chung') || 'Chung';
            selectedDetailLocation.characters = selectedDetailLocation.controlled_by ? selectedDetailLocation.controlled_by.split(',').map(c => c.trim()).filter(Boolean) : [];
            selectedDetailLocation.danger_level = prompt('Mức độ an toàn:', selectedDetailLocation.danger_level || 'An toàn') || 'An toàn';
            selectedDetailLocation.description = prompt('Mô tả chi tiết:', selectedDetailLocation.description || '') || '';
            saveMapData();
            detModal.style.display = 'none';
            renderAppGrid();
        });

        overlay.querySelector('#det_btn_enter_sub').addEventListener('click', () => {
            if (!selectedDetailLocation) return;
            detModal.style.display = 'none';
            currentParentLocation = selectedDetailLocation;
            renderAppGrid();
        });

        overlay.querySelector('#det_btn_delete').addEventListener('click', () => {
            if (!selectedDetailLocation || !confirm(`Bạn có chắc muốn xóa "${selectedDetailLocation.name}"?`)) return;
            if (currentParentLocation && Array.isArray(currentParentLocation.subLocations)) {
                currentParentLocation.subLocations = currentParentLocation.subLocations.filter(l => l.id !== selectedDetailLocation.id);
            } else {
                mapData.locations = mapData.locations.filter(l => l.id !== selectedDetailLocation.id);
            }
            saveMapData();
            detModal.style.display = 'none';
            renderAppGrid();
        });
    }

    function updateUI() {
        loadAiConfig();
        const statusBox = doc.getElementById('lore_chat_status');
        const badgeStats = doc.getElementById('lore_stats_badge');
        const badgeAi = doc.getElementById('lore_ai_badge');

        if (statusBox) statusBox.innerHTML = `Chat ID: <span style="color: #c084fc;">${activeChatId}</span> | Chế độ Lưới & Phân Cấp Chuẩn App`;
        if (badgeStats) {
            let total = mapData.locations.length;
            mapData.locations.forEach(l => { if (Array.isArray(l.subLocations)) total += l.subLocations.length; });
            badgeStats.innerText = `${total} địa điểm/phân khu`;
        }
        if (badgeAi) {
            badgeAi.innerText = aiConfig.source === 'custom' ? `⚡ Custom AI (${aiConfig.customModel || 'model'})` : `⭐ SillyTavern AI`;
        }
    }

    function renderAppGrid() {
        updateUI();
        const gridContainer = doc.getElementById('lore_grid_container');
        const breadcrumb = doc.getElementById('lore_breadcrumb_container');
        const breadcrumbName = doc.getElementById('breadcrumb_current_name');
        if (!gridContainer) return;

        let currentList = [];
        if (currentParentLocation) {
            breadcrumb.style.display = 'flex';
            breadcrumbName.innerText = currentParentLocation.name;
            currentList = currentParentLocation.subLocations || [];
        } else {
            breadcrumb.style.display = 'none';
            currentList = mapData.locations || [];
        }

        if (currentList.length === 0) {
            gridContainer.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #64748b; background: rgba(255,255,255,0.02); border-radius: 18px; border: 1px dashed rgba(255,255,255,0.12);">
                    <i class="fa-solid fa-map-location-dot" style="font-size: 3.5em; color: #38bdf8; opacity: 0.5; margin-bottom: 12px;"></i>
                    <div style="font-size: 1.1em; font-weight: bold; color: #cbd5e1;">Khu vực này hiện chưa có địa điểm nào</div>
                    <div style="font-size: 0.88em; margin-top: 6px;">Bấm nút <b>[🪄 AI Quét & Xây Map]</b> ở trên hoặc nút <b>[+ Thêm Địa Điểm]</b> để thêm mới!</div>
                </div>
            `;
            return;
        }

        // Sắp xếp theo hàng 3 ô (3x3 grid) kèm đường đi giống index-14.js
        const COLS = 3;
        const rowsCount = Math.ceil(currentList.length / COLS);
        let html = '';

        for (let r = 0; r < rowsCount; r++) {
            html += `<div class="lore-grid-row">`;
            for (let c = 0; c < COLS; c++) {
                const idx = r * COLS + c;
                const loc = currentList[idx];

                if (loc) {
                    const isHub = loc.category === 'major_hub' || (!currentParentLocation && (!loc.category || loc.category === 'major_hub'));
                    const isDanger = loc.danger_level && (loc.danger_level.toLowerCase().includes('nguy') || loc.danger_level.toLowerCase().includes('cấm') || loc.danger_level.toLowerCase().includes('tử') || loc.danger_level.toLowerCase().includes('hỗn loạn'));
                    let btnClass = 'location-button';
                    if (isHub) btnClass += ' hub-button';
                    if (isDanger) btnClass += ' danger-button';

                    const subCount = Array.isArray(loc.subLocations) ? loc.subLocations.length : 0;
                    const charPinsHTML = (loc.characters && loc.characters.length > 0 ? loc.characters : (loc.controlled_by && loc.controlled_by !== 'Chung' ? [loc.controlled_by] : [])).slice(0, 3).map(charName => {
                        const avatarData = getCharacterAvatar(charName);
                        let inner = '';
                        if (typeof avatarData === 'string' && avatarData) {
                            inner = `<img src="${avatarData}" alt="${charName}" onerror="this.style.display='none'; this.parentNode.innerHTML='${charName.substring(0,2).toUpperCase()}'">`;
                        } else if (typeof avatarData === 'object') {
                            inner = `<span style="background:${avatarData.bg}; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">${avatarData.text}</span>`;
                        } else {
                            inner = `<span>${charName.substring(0,2).toUpperCase()}</span>`;
                        }
                        return `
                            <div class="character-marker" title="Nhân vật hiện diện: ${charName}" onclick="event.stopPropagation(); window._loreShowDetail('${loc.id}')">
                                <div class="character-marker-avatar">${inner}</div>
                                <div class="marker-pin"></div>
                            </div>
                        `;
                    }).join('');

                    html += `
                        <div class="${btnClass}" onclick="window._loreOnLocationClick('${loc.id}')">
                            <div class="character-markers">${charPinsHTML}</div>
                            <i class="fas ${loc.icon || 'fa-location-dot'}"></i>
                            <span class="loc-name">${loc.name}</span>
                            ${subCount > 0 ? `<span class="loc-sub-count">📁 ${subCount} phân khu con</span>` : `<span style="font-size:0.75em; color:#94a3b8; margin-top:4px;">🏷️ ${loc.context_type || 'Khu vực'}</span>`}
                        </div>
                    `;
                } else if (idx === currentList.length) {
                    html += `
                        <div class="location-button empty-location" style="cursor: pointer; border-color: rgba(56,189,248,0.35); background: rgba(56,189,248,0.08);" onclick="document.getElementById('lore_btn_add_location').click()" title="Nhấp để thêm địa điểm vào ô trống này">
                            <i class="fas fa-plus" style="color: #38bdf8; font-size: 22px;"></i>
                            <span style="font-size: 0.92em; font-weight: bold; color: #38bdf8;">+ Thêm địa điểm</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="location-button empty-location" style="opacity: 0.35; border: 1px dashed rgba(148,163,184,0.15);">
                            <i class="fas fa-question" style="font-size: 18px;"></i>
                            <span style="font-size: 0.85em;">Trống</span>
                        </div>
                    `;
                }

                // Đường đi dọc giữa các ô trong cùng 1 hàng (chỉ nối khi CẢ 2 bên đều là địa điểm có thật)
                if (c < COLS - 1 && currentList[idx] && currentList[idx + 1]) {
                    html += `<div class="road-vertical" style="position: absolute; right: -17px; top: 50%; transform: translateY(-50%); height: 32px; width: 16px;"></div>`;
                }
            }
            html += `</div>`;

            // Đường nối ngang giữa các hàng (trừ hàng cuối cùng, chỉ nối khi có địa điểm tương ứng ở hàng tiếp theo)
            if (r < rowsCount - 1) {
                html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;">`;
                for (let c = 0; c < COLS; c++) {
                    const topLoc = currentList[r * COLS + c];
                    const bottomLoc = currentList[(r + 1) * COLS + c];
                    if (topLoc && bottomLoc) {
                        html += `<div class="road-horizontal">⦙ NỐI LIỀN ⦙</div>`;
                    } else {
                        html += `<div></div>`;
                    }
                }
                html += `</div>`;
            }
        }

        gridContainer.innerHTML = html;
    }

    window._loreOnLocationClick = function (locId) {
        let list = currentParentLocation ? (currentParentLocation.subLocations || []) : mapData.locations;
        const found = list.find(l => l.id === locId);
        if (!found) return;

        // Nếu là khu vực lớn và có subLocations -> Đi vào sâu phân khu bên trong (như App Bản đồ index-14.js)
        if (!currentParentLocation && Array.isArray(found.subLocations) && found.subLocations.length > 0) {
            currentParentLocation = found;
            renderAppGrid();
        } else {
            // Mở Popup chi tiết địa điểm
            window._loreShowDetail(locId);
        }
    };

    window._loreShowDetail = function (locId) {
        let list = currentParentLocation ? (currentParentLocation.subLocations || []) : mapData.locations;
        const found = list.find(l => l.id === locId) || mapData.locations.find(l => l.id === locId);
        if (!found) return;

        selectedDetailLocation = found;
        const detModal = doc.getElementById('lore_location_detail_modal');
        if (!detModal) return;

        doc.getElementById('det_icon').className = `fas ${found.icon || 'fa-building'}`;
        doc.getElementById('det_name').innerText = found.name;
        doc.getElementById('det_category_badge').innerText = found.category === 'major_hub' ? '🏢 Trung tâm / Khu vực lớn' : '📍 Phân khu / Phòng';
        doc.getElementById('det_type_badge').innerText = `🏷️ ${found.context_type || 'Khu vực'}`;
        
        const dangerBadge = doc.getElementById('det_danger_badge');
        dangerBadge.innerText = `🛡️ ${found.danger_level || 'An toàn'}`;
        if (found.danger_level && (found.danger_level.toLowerCase().includes('nguy') || found.danger_level.toLowerCase().includes('cấm') || found.danger_level.toLowerCase().includes('tử'))) {
            dangerBadge.style.background = 'rgba(239, 68, 68, 0.2)';
            dangerBadge.style.color = '#f87171';
            dangerBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        } else {
            dangerBadge.style.background = 'rgba(34, 197, 94, 0.2)';
            dangerBadge.style.color = '#4ade80';
            dangerBadge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        }

        const charsList = found.characters && found.characters.length > 0 ? found.characters.join(', ') : (found.controlled_by || 'Chung / Không rõ');
        doc.getElementById('det_characters').innerText = charsList;
        doc.getElementById('det_description').innerText = found.description || 'Không có thông tin mô tả nào cho địa điểm này.';

        const btnEnterSub = doc.getElementById('det_btn_enter_sub');
        if (!currentParentLocation && Array.isArray(found.subLocations) && found.subLocations.length > 0) {
            btnEnterSub.style.display = 'inline-flex';
        } else {
            btnEnterSub.style.display = 'none';
        }

        detModal.style.display = 'flex';
    };

    async function triggerAiWorldScan() {
        loadAiConfig();
        const btnScan = doc.getElementById('lore_btn_ai_scan');
        if (btnScan) {
            btnScan.disabled = true;
            btnScan.classList.add('lore-ai-loading');
            btnScan.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang đọc chat & dựng lưới bản đồ...`;
        }

        try {
            const win = window.parent || window;
            let chatArray = [];
            if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
                const ctx = win.SillyTavern.getContext();
                if (ctx && Array.isArray(ctx.chat)) chatArray = ctx.chat;
            } else if (win.chat && Array.isArray(win.chat)) {
                chatArray = win.chat;
            }

            const historyLimit = aiConfig.historyCount || 30;
            const recentChat = chatArray.slice(-historyLimit);
            const historyText = recentChat.map(m => `${m.is_user ? 'Tôi' : (m.name || 'AI')}: ${m.mes || m.content || ''}`).join('\n---\n');

            if (!historyText || historyText.trim().length < 20) {
                alert('Lịch sử cuộc trò chuyện quá ngắn để AI phân tích bản đồ!');
                return;
            }

            const existingStr = mapData.locations.map(l => `- ${l.name} (${l.context_type}): [${(l.subLocations||[]).map(s=>s.name).join(', ')}]`).join('\n');
            const prompt = `Bạn là Kiến Trúc Sư Địa Lý Chuẩn App Bản Đồ (Universal Phone Map App Architect).
Dưới đây là Lịch sử trò chuyện gần đây (${historyLimit} tin nhắn):
=== LỊCH SỬ CHAT ===
${historyText.slice(0, 8800)}
====================

Cấu trúc bản đồ hiện có:
${existingStr || '(Chưa có)'}

NHIỆM VỤ:
1. KHÔNG áp đặt định kiến Fantasy. Hãy phân tích đúng thể loại câu chuyện (Học đường, Sci-Fi, Tu tiên, Horror, Gia đình...).
2. Tổ chức bản đồ theo cấu trúc phân cấp chuẩn App Lưới:
   - "locations": Các Khu Vực Lớn / Tòa nhà / Trung tâm / Vùng đất.
   - Bên trong mỗi khu vực lớn có "subLocations": Các Phòng / Phân khu cụ thể thuộc khu vực đó.
3. TRẢ VỀ DUY NHẤT 1 JSON HỢP LỆ theo định dạng:
{
  "locations": [
    {
      "name": "Tên Khu Vực Lớn / Trung Tâm",
      "category": "major_hub",
      "context_type": "Tòa nhà / Trường học / Trạm vũ trụ / Tông môn...",
      "danger_level": "An toàn bình thường / Cực kỳ nguy hiểm...",
      "controlled_by": "Nhân vật hoặc thế lực kiểm soát",
      "description": "Mô tả vai trò của khu vực này",
      "characters": ["Tên nhân vật A", "Tên nhân vật B đang ở đây"],
      "subLocations": [
        {
          "name": "Tên Phòng / Phân khu nhỏ bên trong",
          "category": "sub_location",
          "context_type": "Phòng học / Phòng ngủ / Sân thượng / Động phủ...",
          "danger_level": "An toàn",
          "controlled_by": "Tên nhân vật đứng tại phòng",
          "description": "Mô tả chi tiết phòng/phân khu này",
          "characters": ["Tên nhân vật đang ở đây"]
        }
      ]
    }
  ]
}`;

            let responseJson = null;

            if (aiConfig.source === 'custom' && aiConfig.customUrl) {
                try {
                    const headers = { 'Content-Type': 'application/json' };
                    if (aiConfig.customKey) headers['Authorization'] = `Bearer ${aiConfig.customKey}`;

                    const res = await fetch(aiConfig.customUrl, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            model: aiConfig.customModel || 'gpt-4o-mini',
                            messages: [
                                { role: 'system', content: 'Bạn là chuyên gia xuất JSON bản đồ App Lưới chuẩn xác 100%.' },
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.7
                        })
                    });
                    const data = await res.json();
                    if (data && data.choices && data.choices[0] && data.choices[0].message) {
                        responseJson = parseJsonFromText(data.choices[0].message.content);
                    }
                } catch (e) {
                    console.warn('[Lore World Map] Gọi Custom API thất bại:', e);
                }
            }

            if (!responseJson && win.SillyTavern && typeof win.SillyTavern.getContext === 'function' && typeof win.SillyTavern.getContext().generateRaw === 'function') {
                try {
                    const rawRes = await win.SillyTavern.getContext().generateRaw(prompt);
                    responseJson = parseJsonFromText(rawRes);
                } catch (e) {}
            }

            if (!responseJson && win.PhoneSystem && typeof win.PhoneSystem.callExternalAPI === 'function') {
                try {
                    const rawRes = await win.PhoneSystem.callExternalAPI([
                        { role: 'system', content: 'Bạn là chuyên gia xuất JSON bản đồ App Lưới chuẩn xác 100%.' },
                        { role: 'user', content: prompt }
                    ], { maxTokens: 4000, temperature: 0.7 });
                    responseJson = parseJsonFromText(rawRes);
                } catch (e) {}
            }

            if (!responseJson || !Array.isArray(responseJson.locations)) {
                throw new Error('AI không trả về JSON bản đồ hợp lệ! Vui lòng kiểm tra kết nối AI.');
            }

            let addedCount = 0;
            responseJson.locations.forEach(item => {
                if (!item || !item.name) return;
                let hub = mapData.locations.find(l => l.name.toLowerCase() === item.name.trim().toLowerCase());
                if (!hub) {
                    hub = {
                        id: 'loc_' + Math.random().toString(36).substr(2, 7),
                        name: item.name.trim(),
                        icon: 'fa-building',
                        category: 'major_hub',
                        context_type: item.context_type || 'Khu vực lớn',
                        danger_level: item.danger_level || 'An toàn',
                        controlled_by: item.controlled_by || 'Chung',
                        description: item.description || '',
                        characters: Array.isArray(item.characters) ? item.characters : [],
                        subLocations: []
                    };
                    mapData.locations.push(hub);
                    addedCount++;
                } else {
                    if (item.description && hub.description.length < item.description.length) hub.description = item.description;
                    if (Array.isArray(item.characters)) hub.characters = Array.from(new Set([...(hub.characters||[]), ...item.characters]));
                }

                if (Array.isArray(item.subLocations)) {
                    item.subLocations.forEach(sub => {
                        if (!sub || !sub.name) return;
                        hub.subLocations = hub.subLocations || [];
                        let existSub = hub.subLocations.find(s => s.name.toLowerCase() === sub.name.trim().toLowerCase());
                        if (!existSub) {
                            hub.subLocations.push({
                                id: 'sub_' + Math.random().toString(36).substr(2, 7),
                                name: sub.name.trim(),
                                icon: 'fa-door-open',
                                category: 'sub_location',
                                context_type: sub.context_type || 'Phòng / Phân khu',
                                danger_level: sub.danger_level || 'An toàn',
                                controlled_by: sub.controlled_by || 'Chung',
                                description: sub.description || '',
                                characters: Array.isArray(sub.characters) ? sub.characters : []
                            });
                            addedCount++;
                        }
                    });
                }
            });

            saveMapData();
            renderAppGrid();
            alert(`🎉 AI đã xây dựng thành công bản đồ lưới! +${addedCount} khu vực mới.`);
        } catch (err) {
            alert('⚠️ Lỗi khi quét bản đồ AI: ' + err.message);
        } finally {
            if (btnScan) {
                btnScan.disabled = false;
                btnScan.classList.remove('lore-ai-loading');
                btnScan.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> AI Quét & Xây Map`;
            }
        }
    }

    function parseJsonFromText(text) {
        if (!text) return null;
        let str = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const start = str.indexOf('{');
        const end = str.lastIndexOf('}');
        if (start !== -1 && end !== -1) str = str.substring(start, end + 1);
        return JSON.parse(str);
    }

    function toggleAppModal() {
        injectStyles();
        createAppModal();
        loadMapDataForCurrentChat();

        const overlay = doc.getElementById('lore_app_modal_overlay');
        if (overlay) {
            if (overlay.style.display === 'flex') {
                overlay.style.display = 'none';
            } else {
                overlay.style.display = 'flex';
                currentParentLocation = null;
                renderAppGrid();
            }
        }
    }

    function init() {
        injectStyles();
        registerToMasterBall();

        try {
            const win = window.parent || window;
            if (win.eventSource && typeof win.eventSource.on === 'function') {
                win.eventSource.on('chatLoaded', () => loadMapDataForCurrentChat());
            }
        } catch (e) {}
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
