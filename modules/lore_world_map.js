/**
 * KAIZ Collection - Bản Đồ Thế Giới AI (Lore World Graph) - v3.0 Masterpiece
 * - KHÔNG có bóng nổi độc lập (chỉ tích hợp gọn trong bóng mẹ FloatingMenuManager).
 * - 1 Theme chính duy nhất: 🌌 Đêm Huyền Bí (Cyber-Fantasy Glassmorphism) được chăm chút tối đa.
 * - Bố cục siêu thích ứng (Responsive): Tự động chuyển đổi layout dọc/ngang khi thu nhỏ màn hình hoặc chia cột.
 * - Dữ liệu phong phú (Rich Lore): Lực lượng kiểm soát, Tài nguyên/Đặc điểm, Trạng thái, Loại đường đi & Khoảng cách.
 * - Hiển thị tuyệt đẹp: Mũi tên uốn cong theo loại quan hệ (Cổng dịch chuyển, Chiến tuyến thù địch, Đường mòn...).
 * - Cài đặt AI chuyên sâu: Cho phép xem nguồn kết nối, chọn dùng AI của SillyTavern hoặc cấu hình Model/API riêng cho bản đồ.
 */

(function () {
    'use strict';

    console.log('[Lore World Map] Đang khởi tạo module Bản Đồ Thế Giới AI v3.0...');

    const MODULE_ID = 'lore_world_map_graph';
    const MODULE_TITLE = 'Bản Đồ Thế Giới (Graph AI)';
    const STORAGE_PREFIX = 'kaiz_lore_graph_map_';
    const AI_CONFIG_KEY = 'kaiz_lore_graph_ai_config';

    // ============ HỆ THỐNG CÀI ĐẶT AI (AI CONFIG) ============
    let aiConfig = {
        source: 'sillytavern', // 'sillytavern' | 'custom'
        customUrl: 'https://api.openai.com/v1/chat/completions',
        customKey: '',
        customModel: 'gpt-4o-mini',
        historyCount: 30 // Số tin nhắn quét gần nhất
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

    // ============ THEME DUY NHẤT: ĐÊM HUYỀN BÍ (CYBER-FANTASY GLASSMORPHISM) ============
    const THEME = {
        bg: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #090d16 100%)',
        panelBg: 'rgba(15, 23, 42, 0.92)',
        border: 'rgba(192, 132, 252, 0.35)',
        text: '#f8fafc',
        edgeText: '#e2e8f0',
        edgeLabelBg: 'rgba(15, 23, 42, 0.88)',
        nodeCategories: {
            kingdom: { label: '👑 Vương quốc', bg: '#581c87', border: '#d8b4fe', highlight: '#9333ea', color: '#f3e8ff' },
            city: { label: '🏙️ Thành phố', bg: '#1e3a8a', border: '#93c5fd', highlight: '#2563eb', color: '#eff6ff' },
            dungeon: { label: '💀 Hầm ngục', bg: '#881337', border: '#fda4af', highlight: '#e11d48', color: '#fff1f2' },
            forest: { label: '🌲 Rừng rậm / Hoang dã', bg: '#14532d', border: '#86efac', highlight: '#16a34a', color: '#f0fdf4' },
            ruin: { label: '⛩️ Di tích / Thánh địa', bg: '#78350f', border: '#fde68a', highlight: '#d97706', color: '#fefce8' },
            other: { label: '📍 Địa điểm khác', bg: '#334155', border: '#cbd5e1', highlight: '#475569', color: '#f8fafc' }
        },
        edgeRelations: {
            path: { label: '🛣️ Đường nối / Mòn', color: '#818cf8', dashes: false, width: 2.2 },
            portal: { label: '🌌 Cổng dịch chuyển / Phép', color: '#c084fc', dashes: [8, 6], width: 2.8 },
            hostile: { label: '⚔️ Chiến tuyến thù địch', color: '#f43f5e', dashes: [4, 4], width: 2.6 },
            ally: { label: '🤝 Liên minh / Mậu dịch', color: '#34d399', dashes: false, width: 2.5 }
        }
    };

    let activeChatId = 'default_global_chat';
    let mapData = { nodes: [], edges: [] };
    let networkInstance = null;
    let selectedNodeId = null;

    const SVG_GLOBE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

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
                mapData = JSON.parse(raw);
                if (!Array.isArray(mapData.nodes)) mapData.nodes = [];
                if (!Array.isArray(mapData.edges)) mapData.edges = [];
            } catch (e) {
                mapData = { nodes: [], edges: [] };
            }
        } else {
            mapData = {
                nodes: [
                    {
                        id: 'start_node',
                        label: 'Thành phố Khởi Đầu',
                        category: 'city',
                        danger: 'Bình yên',
                        controlled_by: 'Hội Nhà Mạo Hiểm',
                        resources: 'Quán trọ ấm cúng, Chợ giao dịch ma thạch',
                        status: 'Bình thường',
                        description: 'Nơi câu chuyện của bạn bắt đầu tại thế giới này.'
                    }
                ],
                edges: []
            };
            saveMapData();
        }
        updateUI();
    }

    function saveMapData() {
        activeChatId = getActiveChatId();
        try { localStorage.setItem(STORAGE_PREFIX + activeChatId, JSON.stringify(mapData)); } catch (e) {}
    }

    const doc = (window.parent && window.parent.document) || document;

    function injectStyles() {
        if (doc.getElementById('lore-world-map-styles-v3')) return;
        const style = doc.createElement('style');
        style.id = 'lore-world-map-styles-v3';
        style.innerHTML = `
            /* Bỏ bóng riêng theo yêu cầu của user, chỉ giữ lại CSS cho Modal chính và responsive */
            #lore_graph_modal_overlay {
                position: fixed;
                inset: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0, 0, 0, 0.86);
                backdrop-filter: blur(14px);
                z-index: 99999999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 12px;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
            }
            #lore_graph_modal_content {
                width: 100%;
                max-width: 1380px;
                height: 92vh;
                border-radius: 22px;
                box-shadow: 0 25px 65px rgba(0,0,0,0.85);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
                background: ${THEME.bg};
                border: 1px solid ${THEME.border};
                color: ${THEME.text};
            }
            /* Header Toolbar Responsive */
            #lore_graph_header {
                min-height: 64px;
                border-bottom: 1px solid rgba(255,255,255,0.12);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 18px;
                flex-shrink: 0;
                background: rgba(0,0,0,0.55);
                gap: 12px;
                flex-wrap: wrap;
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
            /* Container chính - chuyển thành Column khi màn hình nhỏ (<850px) */
            #lore_main_container {
                flex: 1;
                display: flex;
                flex-direction: row;
                overflow: hidden;
                position: relative;
            }
            @media (max-width: 860px) {
                #lore_main_container {
                    flex-direction: column !important;
                }
                #lore_graph_inspector {
                    width: 100% !important;
                    max-height: 44% !important;
                    border-left: none !important;
                    border-top: 1px solid rgba(255,255,255,0.18) !important;
                }
                #lore_graph_header {
                    justify-content: center;
                }
            }
            .lore-btn {
                padding: 8px 13px;
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
                padding: 8px 11px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.18);
                background: rgba(0,0,0,0.45);
                color: #fff;
                font-size: 0.88em;
                outline: none;
            }
            .lore-input:focus { border-color: #38bdf8; box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2); }
            #lore_graph_inspector {
                width: 380px;
                background: rgba(15, 23, 42, 0.96);
                border-left: 1px solid rgba(255,255,255,0.12);
                padding: 18px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 14px;
                flex-shrink: 0;
            }
            .lore-control-dock {
                position: absolute;
                bottom: 18px;
                right: 18px;
                z-index: 100;
                display: flex;
                gap: 6px;
                background: rgba(15, 23, 42, 0.9);
                padding: 6px;
                border-radius: 14px;
                border: 1px solid rgba(255, 255, 255, 0.18);
                backdrop-filter: blur(8px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.6);
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
            .lore-dock-btn:hover { background: rgba(56, 189, 248, 0.25); color: #38bdf8; border-color: rgba(56, 189, 248, 0.4); transform: scale(1.06); }
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
            
            /* Modal Cài đặt AI */
            #lore_ai_config_modal {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.8);
                z-index: 100000000;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 16px;
            }
            #lore_ai_config_box {
                width: 100%;
                max-width: 520px;
                background: #0f172a;
                border: 1px solid #38bdf8;
                border-radius: 18px;
                padding: 22px;
                color: #fff;
                box-shadow: 0 20px 50px rgba(0,0,0,0.8);
                display: flex;
                flex-direction: column;
                gap: 14px;
            }
        `;
        doc.head.appendChild(style);
    }

    // ============ ĐĂNG KÝ VÀO BÓNG MẸ (KHÔNG TẠO BÓNG RIÊNG NỮA) ============
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
            console.log('[Lore World Map] Đã đăng ký thành công vào Bóng Mẹ (FloatingMenuManager)');
        } else {
            win._fmmPendingRegistrations = win._fmmPendingRegistrations || [];
            if (!win._fmmPendingRegistrations.some(b => b.id === fmmConfig.id)) {
                win._fmmPendingRegistrations.push(fmmConfig);
            }
        }
    }

    // ============ TẠO MODAL BẢN ĐỒ & MODAL CÀI ĐẶT AI ============
    function createGraphModal() {
        if (doc.getElementById('lore_graph_modal_overlay')) return;
        loadAiConfig();

        const overlay = doc.createElement('div');
        overlay.id = 'lore_graph_modal_overlay';
        overlay.innerHTML = `
            <div id="lore_graph_modal_content">
                <!-- Header Toolbar Responsive -->
                <div id="lore_graph_header">
                    <div class="lore-header-left">
                        <div style="width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #38bdf8, #818cf8); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 10px rgba(56,189,248,0.4); flex-shrink: 0;">
                            ${SVG_GLOBE_ICON}
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 1.08em; color: #f8fafc; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span>BẢN ĐỒ THẾ GIỚI AI</span>
                                <span id="lore_stats_badge" style="background: rgba(56,189,248,0.18); color: #38bdf8; font-size: 0.72em; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.3);">0 địa điểm</span>
                                <span id="lore_ai_badge" style="background: rgba(168,85,247,0.18); color: #c084fc; font-size: 0.72em; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(168,85,247,0.3); cursor: pointer;" title="Nhấp để cấu hình nguồn kết nối AI">🤖 Nguồn AI</span>
                            </div>
                            <div id="lore_chat_status" style="font-size: 0.8em; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;">Chat ID: <span style="color: #c084fc;">...</span></div>
                        </div>
                    </div>

                    <div class="lore-header-actions">
                        <!-- Ô tìm kiếm ngay trên toolbar -->
                        <div style="display: flex; align-items: center; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; padding: 2px 8px;">
                            <i class="fa-solid fa-magnifying-glass" style="color: #94a3b8; font-size: 0.85em; margin-right: 6px;"></i>
                            <input id="lore_search_input" type="text" placeholder="Tìm địa điểm..." style="background: transparent; border: none; color: #fff; font-size: 0.88em; width: 130px; outline: none; padding: 4px 0;">
                        </div>

                        <button id="lore_btn_ai_scan" class="lore-btn lore-btn-primary" title="Bắt AI phân tích lịch sử chat để tự động thêm địa điểm & đường đi với đầy đủ thông tin lực lượng, tài nguyên">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Quét & Xây Map
                        </button>

                        <button id="lore_btn_add_node" class="lore-btn lore-btn-secondary" title="Thêm địa điểm thủ công">
                            <i class="fa-solid fa-location-dot"></i> + Địa Điểm
                        </button>

                        <button id="lore_btn_add_edge" class="lore-btn lore-btn-secondary" title="Nối đường giữa 2 địa điểm">
                            <i class="fa-solid fa-route"></i> + Nối Đường
                        </button>

                        <button id="lore_btn_ai_settings" class="lore-btn lore-btn-secondary" title="Cài đặt nguồn kết nối AI (SillyTavern / Custom API)">
                            <i class="fa-solid fa-gear"></i> Cấu hình AI
                        </button>

                        <button id="lore_btn_close_modal" class="lore-btn" style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #f87171; padding: 8px 12px; font-size: 1.05em;" title="Đóng bản đồ">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Main Viewport + Inspector (Responsive: Column khi nhỏ, Row khi lớn) -->
                <div id="lore_main_container">
                    <!-- Graph Viewport -->
                    <div id="lore_graph_viewport" style="flex: 1; height: 100%; position: relative;">
                        <!-- Custom Control Dock -->
                        <div class="lore-control-dock">
                            <button id="dock_btn_zoomin" class="lore-dock-btn" title="Phóng to">+</button>
                            <button id="dock_btn_zoomout" class="lore-dock-btn" title="Thu nhỏ">-</button>
                            <button id="dock_btn_fit" class="lore-dock-btn" title="Xem toàn cảnh"><i class="fa-solid fa-compress"></i></button>
                            <button id="dock_btn_relayout" class="lore-dock-btn" title="Sắp xếp lại vật lý"><i class="fa-solid fa-rotate-right"></i></button>
                        </div>
                    </div>

                    <!-- Inspector Sidebar Panel -->
                    <div id="lore_graph_inspector">
                        <div style="font-weight: 800; font-size: 1em; color: #38bdf8; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <span>🏷️ THÔNG TIN ĐỊA ĐIỂM</span>
                            <span id="inspector_close_btn" style="cursor: pointer; color: #94a3b8; font-size: 1.1em;" title="Bỏ chọn">✕</span>
                        </div>
                        <div id="inspector_content" style="font-size: 0.9em; color: #cbd5e1; line-height: 1.6; display: flex; flex-direction: column; gap: 12px;">
                            <!-- Nội dung nạp tự động -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL CÀI ĐẶT AI (AI CONFIG MODAL) -->
            <div id="lore_ai_config_modal">
                <div id="lore_ai_config_box">
                    <div style="font-weight: 800; font-size: 1.15em; color: #38bdf8; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 10px;">
                        <span>🤖 CẤU HÌNH NGUỒN KẾT NỐI AI</span>
                        <span id="ai_cfg_close" style="cursor: pointer; color: #f87171;">✕</span>
                    </div>

                    <div style="font-size: 0.86em; color: #cbd5e1; line-height: 1.5; background: rgba(56,189,248,0.1); padding: 10px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.25);">
                        ℹ️ <b>Hiện tại bản đồ lấy dữ liệu từ đâu?</b><br>
                        Mặc định script sẽ dùng ngay Model/Backend bạn đang kích hoạt trong bảng API của SillyTavern (qua <code>generateRaw</code>). Bạn có thể đổi sang dùng Custom API/Key riêng dưới đây nếu muốn!
                    </div>

                    <div>
                        <label style="font-size: 0.8em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Nguồn Kết Nối (Backend Source)</label>
                        <select id="cfg_source" class="lore-input" style="width: 100%; margin-top: 4px;">
                            <option value="sillytavern">⭐ Sử dụng AI đang kích hoạt của SillyTavern (Mặc định)</option>
                            <option value="custom">🔑 Sử dụng Custom API Endpoint & Model riêng</option>
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
                            <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold;">Tên Model (Model Name)</label>
                            <input id="cfg_model" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px;" placeholder="gpt-4o-mini / claude-3-5-sonnet">
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

        // Sự kiện đóng mở modal bản đồ
        overlay.querySelector('#lore_btn_close_modal').addEventListener('click', () => {
            overlay.style.display = 'none';
        });

        overlay.querySelector('#inspector_close_btn').addEventListener('click', () => {
            selectedNodeId = null;
            renderInspector();
            if (networkInstance && typeof networkInstance.unselectAll === 'function') {
                networkInstance.unselectAll();
            }
        });

        // Sự kiện mở & xử lý Cài đặt AI
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

        overlay.querySelector('#ai_cfg_close').addEventListener('click', () => {
            aiModal.style.display = 'none';
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

        // Điều hướng Custom Control Dock
        overlay.querySelector('#dock_btn_zoomin').addEventListener('click', () => {
            if (networkInstance && typeof networkInstance.getScale === 'function') {
                networkInstance.moveTo({ scale: networkInstance.getScale() * 1.3, animation: { duration: 300 } });
            }
        });
        overlay.querySelector('#dock_btn_zoomout').addEventListener('click', () => {
            if (networkInstance && typeof networkInstance.getScale === 'function') {
                networkInstance.moveTo({ scale: networkInstance.getScale() * 0.75, animation: { duration: 300 } });
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

        // Thêm node thủ công
        overlay.querySelector('#lore_btn_add_node').addEventListener('click', () => {
            const name = prompt('Nhập tên địa điểm mới:', 'Khu Vực Mới');
            if (!name || !name.trim()) return;
            const category = prompt('Phân loại (kingdom / city / dungeon / forest / ruin / other):', 'city') || 'city';
            const danger = prompt('Mức độ nguy hiểm (Bình yên / Nguy hiểm / Tử địa...):', 'Bình yên') || 'Bình yên';
            const controlled = prompt('Ai hoặc thế lực nào kiểm soát nơi này?', 'Không rõ') || 'Không rõ';
            const resources = prompt('Đặc điểm nổi bật / Tài nguyên tại đây:', 'Quang cảnh thiên nhiên') || '';
            const desc = prompt('Mô tả chi tiết hoặc lịch sử địa điểm:', 'Một địa điểm mới được khám phá.') || '';

            const id = 'node_' + Date.now();
            mapData.nodes.push({
                id,
                label: name.trim(),
                category: category.trim(),
                danger: danger.trim(),
                controlled_by: controlled.trim(),
                resources: resources.trim(),
                status: 'Bình thường',
                description: desc.trim()
            });
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

            const nFrom = mapData.nodes.find(n => n.id === fromId || n.label.toLowerCase() === fromId.toLowerCase());
            const nTo = mapData.nodes.find(n => n.id === toId || n.label.toLowerCase() === toId.toLowerCase());
            if (!nFrom || !nTo) {
                alert('Không tìm thấy địa điểm xuất phát hoặc đích đến hợp lệ!');
                return;
            }

            const relType = prompt('Loại liên kết (path: Đường nối / portal: Cổng dịch chuyển / hostile: Chiến tuyến / ally: Liên minh):', 'path') || 'path';
            const label = prompt('Mô tả đường đi (VD: Đường bộ phía Bắc, Cổng ma thuật...):', 'Đường nối');
            const dist = prompt('Khoảng cách / Thời gian di chuyển (VD: 2 giờ đi bộ, 10km, Tức thời...):', 'Gần') || 'Gần';

            mapData.edges.push({
                from: nFrom.id,
                to: nTo.id,
                label: label || '',
                relation_type: ['path', 'portal', 'hostile', 'ally'].includes(relType) ? relType : 'path',
                distance: dist
            });
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
            const found = mapData.nodes.find(n => n.label.toLowerCase().includes(kw) || (n.description && n.description.toLowerCase().includes(kw)) || (n.resources && n.resources.toLowerCase().includes(kw)));
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

    function updateUI() {
        loadAiConfig();
        const statusBox = doc.getElementById('lore_chat_status');
        const badgeStats = doc.getElementById('lore_stats_badge');
        const badgeAi = doc.getElementById('lore_ai_badge');

        if (statusBox) statusBox.innerHTML = `Chat ID: <span style="color: #c084fc;">${activeChatId}</span>`;
        if (badgeStats) badgeStats.innerText = `${mapData.nodes.length} địa điểm, ${mapData.edges.length} liên kết`;
        if (badgeAi) {
            badgeAi.innerText = aiConfig.source === 'custom' ? `⚡ Custom AI (${aiConfig.customModel || 'model'})` : `⭐ SillyTavern AI`;
        }
    }

    // ============ RENDER ĐỒ THỊ VIS.JS TUYỆT ĐẸP ============
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
        const nodesArray = mapData.nodes.map(n => {
            const cat = THEME.nodeCategories[n.category] || THEME.nodeCategories.other;
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
                title: `${n.label}\n• Phân loại: ${cat.label}\n• Kiểm soát: ${n.controlled_by || 'Không rõ'}\n• Đặc điểm/Tài nguyên: ${n.resources || 'Không có'}\n• Trạng thái: ${n.status || 'Bình thường'}`,
                color: {
                    background: cat.bg,
                    border: isDanger ? '#ef4444' : cat.border,
                    highlight: { background: cat.highlight, border: '#ffffff' }
                },
                font: { color: THEME.text, size: 14, face: '-apple-system, Inter, sans-serif', bold: true },
                borderWidth: isDanger ? 3 : 2,
                shadow: { enabled: true, color: 'rgba(0,0,0,0.6)', size: 12, x: 0, y: 5 },
                shape: 'box',
                margin: 12
            };
        });

        const edgesArray = mapData.edges.map(e => {
            const relStyle = THEME.edgeRelations[e.relation_type] || THEME.edgeRelations.path;
            const labelText = e.distance ? `${e.label || 'Kết nối'} (${e.distance})` : (e.label || 'Kết nối');
            const wrappedLabel = wrapText(labelText, 24);

            return {
                from: e.from,
                to: e.to,
                label: wrappedLabel,
                title: `${relStyle.label}\n• Mô tả: ${e.label || 'Không có'}\n• Khoảng cách: ${e.distance || 'Không rõ'}`,
                color: { color: relStyle.color, highlight: '#38bdf8' },
                dashes: relStyle.dashes || false,
                font: {
                    color: THEME.edgeText,
                    size: 11.5,
                    face: '-apple-system, Inter, sans-serif',
                    background: THEME.edgeLabelBg,
                    strokeWidth: 0, // Tắt viền trắng thô ráp
                    align: 'horizontal'
                },
                arrows: { to: { enabled: true, scaleFactor: 0.85 } },
                smooth: { type: 'continuous', roundness: 0.2 },
                width: relStyle.width || 2.2
            };
        });

        const data = {
            nodes: new window.vis.DataSet(nodesArray),
            edges: new window.vis.DataSet(edgesArray)
        };

        const options = {
            physics: {
                forceAtlas2Based: {
                    gravitationalConstant: -90,
                    centralGravity: 0.012,
                    springLength: 230,
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
                navigationButtons: false,
                keyboard: true
            }
        };

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

    // ============ RENDER BẢNG INSPECTOR CHI TIẾT PHONG PHÚ ============
    function renderInspector() {
        const contentDiv = doc.getElementById('inspector_content');
        if (!contentDiv) return;

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
                            🛡️ Kiểm soát: ${n.controlled_by || 'Không rõ'} | ${n.description || 'Chưa có mô tả'}
                        </div>
                    </div>
                `;
            }).join('') || '<div style="color: #64748b; text-align: center;">Bản đồ chưa có địa điểm nào.</div>';

            contentDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 14px;">
                    <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 12px; font-size: 0.86em; color: #e0f2fe;">
                        💡 <b>Mẹo thao tác:</b> Nhấp chuột giữ và kéo để di chuyển địa điểm. Cuộn chuột để zoom. Nhấp vào bất kỳ địa điểm nào để sửa chi tiết về Lực lượng, Tài nguyên và Kết nối!
                    </div>

                    <div>
                        <div style="font-size: 0.78em; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
                            📋 TẤT CẢ ĐỊA ĐIỂM (${mapData.nodes.length})
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 520px; overflow-y: auto; padding-right: 4px;">
                            ${listNodesHTML}
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        const node = mapData.nodes.find(n => n.id === selectedNodeId);
        if (!node) return;

        const connectedEdges = mapData.edges.filter(e => e.from === node.id || e.to === node.id);
        let linksHTML = connectedEdges.map(e => {
            const targetId = e.from === node.id ? e.to : e.from;
            const targetNode = mapData.nodes.find(n => n.id === targetId);
            const targetName = targetNode ? targetNode.label : targetId;
            const arrow = e.from === node.id ? '➔ ĐẾN' : '🡄 TỪ';
            const relInfo = THEME.edgeRelations[e.relation_type] || THEME.edgeRelations.path;

            return `
                <div style="padding: 10px 12px; background: rgba(255,255,255,0.05); border-radius: 10px; font-size: 0.88em; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.08);">
                    <div style="overflow: hidden; max-width: 210px;">
                        <div style="font-weight: 700; color: #38bdf8;">${arrow}: ${targetName}</div>
                        <div style="font-size: 0.8em; color: ${relInfo.color}; font-weight: bold; margin-top: 2px;">${relInfo.label}</div>
                        <div style="font-size: 0.82em; color: #94a3b8; margin-top: 1px;">${e.label || 'Đường đi'} ${e.distance ? `(${e.distance})` : ''}</div>
                    </div>
                    <button onclick="window._loreJumpToNode('${targetId}')" class="lore-btn" style="background: rgba(168,85,247,0.2); border: 1px solid rgba(168,85,247,0.4); color: #c084fc; padding: 6px 10px; font-size: 0.85em;" title="Chuyển sang địa điểm này">🎯</button>
                </div>
            `;
        }).join('') || '<div style="color:#64748b; font-size: 0.85em;">Chưa có kết nối nào tới địa điểm này.</div>';

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

                <div style="display: flex; gap: 8px;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Kiểm soát bởi</label>
                        <input id="insp_controlled" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 4px;" value="${node.controlled_by || 'Không rõ'}" placeholder="Ai sở hữu nơi này?">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Trạng thái</label>
                        <input id="insp_status" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 4px;" value="${node.status || 'Bình thường'}" placeholder="Bình thường / Chiến tranh...">
                    </div>
                </div>

                <div>
                    <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Đặc điểm nổi bật & Tài nguyên</label>
                    <input id="insp_resources" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 4px;" value="${node.resources || ''}" placeholder="Suối nước nóng, Ma thạch, Cấm địa...">
                </div>

                <div>
                    <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Mô tả & Lịch sử trong Game</label>
                    <textarea id="insp_desc" class="lore-input" style="width: 100%; height: 95px; box-sizing: border-box; margin-top: 4px; resize: vertical; line-height: 1.5;">${node.description || ''}</textarea>
                </div>

                <div style="display: flex; gap: 8px; margin-top: 2px;">
                    <button id="insp_btn_save" class="lore-btn lore-btn-success" style="flex: 2; justify-content: center;">
                        <i class="fa-solid fa-floppy-disk"></i> Lưu Thay Đổi
                    </button>
                    <button id="insp_btn_delete" class="lore-btn lore-btn-danger" style="flex: 1; justify-content: center;">
                        <i class="fa-solid fa-trash"></i> Xóa
                    </button>
                </div>

                <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 12px;">
                    <label style="font-size: 0.78em; color: #38bdf8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 8px;">🔗 Các Địa Điểm Kết Nối (${connectedEdges.length})</label>
                    <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
                        ${linksHTML}
                    </div>
                </div>
            </div>
        `;

        contentDiv.querySelector('#insp_btn_save').addEventListener('click', () => {
            node.label = contentDiv.querySelector('#insp_label').value.trim() || node.label;
            node.category = contentDiv.querySelector('#insp_category').value;
            node.danger = contentDiv.querySelector('#insp_danger').value.trim() || 'Bình yên';
            node.controlled_by = contentDiv.querySelector('#insp_controlled').value.trim() || 'Không rõ';
            node.status = contentDiv.querySelector('#insp_status').value.trim() || 'Bình thường';
            node.resources = contentDiv.querySelector('#insp_resources').value.trim();
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

    window._loreJumpToNode = function (targetId) {
        selectNode(targetId);
        if (networkInstance && typeof networkInstance.focus === 'function') {
            networkInstance.focus(targetId, { scale: 1.35, animation: { duration: 550, easingFunction: 'easeInOutQuad' } });
            networkInstance.selectNodes([targetId]);
        }
    };

    // ============ AI PHÂN TÍCH VÀ XÂY DỰNG BẢN ĐỒ VỚI DỮ LIỆU PHONG PHÚ ============
    async function triggerAiWorldScan() {
        loadAiConfig();
        const btnScan = doc.getElementById('lore_btn_ai_scan');
        if (btnScan) {
            btnScan.disabled = true;
            btnScan.classList.add('lore-ai-loading');
            btnScan.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang đọc chat & xây map...`;
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

            const existingNodesStr = mapData.nodes.map(n => `- ${n.label} (${n.category}, Kiểm soát: ${n.controlled_by})`).join('\n');
            const prompt = `Bạn là Bậc Thầy Kiến Trúc Sư Địa Lý Game (World Lore Architect).
Dưới đây là Lịch sử trò chơi gần đây (${historyLimit} tin nhắn):
=== LỊCH SỬ CHAT ===
${historyText.slice(0, 8500)}
====================

Các địa điểm đã có trên bản đồ:
${existingNodesStr || '(Chưa có)'}

NHIỆM VỤ:
1. Trích xuất các Địa Điểm, Vương Quốc, Thành Phố, Hầm Ngục, Rừng Rậm, hoặc Di Tích xuất hiện/được nhắc đến.
2. Với mỗi địa điểm, hãy suy luận hoặc trích xuất rõ: Ai kiểm soát (controlled_by), Tài nguyên/Đặc điểm nổi bật (resources), Trạng thái (status) và Mức độ nguy hiểm.
3. Với các liên kết, phân loại rõ relation_type (path: Đường mòn / portal: Cổng dịch chuyển / hostile: Chiến tuyến / ally: Liên minh) và ước tính khoảng cách/thời gian di chuyển (distance).
4. TRẢ VỀ DUY NHẤT 1 JSON HỢP LỆ (không kèm lời dẫn):
{
  "nodes": [
    {
      "label": "Tên địa điểm ngắn gọn",
      "category": "kingdom | city | dungeon | forest | ruin | other",
      "danger": "Bình yên | Nguy hiểm | Tử địa | Thù địch",
      "controlled_by": "Tên thế lực hoặc nhân vật kiểm soát",
      "resources": "Đặc điểm, tài nguyên nổi bật tại đây",
      "status": "Bình thường / Chiến tranh / Phong tỏa...",
      "description": "Mô tả vai trò chi tiết"
    }
  ],
  "edges": [
    {
      "from_label": "Tên địa điểm xuất phát",
      "to_label": "Tên địa điểm đích đến",
      "label": "Nhãn ngắn gọn dưới 20 ký tự",
      "relation_type": "path | portal | hostile | ally",
      "distance": "VD: 2 giờ đi bộ / 10km / Dịch chuyển tức thời"
    }
  ]
}`;

            let responseJson = null;

            // Nếu user chọn dùng Custom API
            if (aiConfig.source === 'custom' && aiConfig.customUrl && aiConfig.customKey) {
                try {
                    const res = await fetch(aiConfig.customUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${aiConfig.customKey}`
                        },
                        body: JSON.stringify({
                            model: aiConfig.customModel || 'gpt-4o-mini',
                            messages: [
                                { role: 'system', content: 'Bạn là chuyên gia xuất JSON bản đồ game hợp lệ 100%.' },
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

            // Nếu user chọn SillyTavern hoặc Custom API thất bại
            if (!responseJson && win.SillyTavern && typeof win.SillyTavern.getContext === 'function' && typeof win.SillyTavern.getContext().generateRaw === 'function') {
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
                throw new Error('AI không trả về JSON hợp lệ! Hãy kiểm tra lại kết nối AI trong SillyTavern hoặc trong nút [⚙️ Cấu hình AI].');
            }

            let newNodesCount = 0;
            let newEdgesCount = 0;

            responseJson.nodes.forEach(item => {
                if (!item || !item.label) return;
                const cleanLabel = item.label.trim();
                let existing = mapData.nodes.find(n => n.label.toLowerCase() === cleanLabel.toLowerCase());
                if (existing) {
                    if (item.description && (!existing.description || existing.description.length < item.description.length)) existing.description = item.description;
                    if (item.danger) existing.danger = item.danger;
                    if (item.controlled_by && !existing.controlled_by) existing.controlled_by = item.controlled_by;
                    if (item.resources && !existing.resources) existing.resources = item.resources;
                    if (item.status) existing.status = item.status;
                } else {
                    const newId = 'node_' + Math.random().toString(36).substr(2, 8);
                    mapData.nodes.push({
                        id: newId,
                        label: cleanLabel,
                        category: ['kingdom', 'city', 'dungeon', 'forest', 'ruin'].includes(item.category) ? item.category : 'other',
                        danger: item.danger || 'Bình yên',
                        controlled_by: item.controlled_by || 'Không rõ',
                        resources: item.resources || '',
                        status: item.status || 'Bình thường',
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
                            mapData.edges.push({
                                from: fromNode.id,
                                to: toNode.id,
                                label: link.label || 'Kết nối',
                                relation_type: ['path', 'portal', 'hostile', 'ally'].includes(link.relation_type) ? link.relation_type : 'path',
                                distance: link.distance || ''
                            });
                            newEdgesCount++;
                        }
                    }
                });
            }

            saveMapData();
            renderNetwork();
            if (win.toastr) win.toastr.success(`🎉 AI đã xây xong! +${newNodesCount} địa điểm, +${newEdgesCount} liên kết.`);
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

    // ============ TOGGLE MODAL ============
    function toggleGraphModal() {
        injectStyles();
        createGraphModal();
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

    // ============ KHỞI TẠO ============
    function init() {
        injectStyles();
        registerToMasterBall(); // Chỉ đăng ký vào bóng mẹ, không tạo bóng riêng

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
