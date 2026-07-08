/**
 * KAIZ Collection - Bản Đồ Thế Giới AI (Lore World Graph) - v2.0 Premium Overhaul
 * - Giao diện Glassmorphism đỉnh cao, khắc phục hoàn toàn lỗi chồng chữ & font nhãn Vis.js.
 * - Thay thế bộ điều hướng xấu xí mặc định bằng Custom Control Dock sang trọng.
 * - Tích hợp tìm kiếm thẳng lên Header Toolbar gọn gàng, ẩn bong bóng con khi mở Modal.
 * - Bảng Inspector thông minh với chế độ Tổng quan (Overview Quick Jump) & Thẻ kết nối trực quan.
 */

(function () {
    'use strict';

    console.log('[Lore World Map] Đang khởi tạo module Bản Đồ Thế Giới AI v2.0...');

    const MODULE_ID = 'lore_world_map_graph';
    const MODULE_TITLE = 'Bản Đồ Thế Giới (Graph AI)';
    const STORAGE_PREFIX = 'kaiz_lore_graph_map_';

    // ============ BỘ THEME MÀU SẮC PREMIUM ============
    const GRAPH_THEMES = {
        mystic: {
            name: '🌌 Đêm Huyền Bí',
            bg: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #0f172a 100%)',
            panelBg: 'rgba(15, 23, 42, 0.92)',
            border: 'rgba(192, 132, 252, 0.35)',
            text: '#f8fafc',
            subText: '#94a3b8',
            edgeText: '#e2e8f0',
            edgeLabelBg: 'rgba(15, 23, 42, 0.85)',
            edgeColor: '#818cf8',
            nodeColors: {
                kingdom: { bg: '#6b21a8', border: '#d8b4fe', highlight: '#a855f7' },
                city: { bg: '#1d4ed8', border: '#93c5fd', highlight: '#3b82f6' },
                dungeon: { bg: '#9f1239', border: '#fda4af', highlight: '#f43f5e' },
                forest: { bg: '#15803d', border: '#86efac', highlight: '#22c55e' },
                ruin: { bg: '#b45309', border: '#fde68a', highlight: '#f59e0b' },
                other: { bg: '#334155', border: '#cbd5e1', highlight: '#64748b' }
            }
        },
        parchment: {
            name: '📜 Bản Đồ Cổ',
            bg: 'radial-gradient(circle at 50% 50%, #fef3c7 0%, #d97706 100%)',
            panelBg: 'rgba(254, 243, 199, 0.95)',
            border: 'rgba(180, 83, 9, 0.45)',
            text: '#451a03',
            subText: '#78350f',
            edgeText: '#451a03',
            edgeLabelBg: 'rgba(254, 243, 199, 0.9)',
            edgeColor: '#9a3412',
            nodeColors: {
                kingdom: { bg: '#b45309', border: '#fef3c7', highlight: '#d97706' },
                city: { bg: '#1e40af', border: '#dbeafe', highlight: '#3b82f6' },
                dungeon: { bg: '#991b1b', border: '#fee2e2', highlight: '#dc2626' },
                forest: { bg: '#166534', border: '#dcfce7', highlight: '#22c55e' },
                ruin: { bg: '#854d0e', border: '#fef9c3', highlight: '#ca8a04' },
                other: { bg: '#57534e', border: '#f5f5f4', highlight: '#78716c' }
            }
        },
        cyberpunk: {
            name: '⚡ Cyberpunk Neon',
            bg: 'linear-gradient(135deg, #070a13 0%, #120726 100%)',
            panelBg: 'rgba(11, 10, 26, 0.94)',
            border: 'rgba(0, 240, 255, 0.45)',
            text: '#e0f7ff',
            subText: '#88ccff',
            edgeText: '#00f0ff',
            edgeLabelBg: 'rgba(7, 10, 19, 0.9)',
            edgeColor: '#00f0ff',
            nodeColors: {
                kingdom: { bg: '#ff0055', border: '#ff88bb', highlight: '#ff007f' },
                city: { bg: '#00c3ff', border: '#b3fbff', highlight: '#00e5ff' },
                dungeon: { bg: '#7000ff', border: '#d4b3ff', highlight: '#9e00ff' },
                forest: { bg: '#00ff66', border: '#aaffcc', highlight: '#00e65c' },
                ruin: { bg: '#ffaa00', border: '#ffdd99', highlight: '#ffbb00' },
                other: { bg: '#4e4e6a', border: '#ccccdd', highlight: '#707090' }
            }
        }
    };

    let currentThemeKey = 'mystic';
    let activeChatId = 'default_global_chat';
    let mapData = { nodes: [], edges: [] };
    let networkInstance = null;
    let selectedNodeId = null;

    // ============ BIỂU TƯỢNG SVG ============
    const SVG_GLOBE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

    // ============ HÀM NGẮT DÒNG NHÃN (WORD WRAP FOR VIS.JS) ============
    function wrapText(text, maxLen = 22) {
        if (!text || text.length <= maxLen) return text;
        const words = text.split(' ');
        let lines = [];
        let curLine = '';
        words.forEach(w => {
            if ((curLine + w).length > maxLen) {
                if (curLine) lines.push(curLine.trim());
                curLine = w + ' ';
            } else {
                curLine += w + ' ';
            }
        });
        if (curLine.trim()) lines.push(curLine.trim());
        return lines.join('\n');
    }

    // ============ LẤY CHAT ID TỪ SILLYTAVERN ============
    function getActiveChatId() {
        try {
            const win = window.parent || window;
            if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
                const ctx = win.SillyTavern.getContext();
                if (ctx && ctx.chatId) return String(ctx.chatId);
            }
            if (win.chatId) return String(win.chatId);
            if (win.selected_chat) return String(win.selected_chat);
        } catch (e) {
            console.warn('[Lore World Map] Không lấy được chatId, dùng mặc định.');
        }
        return 'default_global_chat';
    }

    // ============ LƯU / TẢI DỮ LIỆU ============
    function loadMapDataForCurrentChat() {
        activeChatId = getActiveChatId();
        const raw = localStorage.getItem(STORAGE_PREFIX + activeChatId);
        if (raw) {
            try {
                mapData = JSON.parse(raw);
                if (!Array.isArray(mapData.nodes)) mapData.nodes = [];
                if (!Array.isArray(mapData.edges)) mapData.edges = [];
            } catch (e) {
                mapData = { nodes: [], edges: [] };
            }
        } else {
            mapData = {
                nodes: [
                    { id: 'start_node', label: 'Thành phố Khởi Đầu', category: 'city', danger: 'Bình yên', description: 'Nơi câu chuyện của bạn bắt đầu tại thế giới này.' }
                ],
                edges: []
            };
            saveMapData();
        }
        updateUI();
    }

    function saveMapData() {
        activeChatId = getActiveChatId();
        try {
            localStorage.setItem(STORAGE_PREFIX + activeChatId, JSON.stringify(mapData));
        } catch (e) {}
    }

    // ============ CHÈN CSS STYLES ============
    const doc = (window.parent && window.parent.document) || document;

    function injectStyles() {
        if (doc.getElementById('lore-world-map-styles-v2')) return;
        const style = doc.createElement('style');
        style.id = 'lore-world-map-styles-v2';
        style.innerHTML = `
            #lore_graph_standalone_bubble {
                position: fixed;
                bottom: 110px;
                right: 20px;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: linear-gradient(135deg, #0284c7 0%, #7c3aed 100%);
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(124, 58, 237, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.2);
                z-index: 9998;
                transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
                user-select: none;
            }
            #lore_graph_standalone_bubble:hover {
                transform: scale(1.1) rotate(6deg);
                box-shadow: 0 6px 26px rgba(124, 58, 237, 0.7), 0 0 0 3px rgba(255, 255, 255, 0.4);
            }
            #lore_graph_modal_overlay {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.84);
                backdrop-filter: blur(12px);
                z-index: 99999999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 14px;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
            }
            #lore_graph_modal_content {
                width: 100%;
                max-width: 1300px;
                height: 90vh;
                border-radius: 24px;
                box-shadow: 0 25px 60px rgba(0,0,0,0.8);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
                transition: all 0.3s ease;
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
            .lore-btn-secondary { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.16); color: #e2e8f0; }
            .lore-btn-secondary:hover { background: rgba(255, 255, 255, 0.16); border-color: rgba(255,255,255,0.3); }
            .lore-input {
                padding: 8px 12px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.18);
                background: rgba(0,0,0,0.4);
                color: #fff;
                font-size: 0.9em;
                outline: none;
            }
            .lore-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }
            #lore_graph_inspector {
                width: 350px;
                border-left: 1px solid rgba(255,255,255,0.12);
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 14px;
                flex-shrink: 0;
            }
            /* Custom Dock cho Vis.js */
            .lore-control-dock {
                position: absolute;
                bottom: 20px;
                right: 20px;
                z-index: 100;
                display: flex;
                gap: 6px;
                background: rgba(15, 23, 42, 0.88);
                padding: 6px;
                border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(8px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            }
            .lore-dock-btn {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                background: rgba(255,255,255,0.06);
                border: 1px solid rgba(255,255,255,0.08);
                color: #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                font-size: 1.1em;
                transition: all 0.15s;
            }
            .lore-dock-btn:hover { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); transform: scale(1.06); }
            .lore-badge {
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 0.78em;
                font-weight: 800;
                text-transform: uppercase;
                display: inline-block;
            }
            .badge-safe { background: rgba(34, 197, 94, 0.18); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
            .badge-warn { background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
            .badge-danger { background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
            @keyframes lorePulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(168, 85, 247, 0.8); }
                100% { transform: scale(1); }
            }
            .lore-ai-loading { animation: lorePulse 1.2s infinite ease-in-out; }
        `;
        doc.head.appendChild(style);
    }

    // ============ BONG BÓNG NỔI ĐỘC LẬP ============
    function createStandaloneBubble() {
        if (doc.getElementById('lore_graph_standalone_bubble')) return;
        const bubble = doc.createElement('div');
        bubble.id = 'lore_graph_standalone_bubble';
        bubble.title = 'Mở Bản Đồ Thế Giới (Graph AI)';
        bubble.innerHTML = SVG_GLOBE_ICON;
        bubble.addEventListener('click', () => {
            toggleGraphModal();
        });
        doc.body.appendChild(bubble);

        // Kéo thả bong bóng
        let isDragging = false;
        let startX, startY, origX, origY;
        bubble.addEventListener('mousedown', e => {
            if (e.button !== 0) return;
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            const rect = bubble.getBoundingClientRect();
            origX = rect.left;
            origY = rect.top;

            function onMouseMove(ev) {
                if (Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4) {
                    isDragging = true;
                    bubble.style.bottom = 'auto';
                    bubble.style.right = 'auto';
                    bubble.style.left = Math.max(0, Math.min(window.innerWidth - 52, origX + (ev.clientX - startX))) + 'px';
                    bubble.style.top = Math.max(0, Math.min(window.innerHeight - 52, origY + (ev.clientY - startY))) + 'px';
                }
            }
            function onMouseUp() {
                doc.removeEventListener('mousemove', onMouseMove);
                doc.removeEventListener('mouseup', onMouseUp);
            }
            doc.addEventListener('mousemove', onMouseMove);
            doc.addEventListener('mouseup', onMouseUp);
        });
    }

    function registerToMasterBall() {
        const win = window.parent || window;
        const fmmConfig = {
            id: MODULE_ID,
            label: MODULE_TITLE,
            icon: SVG_GLOBE_ICON,
            color: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
            order: 18,
            onClick: () => toggleGraphModal()
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

    // ============ TẠO MODAL BẢN ĐỒ ============
    function createGraphModal() {
        if (doc.getElementById('lore_graph_modal_overlay')) return;
        const overlay = doc.createElement('div');
        overlay.id = 'lore_graph_modal_overlay';
        overlay.innerHTML = `
            <div id="lore_graph_modal_content">
                <!-- Header Toolbar Siêu Gọn & Tích hợp Search -->
                <div id="lore_graph_header" style="height: 64px; border-bottom: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; background: rgba(0,0,0,0.5);">
                    <div style="display: flex; align-items: center; gap: 14px; min-width: 260px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #38bdf8, #818cf8); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 10px rgba(56,189,248,0.4); flex-shrink: 0;">
                            ${SVG_GLOBE_ICON}
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 1.08em; color: #f8fafc; letter-spacing: 0.3px; display: flex; align-items: center; gap: 8px;">
                                <span>BẢN ĐỒ THẾ GIỚI AI</span>
                                <span id="lore_stats_badge" style="background: rgba(56,189,248,0.18); color: #38bdf8; font-size: 0.72em; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.3);">0 địa điểm</span>
                            </div>
                            <div id="lore_chat_status" style="font-size: 0.8em; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;">Chat ID: <span style="color: #c084fc;">...</span></div>
                        </div>
                    </div>

                    <!-- Actions & Search Box trên Header -->
                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: nowrap;">
                        <!-- Tìm kiếm trực tiếp trên thanh toolbar -->
                        <div style="display: flex; align-items: center; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 2px 8px;">
                            <i class="fa-solid fa-magnifying-glass" style="color: #94a3b8; font-size: 0.85em; margin-right: 6px;"></i>
                            <input id="lore_search_input" type="text" placeholder="Tìm nhanh địa điểm..." style="background: transparent; border: none; color: #fff; font-size: 0.88em; width: 140px; outline: none; padding: 4px 0;">
                        </div>

                        <button id="lore_btn_ai_scan" class="lore-btn lore-btn-primary" title="Bắt AI quét 25 tin nhắn gần nhất để tự động phát hiện & dựng thêm địa điểm vào bản đồ">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Quét & Xây Map
                        </button>

                        <button id="lore_btn_add_node" class="lore-btn lore-btn-secondary" title="Thêm địa điểm thủ công">
                            <i class="fa-solid fa-location-dot"></i> + Địa Điểm
                        </button>

                        <button id="lore_btn_add_edge" class="lore-btn lore-btn-secondary" title="Nối đường giữa 2 địa điểm">
                            <i class="fa-solid fa-route"></i> + Nối Đường
                        </button>

                        <select id="lore_theme_selector" class="lore-input" style="padding: 7px 10px; cursor: pointer; font-size: 0.86em;">
                            <option value="mystic">🌌 Đêm Huyền Bí</option>
                            <option value="parchment">📜 Bản Đồ Cổ</option>
                            <option value="cyberpunk">⚡ Cyberpunk Neon</option>
                        </select>

                        <button id="lore_btn_close_modal" class="lore-btn" style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #f87171; padding: 8px 12px; font-size: 1.05em;" title="Đóng bản đồ">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Main Viewport + Inspector -->
                <div style="flex: 1; display: flex; overflow: hidden; position: relative;">
                    <!-- Graph Viewport -->
                    <div id="lore_graph_viewport" style="flex: 1; height: 100%; position: relative;">
                        <!-- Custom Control Dock (Thay thế bộ nút xanh lá xấu xí của Vis.js) -->
                        <div class="lore-control-dock">
                            <button id="dock_btn_zoomin" class="lore-dock-btn" title="Phóng to">+</button>
                            <button id="dock_btn_zoomout" class="lore-dock-btn" title="Thu nhỏ">-</button>
                            <button id="dock_btn_fit" class="lore-dock-btn" title="Xem toàn cảnh bản đồ"><i class="fa-solid fa-compress"></i></button>
                            <button id="dock_btn_relayout" class="lore-dock-btn" title="Sắp xếp lại lực hấp dẫn đồ thị"><i class="fa-solid fa-rotate-right"></i></button>
                        </div>
                    </div>

                    <!-- Inspector Sidebar Panel -->
                    <div id="lore_graph_inspector">
                        <div style="font-weight: 800; font-size: 1em; color: #38bdf8; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <span>🏷️ THÔNG TIN CHI TIẾT</span>
                            <span id="inspector_close_btn" style="cursor: pointer; color: #94a3b8; font-size: 1.1em;" title="Bỏ chọn">✕</span>
                        </div>
                        <div id="inspector_content" style="font-size: 0.9em; color: #cbd5e1; line-height: 1.6; display: flex; flex-direction: column; gap: 12px;">
                            <!-- Nội dung nạp tự động -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        doc.body.appendChild(overlay);

        // Đóng modal & hiển thị lại bong bóng con
        overlay.querySelector('#lore_btn_close_modal').addEventListener('click', () => {
            overlay.style.display = 'none';
            const bubble = doc.getElementById('lore_graph_standalone_bubble');
            if (bubble) bubble.style.display = 'flex';
        });

        overlay.querySelector('#inspector_close_btn').addEventListener('click', () => {
            selectedNodeId = null;
            renderInspector();
            if (networkInstance && typeof networkInstance.unselectAll === 'function') {
                networkInstance.unselectAll();
            }
        });

        // Đổi theme
        const themeSelector = overlay.querySelector('#lore_theme_selector');
        themeSelector.addEventListener('change', () => {
            currentThemeKey = themeSelector.value;
            applyTheme();
            renderNetwork();
        });

        // Các nút Custom Control Dock
        overlay.querySelector('#dock_btn_zoomin').addEventListener('click', () => {
            if (networkInstance && typeof networkInstance.getScale === 'function') {
                const scale = networkInstance.getScale() * 1.3;
                networkInstance.moveTo({ scale: scale, animation: { duration: 300 } });
            }
        });
        overlay.querySelector('#dock_btn_zoomout').addEventListener('click', () => {
            if (networkInstance && typeof networkInstance.getScale === 'function') {
                const scale = networkInstance.getScale() * 0.75;
                networkInstance.moveTo({ scale: scale, animation: { duration: 300 } });
            }
        });
        overlay.querySelector('#dock_btn_fit').addEventListener('click', () => {
            if (networkInstance && typeof networkInstance.fit === 'function') {
                networkInstance.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
            }
        });
        overlay.querySelector('#dock_btn_relayout').addEventListener('click', () => {
            if (networkInstance && typeof networkInstance.stabilize === 'function') {
                networkInstance.stabilize(100);
                networkInstance.fit({ animation: { duration: 500 } });
            }
        });

        // Thêm node & edge thủ công
        overlay.querySelector('#lore_btn_add_node').addEventListener('click', () => {
            const name = prompt('Nhập tên địa điểm mới:', 'Khu Vực Mới');
            if (!name || !name.trim()) return;
            const category = prompt('Phân loại (kingdom / city / dungeon / forest / ruin / other):', 'city') || 'city';
            const danger = prompt('Mức độ nguy hiểm (Bình yên / Nguy hiểm / Tử địa...):', 'Bình yên') || 'Bình yên';
            const desc = prompt('Mô tả ngắn gọn về địa điểm này:', 'Một địa điểm mới được khám phá.') || '';

            const id = 'node_' + Date.now();
            mapData.nodes.push({ id, label: name.trim(), category: category.trim(), danger: danger.trim(), description: desc.trim() });
            saveMapData();
            renderNetwork();
            selectNode(id);
        });

        overlay.querySelector('#lore_btn_add_edge').addEventListener('click', () => {
            if (mapData.nodes.length < 2) {
                alert('Bạn cần có ít nhất 2 địa điểm trên bản đồ để tạo kết nối!');
                return;
            }
            const nodeListStr = mapData.nodes.map(n => `${n.id}: ${n.label}`).join('\n');
            const fromId = prompt(`Nhập ID hoặc tên địa điểm XUẤT PHÁT:\n${nodeListStr}`, mapData.nodes[0].id);
            if (!fromId) return;
            const toId = prompt(`Nhập ID hoặc tên địa điểm ĐÍCH ĐẾN:\n${nodeListStr}`, mapData.nodes[1].id);
            if (!toId || fromId === toId) return;

            const nFrom = mapData.nodes.find(n => n.id === fromId || n.label.toLowerCase() === fromId.toLowerCase());
            const nTo = mapData.nodes.find(n => n.id === toId || n.label.toLowerCase() === toId.toLowerCase());
            if (!nFrom || !nTo) {
                alert('Không tìm thấy địa điểm xuất phát hoặc đích đến hợp lệ!');
                return;
            }

            const label = prompt('Mô tả đường đi (VD: Cổng dịch chuyển, Hành lang nối liền...):', 'Đường nối');
            mapData.edges.push({ from: nFrom.id, to: nTo.id, label: label || '' });
            saveMapData();
            renderNetwork();
        });

        overlay.querySelector('#lore_btn_ai_scan').addEventListener('click', async () => {
            await triggerAiWorldScan();
        });

        // Tìm kiếm nhanh trên Header
        const searchInput = overlay.querySelector('#lore_search_input');
        function doSearch() {
            const kw = searchInput.value.trim().toLowerCase();
            if (!kw) return;
            const found = mapData.nodes.find(n => n.label.toLowerCase().includes(kw) || (n.description && n.description.toLowerCase().includes(kw)));
            if (found) {
                selectNode(found.id);
                if (networkInstance && typeof networkInstance.focus === 'function') {
                    networkInstance.focus(found.id, { scale: 1.35, animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
                }
            } else {
                alert(`Không tìm thấy địa điểm nào khớp với "${kw}"!`);
            }
        }
        searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    }

    function applyTheme() {
        const theme = GRAPH_THEMES[currentThemeKey] || GRAPH_THEMES.mystic;
        const modalContent = doc.getElementById('lore_graph_modal_content');
        if (modalContent) {
            modalContent.style.background = theme.bg;
            modalContent.style.border = `1px solid ${theme.border}`;
            modalContent.style.color = theme.text;
        }
        const inspector = doc.getElementById('lore_graph_inspector');
        if (inspector) {
            inspector.style.background = theme.panelBg;
        }
    }

    function updateUI() {
        const statusBox = doc.getElementById('lore_chat_status');
        const badge = doc.getElementById('lore_stats_badge');
        if (statusBox) statusBox.innerHTML = `Chat ID: <span style="color: #c084fc;">${activeChatId}</span>`;
        if (badge) badge.innerText = `${mapData.nodes.length} địa điểm, ${mapData.edges.length} liên kết`;
    }

    // ============ RENDER ĐỒ THỊ VIS.JS CHUẨN XÁC, SẠCH CHỮ ============
    function renderNetwork() {
        updateUI();
        const container = doc.getElementById('lore_graph_viewport');
        if (!container) return;

        if (typeof window.vis === 'undefined' || !window.vis.Network) {
            console.log('[Lore World Map] Đang nạp thư viện Vis.js...');
            const script = doc.createElement('script');
            script.src = 'https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js';
            script.onload = () => initVisNetwork(container);
            doc.head.appendChild(script);
        } else {
            initVisNetwork(container);
        }
    }

    function initVisNetwork(container) {
        const theme = GRAPH_THEMES[currentThemeKey] || GRAPH_THEMES.mystic;

        const nodesArray = mapData.nodes.map(n => {
            const cat = theme.nodeColors[n.category] || theme.nodeColors.other;
            const isDanger = n.danger && (n.danger.toLowerCase().includes('nguy') || n.danger.toLowerCase().includes('tử'));
            let iconEmoji = '📍 ';
            if (n.category === 'kingdom') iconEmoji = '👑 ';
            else if (n.category === 'city') iconEmoji = '🏙️ ';
            else if (n.category === 'dungeon') iconEmoji = '💀 ';
            else if (n.category === 'forest') iconEmoji = '🌲 ';
            else if (n.category === 'ruin') iconEmoji = '⛩️ ';

            return {
                id: n.id,
                label: `${iconEmoji}${n.label}\n[${n.danger || 'Bình yên'}]`,
                title: `${n.label} \n• Phân loại: ${n.category.toUpperCase()} \n• Mô tả: ${n.description || 'Chưa có mô tả'}`,
                color: {
                    background: cat.bg,
                    border: isDanger ? '#ef4444' : cat.border,
                    highlight: { background: cat.highlight, border: '#ffffff' }
                },
                font: { color: theme.text, size: 14, face: '-apple-system, Inter, sans-serif', bold: true },
                borderWidth: isDanger ? 3 : 2,
                shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 10, x: 0, y: 4 },
                shape: 'box',
                margin: 12
            };
        });

        // Xử lý Edge mượt mà, không bị stroke trắng đè nát và ngắt nhãn gọn gàng
        const edgesArray = mapData.edges.map(e => {
            const wrappedLabel = wrapText(e.label || '', 24);
            return {
                from: e.from,
                to: e.to,
                label: wrappedLabel,
                title: e.label || 'Kết nối địa điểm',
                color: { color: theme.edgeColor, highlight: '#38bdf8' },
                font: {
                    color: theme.edgeText,
                    size: 11.5,
                    face: '-apple-system, Inter, sans-serif',
                    background: theme.edgeLabelBg,
                    strokeWidth: 0, // TẮT HOÀN TOÀN stroke viền trắng thô bỉ!
                    align: 'horizontal'
                },
                arrows: { to: { enabled: true, scaleFactor: 0.8 } },
                smooth: { type: 'continuous', roundness: 0.2 },
                width: 2.2
            };
        });

        const data = {
            nodes: new window.vis.DataSet(nodesArray),
            edges: new window.vis.DataSet(edgesArray)
        };

        const options = {
            physics: {
                forceAtlas2Based: {
                    gravitationalConstant: -85,
                    centralGravity: 0.012,
                    springLength: 220, // Tăng khoảng cách để nhãn chữ không bao giờ bị đè lên nhau
                    springConstant: 0.08
                },
                maxVelocity: 45,
                solver: 'forceAtlas2Based',
                timestep: 0.35,
                stabilization: { iterations: 180 }
            },
            interaction: {
                hover: true,
                tooltipDelay: 150,
                navigationButtons: false, // TẮT bộ nút xanh lá xấu xí mặc định!
                keyboard: true
            }
        };

        // Giữ lại custom control dock
        const dock = container.querySelector('.lore-control-dock');
        container.innerHTML = '';
        if (dock) container.appendChild(dock);

        const graphDiv = doc.createElement('div');
        graphDiv.style.cssText = 'width: 100%; height: 100%;';
        container.insertBefore(graphDiv, dock || null);

        networkInstance = new window.vis.Network(graphDiv, data, options);

        networkInstance.on('click', params => {
            if (params.nodes.length > 0) {
                selectNode(params.nodes[0]);
            } else {
                selectedNodeId = null;
                renderInspector();
            }
        });

        renderInspector();
    }

    function selectNode(id) {
        selectedNodeId = id;
        renderInspector();
    }

    // ============ RENDER BẢNG INSPECTOR THÔNG MINH ============
    function renderInspector() {
        const contentDiv = doc.getElementById('inspector_content');
        if (!contentDiv) return;

        // Nếu chưa chọn Node: Hiển thị Bảng Tổng Quan (Overview Quick Jump)
        if (!selectedNodeId) {
            const listNodesHTML = mapData.nodes.map(n => {
                let badgeClass = 'badge-safe';
                if (n.danger && (n.danger.toLowerCase().includes('nguy') || n.danger.toLowerCase().includes('tử'))) badgeClass = 'badge-danger';
                else if (n.danger && n.danger.toLowerCase().includes('thận')) badgeClass = 'badge-warn';

                return `
                    <div onclick="window._loreJumpToNode('${n.id}')" style="padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 700; color: #38bdf8; font-size: 0.96em;">📍 ${n.label}</span>
                            <span class="lore-badge ${badgeClass}">${n.danger || 'Bình yên'}</span>
                        </div>
                        <div style="font-size: 0.82em; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${n.description || 'Chưa có mô tả'}
                        </div>
                    </div>
                `;
            }).join('') || '<div style="color: #64748b; text-align: center;">Bản đồ chưa có địa điểm nào.</div>';

            contentDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 14px;">
                    <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 12px; font-size: 0.86em; color: #e0f2fe;">
                        💡 <b>Mẹo thao tác:</b> Nhấp chuột giữ và kéo để di chuyển địa điểm. Cuộn chuột để phóng to/thu nhỏ. Nhấp vào bất kỳ địa điểm nào dưới đây để đến nhanh!
                    </div>

                    <div>
                        <div style="font-size: 0.78em; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
                            📋 TẤT CẢ ĐỊA ĐIỂM (${mapData.nodes.length})
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 560px; overflow-y: auto; padding-right: 4px;">
                            ${listNodesHTML}
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // Khi đã chọn 1 Node cụ thể
        const node = mapData.nodes.find(n => n.id === selectedNodeId);
        if (!node) return;

        const connectedEdges = mapData.edges.filter(e => e.from === node.id || e.to === node.id);
        let linksHTML = connectedEdges.map(e => {
            const targetId = e.from === node.id ? e.to : e.from;
            const targetNode = mapData.nodes.find(n => n.id === targetId);
            const targetName = targetNode ? targetNode.label : targetId;
            const arrow = e.from === node.id ? '➔ ĐẾN' : '🡄 TỪ';
            return `
                <div style="padding: 10px 12px; background: rgba(255,255,255,0.05); border-radius: 10px; font-size: 0.88em; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.08);">
                    <div style="overflow: hidden; max-width: 210px;">
                        <div style="font-weight: 700; color: #38bdf8;">${arrow}: ${targetName}</div>
                        <div style="font-size: 0.82em; color: #94a3b8; margin-top: 2px;">${e.label || 'Đường nối'}</div>
                    </div>
                    <button onclick="window._loreJumpToNode('${targetId}')" class="lore-btn" style="background: rgba(168,85,247,0.2); border: 1px solid rgba(168,85,247,0.4); color: #c084fc; padding: 6px 10px; font-size: 0.85em;" title="Chuyển sang địa điểm này">🎯</button>
                </div>
            `;
        }).join('') || '<div style="color:#64748b; font-size: 0.85em;">Chưa có kết nối nào tới địa điểm này.</div>';

        contentDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 14px;">
                <div>
                    <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Tên Địa Điểm</label>
                    <input id="insp_label" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 4px; font-weight: bold; font-size: 1.05em;" value="${node.label}">
                </div>

                <div style="display: flex; gap: 8px;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Phân loại</label>
                        <select id="insp_category" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 4px;">
                            <option value="kingdom" ${node.category === 'kingdom' ? 'selected' : ''}>👑 Vương quốc</option>
                            <option value="city" ${node.category === 'city' ? 'selected' : ''}>🏙️ Thành phố</option>
                            <option value="dungeon" ${node.category === 'dungeon' ? 'selected' : ''}>💀 Hầm ngục</option>
                            <option value="forest" ${node.category === 'forest' ? 'selected' : ''}>🌲 Rừng rậm</option>
                            <option value="ruin" ${node.category === 'ruin' ? 'selected' : ''}>⛩️ Di tích</option>
                            <option value="other" ${node.category === 'other' ? 'selected' : ''}>📍 Khác</option>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Nguy hiểm</label>
                        <input id="insp_danger" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 4px;" value="${node.danger || 'Bình yên'}">
                    </div>
                </div>

                <div>
                    <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Mô tả & Sự Kiện</label>
                    <textarea id="insp_desc" class="lore-input" style="width: 100%; height: 120px; box-sizing: border-box; margin-top: 4px; resize: vertical; line-height: 1.5;">${node.description || ''}</textarea>
                </div>

                <div style="display: flex; gap: 8px; margin-top: 2px;">
                    <button id="insp_btn_save" class="lore-btn lore-btn-success" style="flex: 2; justify-content: center;">
                        <i class="fa-solid fa-floppy-disk"></i> Lưu Thay Đổi
                    </button>
                    <button id="insp_btn_delete" class="lore-btn lore-btn-danger" style="flex: 1; justify-content: center;">
                        <i class="fa-solid fa-trash"></i> Xóa
                    </button>
                </div>

                <div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 14px;">
                    <label style="font-size: 0.78em; color: #38bdf8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 8px;">🔗 Các Địa Điểm Kết Nối (${connectedEdges.length})</label>
                    <div style="display: flex; flex-direction: column; gap: 8px; max-height: 240px; overflow-y: auto;">
                        ${linksHTML}
                    </div>
                </div>
            </div>
        `;

        contentDiv.querySelector('#insp_btn_save').addEventListener('click', () => {
            node.label = contentDiv.querySelector('#insp_label').value.trim() || node.label;
            node.category = contentDiv.querySelector('#insp_category').value;
            node.danger = contentDiv.querySelector('#insp_danger').value.trim() || 'Bình yên';
            node.description = contentDiv.querySelector('#insp_desc').value.trim();
            saveMapData();
            renderNetwork();
            selectNode(node.id);
        });

        contentDiv.querySelector('#insp_btn_delete').addEventListener('click', () => {
            if (!confirm(`Bạn có chắc muốn xóa địa điểm "${node.label}" khỏi bản đồ?`)) return;
            mapData.nodes = mapData.nodes.filter(n => n.id !== node.id);
            mapData.edges = mapData.edges.filter(e => e.from !== node.id && e.to !== node.id);
            selectedNodeId = null;
            saveMapData();
            renderNetwork();
        });
    }

    // Hàm global để nhảy node nhanh từ Inspector
    window._loreJumpToNode = function (targetId) {
        selectNode(targetId);
        if (networkInstance && typeof networkInstance.focus === 'function') {
            networkInstance.focus(targetId, { scale: 1.35, animation: { duration: 550, easingFunction: 'easeInOutQuad' } });
            networkInstance.selectNodes([targetId]);
        }
    };

    // ============ QUÉT AI VÀ XÂY BẢN ĐỒ ============
    async function triggerAiWorldScan() {
        const btnScan = doc.getElementById('lore_btn_ai_scan');
        if (btnScan) {
            btnScan.disabled = true;
            btnScan.classList.add('lore-ai-loading');
            btnScan.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang dựng map từ chat...`;
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

            const recentChat = chatArray.slice(-30);
            const historyText = recentChat.map(m => `${m.is_user ? 'Tôi' : (m.name || 'AI')}: ${m.mes || m.content || ''}`).join('\n---\n');

            if (!historyText || historyText.trim().length < 20) {
                alert('Lịch sử cuộc trò chuyện quá ngắn để AI phân tích bản đồ!');
                return;
            }

            const existingNodesStr = mapData.nodes.map(n => `- ${n.label} (${n.category})`).join('\n');
            const prompt = `Bạn là Bậc Thầy Kiến Trúc Sư Địa Lý Game (World Lore Architect).
Dưới đây là Lịch sử trò chơi gần đây:
=== LỊCH SỬ CHAT ===
${historyText.slice(0, 7500)}
====================

Các địa điểm đã có trên bản đồ:
${existingNodesStr || '(Chưa có)'}

NHIỆM VỤ:
1. Trích xuất các Địa Điểm, Vương Quốc, Thành Phố, Hầm Ngục, Khu Rừng, hoặc Di Tích xuất hiện/được nhắc đến.
2. Xác định mối liên kết và nhãn kết nối NGẮN GỌN (DƯỚI 20 KÝ TỰ, VD: Cánh cửa tràm, Cổng dịch chuyển, Hành lang phía Bắc).
3. TRẢ VỀ DUY NHẤT 1 JSON HỢP LỆ (không kèm lời dẫn):
{
  "nodes": [
    { "label": "Tên địa điểm ngắn gọn", "category": "kingdom | city | dungeon | forest | ruin | other", "danger": "Bình yên | Nguy hiểm | Tử địa | Thù địch", "description": "Mô tả vai trò chi tiết" }
  ],
  "edges": [
    { "from_label": "Tên địa điểm xuất phát", "to_label": "Tên địa điểm đích đến", "label": "Nhãn ngắn gọn dưới 20 ký tự" }
  ]
}`;

            let responseJson = null;
            if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function' && typeof win.SillyTavern.getContext().generateRaw === 'function') {
                try {
                    const rawRes = await win.SillyTavern.getContext().generateRaw(prompt);
                    responseJson = parseJsonFromText(rawRes);
                } catch (e) {}
            }

            if (!responseJson && win.PhoneSystem && typeof win.PhoneSystem.callExternalAPI === 'function') {
                try {
                    const rawRes = await win.PhoneSystem.callExternalAPI([
                        { role: 'system', content: 'Bạn là chuyên gia xuất JSON bản đồ game hợp lệ 100%.' },
                        { role: 'user', content: prompt }
                    ], { maxTokens: 4000, temperature: 0.7 });
                    responseJson = parseJsonFromText(rawRes);
                } catch (e) {}
            }

            if (!responseJson || !Array.isArray(responseJson.nodes)) {
                throw new Error('AI không trả về JSON hợp lệ hoặc chưa kết nối AI!');
            }

            let newNodesCount = 0;
            let newEdgesCount = 0;

            responseJson.nodes.forEach(item => {
                if (!item || !item.label) return;
                const cleanLabel = item.label.trim();
                let existing = mapData.nodes.find(n => n.label.toLowerCase() === cleanLabel.toLowerCase());
                if (existing) {
                    if (item.description && (!existing.description || existing.description.length < item.description.length)) {
                        existing.description = item.description;
                    }
                    if (item.danger) existing.danger = item.danger;
                } else {
                    const newId = 'node_' + Math.random().toString(36).substr(2, 8);
                    mapData.nodes.push({
                        id: newId,
                        label: cleanLabel,
                        category: ['kingdom', 'city', 'dungeon', 'forest', 'ruin'].includes(item.category) ? item.category : 'other',
                        danger: item.danger || 'Bình yên',
                        description: item.description || ''
                    });
                    newNodesCount++;
                }
            });

            if (Array.isArray(responseJson.edges)) {
                responseJson.edges.forEach(link => {
                    if (!link.from_label || !link.to_label) return;
                    const fromNode = mapData.nodes.find(n => n.label.toLowerCase() === link.from_label.trim().toLowerCase());
                    const toNode = mapData.nodes.find(n => n.label.toLowerCase() === link.to_label.trim().toLowerCase());
                    if (fromNode && toNode && fromNode.id !== toNode.id) {
                        const exists = mapData.edges.some(e => (e.from === fromNode.id && e.to === toNode.id) || (e.from === toNode.id && e.to === fromNode.id));
                        if (!exists) {
                            mapData.edges.push({ from: fromNode.id, to: toNode.id, label: link.label || 'Kết nối' });
                            newEdgesCount++;
                        }
                    }
                });
            }

            saveMapData();
            renderNetwork();
            if (win.toastr) win.toastr.success(`🎉 AI đã phân tích xong! +${newNodesCount} địa điểm, +${newEdgesCount} liên kết.`);
        } catch (err) {
            alert('⚠️ Lỗi khi dựng bản đồ AI: ' + err.message);
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

    // ============ TOGGLE MODAL & BONG BÓNG ============
    function toggleGraphModal() {
        injectStyles();
        createGraphModal();
        applyTheme();
        loadMapDataForCurrentChat();

        const overlay = doc.getElementById('lore_graph_modal_overlay');
        const bubble = doc.getElementById('lore_graph_standalone_bubble');
        if (overlay) {
            if (overlay.style.display === 'flex') {
                overlay.style.display = 'none';
                if (bubble) bubble.style.display = 'flex';
            } else {
                overlay.style.display = 'flex';
                if (bubble) bubble.style.display = 'none'; // Ẩn bong bóng con để không che Header!
                renderNetwork();
            }
        }
    }

    // ============ KHỞI TẠO ============
    function init() {
        injectStyles();
        createStandaloneBubble();
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
