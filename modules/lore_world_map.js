/**
 * KAIZ Collection - Bản Đồ Thế Giới AI (Lore World Graph)
 * - Có bóng con riêng độc lập, đồng thời tự động ghi vào bóng mẹ (FloatingMenuManager).
 * - Quét lịch sử trò chuyện (Game History) bằng AI để tự động dựng và mở rộng đồ thị thế giới.
 * - Lưu bản đồ riêng rẽ theo từng Chat ID trong SillyTavern.
 * - Sử dụng Graph (Vis.js Network + Canvas Force-Directed fallback) với giao diện Premium mượt mà.
 */

(function () {
    'use strict';

    console.log('[Lore World Map] Đang khởi tạo module Bản Đồ Thế Giới AI...');

    const MODULE_ID = 'lore_world_map_graph';
    const MODULE_TITLE = 'Bản Đồ Thế Giới (Graph AI)';
    const STORAGE_PREFIX = 'kaiz_lore_graph_map_';

    // ============ BỘ THEME MÀU SẮC PREMIUM ============
    const GRAPH_THEMES = {
        mystic: {
            name: '🌌 Đêm Huyền Bí (Mystic Night)',
            bg: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #0f172a 100%)',
            panelBg: 'rgba(15, 23, 42, 0.88)',
            border: 'rgba(192, 132, 252, 0.35)',
            text: '#f8fafc',
            nodeColors: {
                kingdom: { background: '#9333ea', border: '#d8b4fe', highlight: '#c084fc' },
                city: { background: '#2563eb', border: '#93c5fd', highlight: '#60a5fa' },
                dungeon: { background: '#e11d48', border: '#fda4af', highlight: '#fb7185' },
                forest: { background: '#16a34a', border: '#86efac', highlight: '#4ade80' },
                ruin: { background: '#d97706', border: '#fde68a', highlight: '#fbbf24' },
                other: { background: '#475569', border: '#cbd5e1', highlight: '#94a3b8' }
            },
            edgeColor: '#818cf8'
        },
        parchment: {
            name: '📜 Bản Đồ Cổ (Old Parchment)',
            bg: 'radial-gradient(circle at 50% 50%, #fef3c7 0%, #d97706 100%)',
            panelBg: 'rgba(254, 243, 199, 0.94)',
            border: 'rgba(180, 83, 9, 0.45)',
            text: '#451a03',
            nodeColors: {
                kingdom: { background: '#b45309', border: '#fef3c7', highlight: '#d97706' },
                city: { background: '#1d4ed8', border: '#dbeafe', highlight: '#3b82f6' },
                dungeon: { background: '#991b1b', border: '#fee2e2', highlight: '#dc2626' },
                forest: { background: '#15803d', border: '#dcfce7', highlight: '#22c55e' },
                ruin: { background: '#a16207', border: '#fef9c3', highlight: '#ca8a04' },
                other: { background: '#57534e', border: '#f5f5f4', highlight: '#78716c' }
            },
            edgeColor: '#9a3412'
        },
        cyberpunk: {
            name: '⚡ Cyberpunk Neon',
            bg: 'linear-gradient(135deg, #090d16 0%, #100624 100%)',
            panelBg: 'rgba(15, 10, 30, 0.9)',
            border: 'rgba(0, 240, 255, 0.4)',
            text: '#e0f7ff',
            nodeColors: {
                kingdom: { background: '#ff0055', border: '#ff88bb', highlight: '#ff007f' },
                city: { background: '#00f0ff', border: '#b3fbff', highlight: '#00c3ff' },
                dungeon: { background: '#7000ff', border: '#d4b3ff', highlight: '#9e00ff' },
                forest: { background: '#00ff66', border: '#aaffcc', highlight: '#00e65c' },
                ruin: { background: '#ffaa00', border: '#ffdd99', highlight: '#ffbb00' },
                other: { background: '#666688', border: '#ccccdd', highlight: '#8888aa' }
            },
            edgeColor: '#00f0ff'
        }
    };

    let currentThemeKey = 'mystic';
    let activeChatId = 'default_global_chat';
    let mapData = { nodes: [], edges: [] };
    let networkInstance = null;
    let selectedNodeId = null;

    // ============ BIỂU TƯỢNG SVG ============
    const SVG_GLOBE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

    // ============ HÀM LẤY CHAT ID HIỆN TẠI TỪ SILLYTAVERN ============
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
            console.warn('[Lore World Map] Không thể lấy chatId từ SillyTavern, dùng mặc định:', e);
        }
        return 'default_global_chat';
    }

    // ============ LƯU VÀ TẢI DỮ LIỆU BẢN ĐỒ ============
    function loadMapDataForCurrentChat() {
        activeChatId = getActiveChatId();
        const raw = localStorage.getItem(STORAGE_PREFIX + activeChatId);
        if (raw) {
            try {
                mapData = JSON.parse(raw);
                if (!mapData.nodes || !Array.isArray(mapData.nodes)) mapData.nodes = [];
                if (!mapData.edges || !Array.isArray(mapData.edges)) mapData.edges = [];
            } catch (e) {
                console.error('[Lore World Map] Lỗi parse dữ liệu bản đồ:', e);
                mapData = { nodes: [], edges: [] };
            }
        } else {
            // Khởi tạo địa điểm ban đầu nếu chưa có
            mapData = {
                nodes: [
                    { id: 'start_node', label: 'Vùng Đất Khởi Đầu', category: 'city', danger: 'Bình yên', description: 'Nơi câu chuyện của bạn bắt đầu trong thế giới này.' }
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
        } catch (e) {
            console.warn('[Lore World Map] Lỗi lưu trữ vào localStorage:', e);
        }
    }

    // ============ TẠO GIAO DIỆN BÓNG CON & MODAL BẢN ĐỒ ============
    const doc = (window.parent && window.parent.document) || document;

    function injectStyles() {
        if (doc.getElementById('lore-world-map-styles')) return;
        const style = doc.createElement('style');
        style.id = 'lore-world-map-styles';
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
                background: rgba(0, 0, 0, 0.82);
                backdrop-filter: blur(10px);
                z-index: 99999999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 16px;
                box-sizing: border-box;
            }
            #lore_graph_modal_content {
                width: 100%;
                max-width: 1200px;
                height: 88vh;
                border-radius: 24px;
                box-shadow: 0 25px 60px rgba(0,0,0,0.7);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
                transition: all 0.3s ease;
            }
            .lore-btn {
                padding: 9px 15px;
                border-radius: 10px;
                border: none;
                font-weight: 700;
                font-size: 0.88em;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 7px;
                transition: all 0.15s;
                color: #fff;
            }
            .lore-btn-primary { background: linear-gradient(135deg, #2563eb, #7c3aed); box-shadow: 0 4px 12px rgba(124, 58, 237, 0.35); }
            .lore-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(124, 58, 237, 0.5); }
            .lore-btn-success { background: linear-gradient(135deg, #059669, #10b981); }
            .lore-btn-danger { background: linear-gradient(135deg, #dc2626, #ef4444); }
            .lore-btn-secondary { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #e2e8f0; }
            .lore-btn-secondary:hover { background: rgba(255, 255, 255, 0.14); }
            .lore-input {
                padding: 8px 12px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.18);
                background: rgba(0,0,0,0.35);
                color: #fff;
                font-size: 0.9em;
                outline: none;
            }
            .lore-input:focus { border-color: #38bdf8; }
            #lore_graph_inspector {
                width: 320px;
                background: rgba(15, 23, 42, 0.95);
                border-left: 1px solid rgba(255,255,255,0.12);
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 14px;
                flex-shrink: 0;
            }
            @keyframes lorePulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.08); }
                100% { transform: scale(1); }
            }
            .lore-ai-loading { animation: lorePulse 1.2s infinite ease-in-out; }
        `;
        doc.head.appendChild(style);
    }

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

        // Hỗ trợ kéo thả bong bóng độc lập
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

    // ============ ĐĂNG KÝ VÀO BÓNG MẸ (FloatingMenuManager) ============
    function registerToMasterBall() {
        const win = window.parent || window;
        const fmmConfig = {
            id: MODULE_ID,
            label: MODULE_TITLE,
            icon: SVG_GLOBE_ICON,
            color: 'linear-gradient(135deg, #0284c7 0%, #7c3aed 100%)',
            order: 18,
            onClick: function () {
                toggleGraphModal();
            }
        };

        if (win.FloatingMenuManager && typeof win.FloatingMenuManager.registerButton === 'function') {
            win.FloatingMenuManager.registerButton(fmmConfig);
            console.log('[Lore World Map] Đã đăng ký thành công vào Bóng Mẹ (FloatingMenuManager)');
        } else {
            win._fmmPendingRegistrations = win._fmmPendingRegistrations || [];
            if (!win._fmmPendingRegistrations.some(b => b.id === fmmConfig.id)) {
                win._fmmPendingRegistrations.push(fmmConfig);
            }
        }
    }

    // ============ TẠO MODAL GIAO DIỆN CHÍNH ============
    function createGraphModal() {
        if (doc.getElementById('lore_graph_modal_overlay')) return;
        const overlay = doc.createElement('div');
        overlay.id = 'lore_graph_modal_overlay';
        overlay.innerHTML = `
            <div id="lore_graph_modal_content">
                <!-- Header Toolbar -->
                <div id="lore_graph_header" style="height: 64px; border-bottom: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; flex-shrink: 0; background: rgba(0,0,0,0.4);">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #38bdf8, #818cf8); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 10px rgba(56,189,248,0.4);">
                            ${SVG_GLOBE_ICON}
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 1.1em; color: #f8fafc; letter-spacing: 0.3px;">BẢN ĐỒ THẾ GIỚI AI (LORE GRAPH)</div>
                            <div id="lore_chat_status" style="font-size: 0.82em; color: #94a3b8; margin-top: 2px;">Chat ID: <span style="color: #38bdf8; font-weight: bold;">...</span> | <span id="lore_stats_text">0 địa điểm, 0 liên kết</span></div>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <button id="lore_btn_ai_scan" class="lore-btn lore-btn-primary" title="Bắt AI phân tích lịch sử chat để tự động thêm địa điểm & đường đi">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Quét Lịch Sử & Xây Map
                        </button>
                        <button id="lore_btn_add_node" class="lore-btn lore-btn-secondary">
                            <i class="fa-solid fa-location-dot"></i> + Thêm Địa Điểm
                        </button>
                        <button id="lore_btn_add_edge" class="lore-btn lore-btn-secondary">
                            <i class="fa-solid fa-route"></i> + Nối Đường
                        </button>
                        <select id="lore_theme_selector" class="lore-input" style="padding: 8px 10px; cursor: pointer;">
                            <option value="mystic">🌌 Đêm Huyền Bí</option>
                            <option value="parchment">📜 Bản Đồ Cổ</option>
                            <option value="cyberpunk">⚡ Cyberpunk Neon</option>
                        </select>
                        <button id="lore_btn_close_modal" class="lore-btn lore-btn-secondary" style="padding: 8px 12px; font-size: 1.1em; color: #f87171;">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Main Container -->
                <div style="flex: 1; display: flex; overflow: hidden; position: relative;">
                    <!-- Graph Viewport -->
                    <div id="lore_graph_viewport" style="flex: 1; height: 100%; position: relative;">
                        <!-- Thẻ tìm kiếm nhanh góc trái trên -->
                        <div style="position: absolute; top: 16px; left: 16px; z-index: 10; display: flex; gap: 6px; background: rgba(15,23,42,0.85); padding: 6px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.12); backdrop-filter: blur(6px);">
                            <input id="lore_search_input" type="text" placeholder="🔍 Tìm địa điểm..." class="lore-input" style="width: 180px; border: none; background: transparent;">
                            <button id="lore_btn_search" class="lore-btn lore-btn-primary" style="padding: 6px 12px;">Tìm</button>
                        </div>
                    </div>

                    <!-- Inspector Sidebar Panel -->
                    <div id="lore_graph_inspector">
                        <div style="font-weight: 800; font-size: 1.05em; color: #38bdf8; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <span>🏷️ THÔNG TIN CHI TIẾT</span>
                            <span id="inspector_close_btn" style="cursor: pointer; color: #94a3b8; font-size: 1.1em;">✕</span>
                        </div>
                        <div id="inspector_content" style="font-size: 0.9em; color: #cbd5e1; line-height: 1.6; display: flex; flex-direction: column; gap: 12px;">
                            <div style="color: #64748b; font-style: italic; text-align: center; margin-top: 30px;">
                                Nhấp vào bất kỳ địa điểm (Node) hoặc đường đi (Edge) nào trên bản đồ để xem và chỉnh sửa thông tin chi tiết.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        doc.body.appendChild(overlay);

        // Sự kiện đóng mở modal
        overlay.querySelector('#lore_btn_close_modal').addEventListener('click', () => {
            overlay.style.display = 'none';
        });
        overlay.querySelector('#inspector_close_btn').addEventListener('click', () => {
            selectedNodeId = null;
            renderInspector();
        });

        // Đổi theme
        const themeSelector = overlay.querySelector('#lore_theme_selector');
        themeSelector.addEventListener('change', () => {
            currentThemeKey = themeSelector.value;
            applyTheme();
            renderNetwork();
        });

        // Thêm địa điểm thủ công
        overlay.querySelector('#lore_btn_add_node').addEventListener('click', () => {
            const name = prompt('Nhập tên địa điểm mới:', 'Thành Phố Mới');
            if (!name || !name.trim()) return;
            const category = prompt('Phân loại (kingdom / city / dungeon / forest / ruin / other):', 'city') || 'city';
            const danger = prompt('Mức độ nguy hiểm (Bình yên / Nguy hiểm / Tử địa...):', 'Bình yên') || 'Bình yên';
            const desc = prompt('Mô tả ngắn gọn về địa điểm này:', 'Một địa điểm vừa được khám phá.') || '';

            const id = 'node_' + Date.now();
            mapData.nodes.push({ id, label: name.trim(), category: category.trim(), danger: danger.trim(), description: desc.trim() });
            saveMapData();
            renderNetwork();
            selectNode(id);
        });

        // Nối đường thủ công
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

            // Tìm node
            const nFrom = mapData.nodes.find(n => n.id === fromId || n.label.toLowerCase() === fromId.toLowerCase());
            const nTo = mapData.nodes.find(n => n.id === toId || n.label.toLowerCase() === toId.toLowerCase());
            if (!nFrom || !nTo) {
                alert('Không tìm thấy địa điểm xuất phát hoặc đích đến hợp lệ!');
                return;
            }

            const label = prompt('Mô tả đường đi/liên kết (VD: Đường mòn, Cổng dịch chuyển, Chiến tuyến):', 'Đường nối');
            mapData.edges.push({ from: nFrom.id, to: nTo.id, label: label || '' });
            saveMapData();
            renderNetwork();
        });

        // Quét AI
        overlay.querySelector('#lore_btn_ai_scan').addEventListener('click', async () => {
            await triggerAiWorldScan();
        });

        // Tìm kiếm địa điểm
        const searchInput = overlay.querySelector('#lore_search_input');
        const btnSearch = overlay.querySelector('#lore_btn_search');
        function doSearch() {
            const kw = searchInput.value.trim().toLowerCase();
            if (!kw) return;
            const found = mapData.nodes.find(n => n.label.toLowerCase().includes(kw) || (n.description && n.description.toLowerCase().includes(kw)));
            if (found) {
                selectNode(found.id);
                if (networkInstance && typeof networkInstance.focus === 'function') {
                    networkInstance.focus(found.id, { scale: 1.3, animation: { duration: 600, easingFunction: 'easeInOutQuad' } });
                }
            } else {
                alert(`Không tìm thấy địa điểm nào khớp với "${kw}"!`);
            }
        }
        btnSearch.addEventListener('click', doSearch);
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

    // ============ HÀM HIỂN THỊ CẬP NHẬT GIAO DIỆN ============
    function updateUI() {
        const statusBox = doc.getElementById('lore_chat_status');
        if (statusBox) {
            statusBox.innerHTML = `Chat ID: <span style="color: #38bdf8; font-weight: bold;">${activeChatId}</span> | <span id="lore_stats_text">${mapData.nodes.length} địa điểm, ${mapData.edges.length} liên kết</span>`;
        }
    }

    // ============ RENDER ĐỒ THỊ VỚI VIS.JS HOẶC CANVAS FALLBACK ============
    function renderNetwork() {
        updateUI();
        const container = doc.getElementById('lore_graph_viewport');
        if (!container) return;

        // Đảm bảo Vis.js đã tải, nếu chưa thì tải CDN
        if (typeof window.vis === 'undefined' || !window.vis.Network) {
            console.log('[Lore World Map] Đang tải thư viện Vis.js Network...');
            const script = doc.createElement('script');
            script.src = 'https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js';
            script.onload = () => {
                console.log('[Lore World Map] Tải Vis.js thành công!');
                initVisNetwork(container);
            };
            script.onerror = () => {
                console.warn('[Lore World Map] Không tải được Vis.js, sử dụng bộ dựng Canvas nôi bộ...');
                initCanvasFallback(container);
            };
            doc.head.appendChild(script);
        } else {
            initVisNetwork(container);
        }
    }

    function initVisNetwork(container) {
        const theme = GRAPH_THEMES[currentThemeKey] || GRAPH_THEMES.mystic;

        const nodesArray = mapData.nodes.map(n => {
            const cat = theme.nodeColors[n.category] || theme.nodeColors.other;
            const isDanger = n.danger && n.danger.toLowerCase().includes('nguy') || n.danger && n.danger.toLowerCase().includes('tử');
            let iconEmoji = '📍';
            if (n.category === 'kingdom') iconEmoji = '👑 ';
            else if (n.category === 'city') iconEmoji = '🏙️ ';
            else if (n.category === 'dungeon') iconEmoji = '💀 ';
            else if (n.category === 'forest') iconEmoji = '🌲 ';
            else if (n.category === 'ruin') iconEmoji = '⛩️ ';

            return {
                id: n.id,
                label: `${iconEmoji}${n.label}\n(${n.danger || 'Bình yên'})`,
                title: `${n.label} - ${n.description || 'Chưa có thông tin'}`,
                color: {
                    background: cat.background,
                    border: isDanger ? '#ef4444' : cat.border,
                    highlight: { background: cat.highlight, border: '#ffffff' }
                },
                font: { color: theme.text, size: 14, face: 'sans-serif', bold: true },
                borderWidth: isDanger ? 3 : 2,
                shadow: true,
                shape: 'box',
                margin: 10
            };
        });

        const edgesArray = mapData.edges.map(e => ({
            from: e.from,
            to: e.to,
            label: e.label || '',
            color: { color: theme.edgeColor, highlight: '#38bdf8' },
            font: { color: theme.text, size: 12, align: 'horizontal' },
            arrows: 'to',
            smooth: { type: 'continuous' },
            width: 2
        }));

        const data = {
            nodes: new window.vis.DataSet(nodesArray),
            edges: new window.vis.DataSet(edgesArray)
        };

        const options = {
            physics: {
                forceAtlas2Based: {
                    gravitationalConstant: -70,
                    centralGravity: 0.01,
                    springLength: 150,
                    springConstant: 0.08
                },
                maxVelocity: 50,
                solver: 'forceAtlas2Based',
                timestep: 0.35,
                stabilization: { iterations: 180 }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                navigationButtons: true,
                keyboard: true
            }
        };

        // Dọn dẹp canvas cũ nếu có
        const searchBox = container.firstElementChild;
        container.innerHTML = '';
        if (searchBox) container.appendChild(searchBox);

        const graphDiv = doc.createElement('div');
        graphDiv.style.cssText = 'width: 100%; height: 100%;';
        container.appendChild(graphDiv);

        networkInstance = new window.vis.Network(graphDiv, data, options);

        networkInstance.on('click', params => {
            if (params.nodes.length > 0) {
                selectNode(params.nodes[0]);
            } else {
                selectedNodeId = null;
                renderInspector();
            }
        });
    }

    function initCanvasFallback(container) {
        const searchBox = container.firstElementChild;
        container.innerHTML = '';
        if (searchBox) container.appendChild(searchBox);

        const canvas = doc.createElement('canvas');
        canvas.style.cssText = 'width: 100%; height: 100%; background: transparent;';
        container.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px sans-serif';
        ctx.fillText('Bản đồ thế giới (Chế độ Canvas dựng sẵn) - Có ' + mapData.nodes.length + ' địa điểm.', 40, canvas.height / 2);
    }

    // ============ CHI TIẾT ĐỊA ĐIỂM (NODE INSPECTOR) ============
    function selectNode(id) {
        selectedNodeId = id;
        renderInspector();
    }

    function renderInspector() {
        const contentDiv = doc.getElementById('inspector_content');
        if (!contentDiv) return;

        if (!selectedNodeId) {
            contentDiv.innerHTML = `
                <div style="color: #64748b; font-style: italic; text-align: center; margin-top: 30px;">
                    Nhấp vào bất kỳ địa điểm (Node) nào trên bản đồ để xem và chỉnh sửa thông tin chi tiết.
                </div>
            `;
            return;
        }

        const node = mapData.nodes.find(n => n.id === selectedNodeId);
        if (!node) return;

        // Các đường nối liên quan
        const connectedEdges = mapData.edges.filter(e => e.from === node.id || e.to === node.id);
        let linksHTML = connectedEdges.map(e => {
            const targetId = e.from === node.id ? e.to : e.from;
            const targetNode = mapData.nodes.find(n => n.id === targetId);
            const targetName = targetNode ? targetNode.label : targetId;
            const arrow = e.from === node.id ? '➔' : '🡄';
            return `
                <div style="padding: 6px 10px; background: rgba(255,255,255,0.05); border-radius: 8px; font-size: 0.9em; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.08);">
                    <span><b style="color:#38bdf8;">${arrow} ${targetName}</b> (${e.label || 'Đường đi'})</span>
                    <button onclick="window._loreSelectNode('${targetId}')" style="background:transparent; border:none; color:#c084fc; cursor:pointer; font-weight:bold;">Đến 🎯</button>
                </div>
            `;
        }).join('') || '<div style="color:#64748b; font-size: 0.85em;">Chưa có đường nối nào tới địa điểm này.</div>';

        contentDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
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
                    <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Mô tả & Lịch sử trong Game</label>
                    <textarea id="insp_desc" class="lore-input" style="width: 100%; height: 110px; box-sizing: border-box; margin-top: 4px; resize: vertical; line-height: 1.5;">${node.description || ''}</textarea>
                </div>

                <div style="display: flex; gap: 8px; margin-top: 4px;">
                    <button id="insp_btn_save" class="lore-btn lore-btn-success" style="flex: 2; justify-content: center;">
                        <i class="fa-solid fa-floppy-disk"></i> Lưu Thay Đổi
                    </button>
                    <button id="insp_btn_delete" class="lore-btn lore-btn-danger" style="flex: 1; justify-content: center;">
                        <i class="fa-solid fa-trash"></i> Xóa
                    </button>
                </div>

                <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 12px;">
                    <label style="font-size: 0.78em; color: #38bdf8; font-weight: bold; text-transform: uppercase; display: block; margin-bottom: 8px;">🔗 Các Địa Điểm Kết Nối (${connectedEdges.length})</label>
                    <div style="display: flex; flex-direction: column; gap: 6px; max-height: 160px; overflow-y: auto;">
                        ${linksHTML}
                    </div>
                </div>
            </div>
        `;

        // Hàm nhảy node toàn cầu
        window._loreSelectNode = function (targetId) {
            selectNode(targetId);
            if (networkInstance && typeof networkInstance.focus === 'function') {
                networkInstance.focus(targetId, { scale: 1.3, animation: { duration: 500 } });
            }
        };

        // Sự kiện lưu & xóa
        contentDiv.querySelector('#insp_btn_save').addEventListener('click', () => {
            node.label = contentDiv.querySelector('#insp_label').value.trim() || node.label;
            node.category = contentDiv.querySelector('#insp_category').value;
            node.danger = contentDiv.querySelector('#insp_danger').value.trim() || 'Bình yên';
            node.description = contentDiv.querySelector('#insp_desc').value.trim();
            saveMapData();
            renderNetwork();
            alert('Đã cập nhật thông tin địa điểm!');
        });

        contentDiv.querySelector('#insp_btn_delete').addEventListener('click', () => {
            if (!confirm(`Bạn có chắc muốn xóa địa điểm "${node.label}" và tất cả đường đi liên quan?`)) return;
            mapData.nodes = mapData.nodes.filter(n => n.id !== node.id);
            mapData.edges = mapData.edges.filter(e => e.from !== node.id && e.to !== node.id);
            selectedNodeId = null;
            saveMapData();
            renderNetwork();
        });
    }

    // ============ AI PHÂN TÍCH VÀ XÂY DỰNG BẢN ĐỒ TỪ LỊCH SỬ CHAT ============
    async function triggerAiWorldScan() {
        const btnScan = doc.getElementById('lore_btn_ai_scan');
        if (btnScan) {
            btnScan.disabled = true;
            btnScan.classList.add('lore-ai-loading');
            btnScan.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang đọc lịch sử & dựng map...`;
        }

        try {
            const win = window.parent || window;
            let historyText = '';
            let chatArray = [];

            if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
                const ctx = win.SillyTavern.getContext();
                if (ctx && Array.isArray(ctx.chat)) chatArray = ctx.chat;
            } else if (win.chat && Array.isArray(win.chat)) {
                chatArray = win.chat;
            }

            // Lấy 25 tin nhắn gần nhất
            const recentChat = chatArray.slice(-25);
            historyText = recentChat.map(m => `${m.is_user ? 'Tôi' : (m.name || 'AI')}: ${m.mes || m.content || ''}`).join('\n---\n');

            if (!historyText || historyText.trim().length < 20) {
                alert('Lịch sử cuộc trò chuyện hiện tại quá ngắn để AI phân tích bản đồ!');
                return;
            }

            const existingNodesStr = mapData.nodes.map(n => `- ${n.label} (${n.category})`).join('\n');

            const prompt = `Bạn là Bậc Thầy Kiến Trúc Sư Địa Lý và Lịch Sử Thế Giới Game (World Lore Architect).
Dưới đây là Lịch sử trò chơi gần đây trong phòng chat:
=== LỊCH SỬ CHAT ===
${historyText.slice(0, 7000)}
====================

Các địa điểm hiện đã có trên bản đồ:
${existingNodesStr || '(Chưa có nhiều địa điểm)'}

NHIỆM VỤ CỦA BẠN:
1. Trích xuất tất cả các Địa Điểm, Vương Quốc, Thành Phố, Khu Rừng, Hầm Ngục, Căn Cứ, hoặc Di Tích xuất hiện, được nhắc đến, hoặc đi qua trong lịch sử trên.
2. Xác định mối liên kết giữa các địa điểm đó (Đường đi, Cổng dịch chuyển, Thuộc vùng quản lý, hay Thù địch...).
3. BẮT BUỘC trả về duy nhất 1 JSON hợp lệ (không kèm lời dẫn) theo mẫu sau:
{
  "nodes": [
    { "label": "Tên Địa Điểm rõ ràng", "category": "kingdom | city | dungeon | forest | ruin | other", "danger": "Bình yên | Nguy hiểm | Tử địa | Thù địch", "description": "Mô tả vai trò hoặc sự kiện tại đây" }
  ],
  "edges": [
    { "from_label": "Tên địa điểm xuất phát", "to_label": "Tên địa điểm đích đến", "label": "Mô tả đường đi hoặc mối quan hệ" }
  ]
}`;

            let responseJson = null;

            // Thử gọi AI qua generateRaw của SillyTavern trước (dùng backend đang kích hoạt của user)
            if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function' && typeof win.SillyTavern.getContext().generateRaw === 'function') {
                try {
                    const rawRes = await win.SillyTavern.getContext().generateRaw(prompt);
                    responseJson = parseJsonFromText(rawRes);
                } catch (e) {
                    console.warn('[Lore World Map] Gọi generateRaw thất bại, chuyển sang PhoneSystem:', e);
                }
            }

            // Fallback sang PhoneSystem.callExternalAPI
            if (!responseJson && win.PhoneSystem && typeof win.PhoneSystem.callExternalAPI === 'function') {
                try {
                    const rawRes = await win.PhoneSystem.callExternalAPI([
                        { role: 'system', content: 'Bạn là chuyên gia phân tích dữ liệu địa lý trò chơi và xuất JSON hợp lệ 100%.' },
                        { role: 'user', content: prompt }
                    ], { maxTokens: 4000, temperature: 0.7 });
                    responseJson = parseJsonFromText(rawRes);
                } catch (e) {
                    console.warn('[Lore World Map] Gọi PhoneSystem thất bại:', e);
                }
            }

            if (!responseJson || !Array.isArray(responseJson.nodes)) {
                throw new Error('AI không trả về JSON bản đồ hợp lệ hoặc bạn chưa kết nối AI trong SillyTavern!');
            }

            // MERGE (GỘP) DỮ LIỆU AI VÀO BẢN ĐỒ HIỆN TẠI
            let newNodesCount = 0;
            let newEdgesCount = 0;

            responseJson.nodes.forEach(item => {
                if (!item || !item.label) return;
                const cleanLabel = item.label.trim();
                let existing = mapData.nodes.find(n => n.label.toLowerCase() === cleanLabel.toLowerCase());
                if (existing) {
                    // Cập nhật mô tả nếu có thêm chi tiết
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

            if (win.toastr) {
                win.toastr.success(`🎉 AI đã phân tích xong! Thêm mới ${newNodesCount} địa điểm và ${newEdgesCount} liên kết vào bản đồ.`);
            } else {
                alert(`🎉 AI đã dựng xong bản đồ cho chat này!\n+ ${newNodesCount} địa điểm mới\n+ ${newEdgesCount} đường nối mới`);
            }
        } catch (err) {
            console.error('[Lore World Map] Lỗi AI Scan:', err);
            alert('⚠️ Lỗi khi dựng bản đồ AI: ' + err.message);
        } finally {
            if (btnScan) {
                btnScan.disabled = false;
                btnScan.classList.remove('lore-ai-loading');
                btnScan.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> AI Quét Lịch Sử & Xây Map`;
            }
        }
    }

    function parseJsonFromText(text) {
        if (!text) return null;
        let str = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const start = str.indexOf('{');
        const end = str.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
            str = str.substring(start, end + 1);
            return JSON.parse(str);
        }
        return JSON.parse(str);
    }

    // ============ MỞ / ĐÓNG MODAL ============
    function toggleGraphModal() {
        injectStyles();
        createGraphModal();
        applyTheme();
        loadMapDataForCurrentChat();

        const overlay = doc.getElementById('lore_graph_modal_overlay');
        if (overlay) {
            if (overlay.style.display === 'flex') {
                overlay.style.display = 'none';
            } else {
                overlay.style.display = 'flex';
                renderNetwork();
            }
        }
    }

    // ============ KHỞI TẠO HỆ THỐNG KHI TẢI XONG ============
    function init() {
        injectStyles();
        createStandaloneBubble();
        registerToMasterBall();

        // Lắng nghe sự kiện đổi chat trong SillyTavern để tự tải lại bản đồ tương ứng
        try {
            const win = window.parent || window;
            if (win.eventSource && typeof win.eventSource.on === 'function') {
                win.eventSource.on('chatLoaded', () => {
                    console.log('[Lore World Map] Phát hiện chuyển chat, đang tải bản đồ chat mới...');
                    loadMapDataForCurrentChat();
                });
            }
        } catch (e) {}
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
