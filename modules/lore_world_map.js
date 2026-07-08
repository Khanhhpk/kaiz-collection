/**
 * KAIZ Collection - Bản Đồ Thế Giới AI (Universal World Graph) - v6.0 Next-Gen Visual & Responsive Masterpiece
 * - Khắc phục hoàn toàn lỗi Modal Cài Đặt AI bị khuất/bị cắt đỉnh trên màn hình dọc hoặc thu hẹp (thêm scroll mượt mà chuẩn xác).
 * - Cải tiến nghệ thuật vẽ bản đồ (Next-Gen Map Renderer): Thay thế đồ thị hộp sơ sài bằng bộ tạo thẻ Đồ Họa Cao Cấp SVG Data-URI (Thẻ Glassmorphism 3D phát sáng, hiển thị icon, badge trạng thái, thanh thông tin lực lượng rõ nét).
 * - Tích hợp Nút chuyển đổi giao diện [✨ Thẻ Đồ Họa 3D / Đồ Thị Gọn] ngay trên Header Toolbar.
 * - Đa Thể Loại Bối Cảnh (Universal): Tự tương ứng 100% mọi thể loại truyện/game (Học đường, Sci-Fi, Tu Tiên, Horror...).
 * - Bố cục siêu mượt trên màn hình dọc (<= 880px): Tỷ lệ chuẩn 54/46 không đè lấp Inspector, thanh tìm kiếm tràn viền.
 * - Phiên bản: v1.3.0.1
 */

(function () {
    'use strict';

    console.log('[Lore World Map] Đang khởi tạo module Bản Đồ Thế Giới v6.0 Next-Gen (v1.3.0.1)...');

    const MODULE_ID = 'lore_world_map_graph';
    const MODULE_TITLE = 'Bản Đồ Thế Giới (Graph AI)';
    const STORAGE_PREFIX = 'kaiz_lore_graph_map_';
    const AI_CONFIG_KEY = 'kaiz_lore_graph_ai_config';

    // ============ CẤU HÌNH AI & FETCH MODEL ============
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

    // ============ THEME PHỔ QUÁT ĐA THỂ LOẠI (UNIVERSAL GLASSMORPHISM) ============
    const THEME = {
        bg: 'radial-gradient(circle at 50% 50%, #1e1b4b 0%, #090d16 100%)',
        panelBg: 'rgba(15, 23, 42, 0.94)',
        border: 'rgba(192, 132, 252, 0.35)',
        text: '#f8fafc',
        edgeText: '#e2e8f0',
        edgeLabelBg: 'rgba(15, 23, 42, 0.92)',
        nodeCategories: {
            major_hub: { label: '🏢 Trung tâm / Khu vực lớn', bg: '#4c1d95', border: '#c084fc', highlight: '#7c3aed', icon: '🏢', colorHex: '#a855f7' },
            sub_location: { label: '📍 Phân khu / Phòng / Điểm cụ thể', bg: '#1e3a8a', border: '#60a5fa', highlight: '#2563eb', icon: '📍', colorHex: '#3b82f6' },
            danger_zone: { label: '⚠️ Vùng nguy hiểm / Cấm địa / Tranh chấp', bg: '#881337', border: '#fb7185', highlight: '#e11d48', icon: '⚠️', colorHex: '#f43f5e' },
            nature_or_open: { label: '🌿 Không gian mở / Thiên nhiên / Công cộng', bg: '#14532d', border: '#4ade80', highlight: '#16a34a', icon: '🌿', colorHex: '#10b981' },
            secret_or_special: { label: '🔐 Khu vực bí mật / Đặc biệt / Mật thất', bg: '#78350f', border: '#fbd38d', highlight: '#d97706', icon: '🔐', colorHex: '#f59e0b' },
            other: { label: '🏷️ Khác', bg: '#334155', border: '#94a3b8', highlight: '#475569', icon: '🏷️', colorHex: '#64748b' }
        },
        edgeRelations: {
            physical_path: { label: '🚶 Đường nối liền / Hành lang / Cầu thang', color: '#818cf8', dashes: false, width: 2.5 },
            transit_fast: { label: '⚡ Di chuyển nhanh / Thang máy / Phương tiện', color: '#c084fc', dashes: [8, 6], width: 3.0 },
            restricted: { label: '🔒 Khóa / Cần thẻ hoặc điều kiện / Hạn chế', color: '#f43f5e', dashes: [4, 4], width: 2.8 },
            connection: { label: '🔗 Liên kết chung / Kế bên', color: '#34d399', dashes: false, width: 2.3 }
        }
    };

    let activeChatId = 'default_global_chat';
    let mapData = { nodes: [], edges: [] };
    let networkInstance = null;
    let selectedNodeId = null;
    let renderMode = 'premium_svg'; // 'premium_svg' | 'compact_glow'

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

    // ============ BỘ TẠO THẺ ĐỒ HỌA CAO CẤP (PREMIUM SVG NODE CARD GENERATOR) ============
    function generateNodeSvgUrl(node, isSelected = false) {
        const cat = THEME.nodeCategories[node.category] || THEME.nodeCategories.other;
        const isDanger = node.danger_level && (
            node.danger_level.toLowerCase().includes('nguy') ||
            node.danger_level.toLowerCase().includes('cấm') ||
            node.danger_level.toLowerCase().includes('tử') ||
            node.danger_level.toLowerCase().includes('hỗn loạn') ||
            node.danger_level.toLowerCase().includes('bạo động')
        );

        const borderColor = isSelected ? '#38bdf8' : (isDanger ? '#ef4444' : cat.colorHex);
        const borderWidth = isSelected ? 3.5 : (isDanger ? 2.5 : 1.8);
        const bgOpacity0 = isSelected ? '0.98' : '0.92';
        const titleColor = isSelected ? '#38bdf8' : '#f8fafc';
        
        let badgeBg = isDanger ? '#7f1d1d' : '#1e293b';
        let badgeColor = isDanger ? '#fca5a5' : '#93c5fd';
        let badgeText = node.danger_level ? (node.danger_level.length > 15 ? node.danger_level.substring(0, 14) + '…' : node.danger_level) : 'An toàn';

        const safeTitle = (node.label || 'Địa điểm').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeControlled = (node.controlled_by || 'Chung').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeType = (node.context_type || 'Khu vực').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Sắp xếp tự động ngắt dòng cho tiêu đề trong SVG (tối đa 2 dòng)
        let titleLine1 = safeTitle;
        let titleLine2 = '';
        if (safeTitle.length > 20) {
            const idx = safeTitle.lastIndexOf(' ', 20);
            if (idx !== -1) {
                titleLine1 = safeTitle.substring(0, idx);
                titleLine2 = safeTitle.substring(idx + 1);
                if (titleLine2.length > 22) titleLine2 = titleLine2.substring(0, 20) + '…';
            } else {
                titleLine1 = safeTitle.substring(0, 20);
                titleLine2 = safeTitle.substring(20, 40) + (safeTitle.length > 40 ? '…' : '');
            }
        }

        const cardHeight = titleLine2 ? 116 : 98;
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="${cardHeight}" viewBox="0 0 280 ${cardHeight}">
            <defs>
                <linearGradient id="grad_${node.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#0f172a" stop-opacity="${bgOpacity0}" />
                    <stop offset="100%" stop-color="#1e1b4b" stop-opacity="${bgOpacity0}" />
                </linearGradient>
                <filter id="shadow_${node.id}" x="-10%" y="-10%" width="125%" height="125%">
                    <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.75" />
                </filter>
            </defs>
            <rect x="3" y="3" width="274" height="${cardHeight - 6}" rx="16" fill="url(#grad_${node.id})" stroke="${borderColor}" stroke-width="${borderWidth}" filter="url(#shadow_${node.id})" />
            
            <!-- Biểu tượng phân loại dạng Avatar tròn -->
            <circle cx="34" cy="36" r="18" fill="${cat.colorHex}" fill-opacity="0.25" stroke="${cat.colorHex}" stroke-width="1.5" />
            <text x="34" y="42" font-size="18" text-anchor="middle" font-family="-apple-system, Inter, sans-serif">${cat.icon}</text>

            <!-- Tiêu đề địa điểm -->
            <text x="62" y="${titleLine2 ? '30' : '36'}" font-size="15" font-weight="bold" fill="${titleColor}" font-family="-apple-system, Inter, sans-serif">${titleLine1}</text>
            ${titleLine2 ? `<text x="62" y="48" font-size="14" font-weight="bold" fill="${titleColor}" font-family="-apple-system, Inter, sans-serif">${titleLine2}</text>` : ''}

            <!-- Huy hiệu Trạng Thái / Mức An Toàn -->
            <rect x="62" y="${titleLine2 ? '58' : '48'}" width="120" height="20" rx="6" fill="${badgeBg}" stroke="${badgeColor}" stroke-width="0.8" />
            <text x="122" y="${titleLine2 ? '72' : '62'}" font-size="11" font-weight="800" fill="${badgeColor}" text-anchor="middle" font-family="-apple-system, Inter, sans-serif">${badgeText}</text>

            <!-- Đường kẻ ngang phân cách info -->
            <line x1="16" y1="${cardHeight - 28}" x2="264" y2="${cardHeight - 28}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />

            <!-- Thông tin Lực lượng kiểm soát & Loại bối cảnh phía đáy -->
            <text x="16" y="${cardHeight - 10}" font-size="11" fill="#94a3b8" font-family="-apple-system, Inter, sans-serif">🛡️ ${safeControlled.length > 15 ? safeControlled.substring(0, 14) + '…' : safeControlled} | 🏷️ ${safeType.length > 14 ? safeType.substring(0, 13) + '…' : safeType}</text>
        </svg>`;

        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
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
                        label: 'Khu Vực Khởi Đầu',
                        category: 'major_hub',
                        context_type: 'Khu vực chính',
                        danger_level: 'An toàn bình thường',
                        controlled_by: 'Chung / Không rõ',
                        features: 'Nơi câu chuyện và các nhân vật bắt đầu hội thoại.',
                        status: 'Hoạt động bình thường',
                        description: 'Địa điểm khởi điểm của cuộc trò chuyện trong phòng chat này.'
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
        if (doc.getElementById('lore-world-map-styles-v6')) return;
        const style = doc.createElement('style');
        style.id = 'lore-world-map-styles-v6';
        style.innerHTML = `
            #lore_graph_modal_overlay {
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
            #lore_graph_modal_content {
                width: 100%;
                max-width: 1440px;
                height: 94vh;
                border-radius: 20px;
                box-shadow: 0 25px 65px rgba(0,0,0,0.85);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                position: relative;
                background: ${THEME.bg};
                border: 1px solid ${THEME.border};
                color: ${THEME.text};
            }
            
            /* ============ HEADER TOOLBAR RESPONSIVE ============ */
            #lore_graph_header {
                min-height: 60px;
                border-bottom: 1px solid rgba(255,255,255,0.15);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 16px;
                flex-shrink: 0;
                background: rgba(0,0,0,0.65);
                gap: 12px;
                z-index: 10;
            }
            .lore-header-left {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .lore-header-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .lore-search-box {
                display: flex;
                align-items: center;
                background: rgba(0,0,0,0.45);
                border: 1px solid rgba(255,255,255,0.22);
                border-radius: 10px;
                padding: 4px 10px;
            }
            .lore-search-box input {
                background: transparent;
                border: none;
                color: #fff;
                font-size: 0.88em;
                width: 135px;
                outline: none;
                padding: 2px 0;
            }

            /* ============ MAIN CONTAINER FLEXBOX CHUẨN XÁC ============ */
            #lore_main_container {
                flex: 1 1 0%;
                display: flex;
                flex-direction: row;
                overflow: hidden;
                position: relative;
                width: 100%;
            }
            #lore_graph_viewport {
                flex: 1 1 0%;
                height: 100%;
                position: relative;
                min-width: 0;
                min-height: 0;
            }
            #lore_graph_inspector {
                width: 400px;
                height: 100%;
                background: rgba(15, 23, 42, 0.96);
                border-left: 1px solid rgba(255,255,255,0.15);
                padding: 16px;
                box-sizing: border-box;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 12px;
                flex-shrink: 0;
                z-index: 5;
            }

            /* ============ CSS MEDIA QUERY CHO MÀN HÌNH DỌC / HẸP (< 880px) ============ */
            @media (max-width: 880px) {
                #lore_graph_header {
                    flex-direction: column;
                    align-items: stretch;
                    padding: 10px 12px;
                    gap: 10px;
                    max-height: 38vh;
                    overflow-y: auto;
                }
                .lore-header-left {
                    width: 100%;
                    justify-content: space-between;
                }
                .lore-header-actions {
                    width: 100%;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .lore-search-box {
                    flex: 1 1 100%;
                    width: 100%;
                    box-sizing: border-box;
                }
                .lore-search-box input {
                    width: 100%;
                }
                .lore-header-actions .lore-btn {
                    flex: 1 1 auto;
                    justify-content: center;
                    padding: 7px 10px;
                    font-size: 0.82em;
                }

                #lore_main_container {
                    flex-direction: column !important;
                }
                #lore_graph_viewport {
                    flex: 0 0 54% !important;
                    height: 54% !important;
                    width: 100% !important;
                    border-bottom: 2px solid rgba(56, 189, 248, 0.4);
                }
                #lore_graph_inspector {
                    flex: 1 1 auto !important;
                    height: 46% !important;
                    width: 100% !important;
                    max-height: 46% !important;
                    border-left: none !important;
                    padding: 14px !important;
                }
                .lore-control-dock {
                    bottom: 10px !important;
                    right: 10px !important;
                    transform: scale(0.9);
                    transform-origin: bottom right;
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
            .lore-btn-secondary:hover { background: rgba(255, 255, 255, 0.18); border-color: rgba(255,255,255,0.35); }
            
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
            
            .lore-control-dock {
                position: absolute;
                bottom: 18px;
                right: 18px;
                z-index: 100;
                display: flex;
                gap: 6px;
                background: rgba(15, 23, 42, 0.92);
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
            
            /* ============ MODAL CÀI ĐẶT AI v6.0 (KHẮC PHỤC TRIỆT ĐỂ LỖI KHUẤT ĐỈNH) ============ */
            /* Cho phép cuộn mượt từ đỉnh xuống trên mọi kích thước màn hình web dọc hoặc hẹp */
            #lore_ai_config_modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,0.88);
                backdrop-filter: blur(12px);
                z-index: 1000000000 !important;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 16px;
                box-sizing: border-box;
            }
            #lore_ai_config_box {
                width: 100%;
                max-width: 540px;
                max-height: 88vh;
                background: #0f172a;
                border: 1px solid #38bdf8;
                border-radius: 18px;
                padding: 22px;
                color: #fff;
                box-shadow: 0 25px 60px rgba(0,0,0,0.95);
                display: flex;
                flex-direction: column;
                gap: 14px;
                overflow-y: auto;
                box-sizing: border-box;
                margin: auto;
            }
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
                        <div style="width: 38px; height: 38px; border-radius: 12px; background: linear-gradient(135deg, #38bdf8, #818cf8); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 10px rgba(56,189,248,0.4); flex-shrink: 0;">
                            ${SVG_GLOBE_ICON}
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 1.05em; color: #f8fafc; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                <span>BẢN ĐỒ THẾ GIỚI (v1.3.0.1)</span>
                                <span id="lore_stats_badge" style="background: rgba(56,189,248,0.18); color: #38bdf8; font-size: 0.75em; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.3);">0 địa điểm</span>
                                <span id="lore_ai_badge" style="background: rgba(168,85,247,0.18); color: #c084fc; font-size: 0.75em; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(168,85,247,0.3); cursor: pointer;" title="Nhấp để cấu hình AI">🤖 Nguồn AI</span>
                            </div>
                            <div id="lore_chat_status" style="font-size: 0.78em; color: #94a3b8; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;">Chat ID: <span style="color: #c084fc;">...</span></div>
                        </div>
                    </div>

                    <div class="lore-header-actions">
                        <div class="lore-search-box">
                            <i class="fa-solid fa-magnifying-glass" style="color: #94a3b8; font-size: 0.85em; margin-right: 6px;"></i>
                            <input id="lore_search_input" type="text" placeholder="Tìm địa điểm...">
                        </div>

                        <!-- Nút đổi chế độ đồ họa -->
                        <button id="lore_btn_toggle_view" class="lore-btn lore-btn-secondary" style="border-color: #a855f7; color: #e9d5ff;" title="Chuyển đổi giữa chế độ Thẻ Đồ Họa Cao Cấp (SVG 3D) và Đồ Thị Gọn">
                            <i class="fa-solid fa-layer-group"></i> ✨ Thẻ Đồ Họa 3D
                        </button>

                        <button id="lore_btn_ai_scan" class="lore-btn lore-btn-primary" title="AI quét lịch sử chat để tự động thêm địa điểm & đường đi đúng bối cảnh truyện">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Quét & Xây Map
                        </button>

                        <button id="lore_btn_add_node" class="lore-btn lore-btn-secondary" title="Thêm địa điểm thủ công">
                            <i class="fa-solid fa-location-dot"></i> + Địa Điểm
                        </button>

                        <button id="lore_btn_add_edge" class="lore-btn lore-btn-secondary" title="Nối đường giữa 2 địa điểm">
                            <i class="fa-solid fa-route"></i> + Nối Đường
                        </button>

                        <button id="lore_btn_ai_settings" class="lore-btn lore-btn-secondary" title="Cấu hình AI (SillyTavern hoặc Custom API kèm tải danh sách Model)">
                            <i class="fa-solid fa-gear"></i> Cấu hình AI
                        </button>

                        <button id="lore_btn_close_modal" class="lore-btn" style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #f87171; padding: 8px 12px; font-size: 1.05em;" title="Đóng bản đồ">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Main Container -->
                <div id="lore_main_container">
                    <div id="lore_graph_viewport">
                        <div class="lore-control-dock">
                            <button id="dock_btn_zoomin" class="lore-dock-btn" title="Phóng to">+</button>
                            <button id="dock_btn_zoomout" class="lore-dock-btn" title="Thu nhỏ">-</button>
                            <button id="dock_btn_fit" class="lore-dock-btn" title="Xem toàn cảnh"><i class="fa-solid fa-compress"></i></button>
                            <button id="dock_btn_relayout" class="lore-dock-btn" title="Sắp xếp lại vật lý"><i class="fa-solid fa-rotate-right"></i></button>
                        </div>
                    </div>

                    <div id="lore_graph_inspector">
                        <div style="font-weight: 800; font-size: 0.98em; color: #38bdf8; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
                            <span>🏷️ THÔNG TIN ĐỊA ĐIỂM</span>
                            <span id="inspector_close_btn" style="cursor: pointer; color: #94a3b8; font-size: 1.1em;" title="Bỏ chọn">✕</span>
                        </div>
                        <div id="inspector_content" style="font-size: 0.9em; color: #cbd5e1; line-height: 1.6; display: flex; flex-direction: column; gap: 12px; flex: 1;">
                            <!-- Nội dung nạp tự động -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL CÀI ĐẶT AI v6.0 -->
            <div id="lore_ai_config_modal">
                <div id="lore_ai_config_box">
                    <div style="font-weight: 800; font-size: 1.15em; color: #38bdf8; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 10px; flex-shrink: 0;">
                        <span>🤖 CẤU HÌNH NGUỒN KẾT NỐI AI</span>
                        <span id="ai_cfg_close" style="cursor: pointer; color: #f87171; font-size: 1.1em;">✕</span>
                    </div>

                    <div style="font-size: 0.85em; color: #cbd5e1; line-height: 1.5; background: rgba(56,189,248,0.1); padding: 10px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.25);">
                        ℹ️ <b>Thiết kế Đa Thể Loại (Universal):</b> Bản đồ tự tương ứng 100% mọi bối cảnh truyện (Học đường, Sci-Fi, Tu tiên, Horror...).<br>
                        Mặc định dùng model của SillyTavern. Bạn có thể chuyển sang Custom API và bấm nút tải danh sách Model bên dưới!
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
                            <input id="cfg_key" type="password" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px;" placeholder="sk-....... (Để trống nếu dùng local Ollama/Kobold)">
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

                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; flex-shrink: 0;">
                        <button id="ai_cfg_save" class="lore-btn lore-btn-success" style="padding: 10px 20px;">
                            <i class="fa-solid fa-check"></i> Lưu Cấu Hình AI
                        </button>
                    </div>
                </div>
            </div>
        `;
        doc.body.appendChild(overlay);

        overlay.querySelector('#lore_btn_close_modal').addEventListener('click', () => overlay.style.display = 'none');
        overlay.querySelector('#inspector_close_btn').addEventListener('click', () => {
            selectedNodeId = null;
            renderInspector();
            if (networkInstance && typeof networkInstance.unselectAll === 'function') networkInstance.unselectAll();
        });

        // Chuyển đổi chế độ đồ họa
        const btnToggleView = overlay.querySelector('#lore_btn_toggle_view');
        btnToggleView.addEventListener('click', () => {
            renderMode = renderMode === 'premium_svg' ? 'compact_glow' : 'premium_svg';
            btnToggleView.innerHTML = renderMode === 'premium_svg' ? `<i class="fa-solid fa-layer-group"></i> ✨ Thẻ Đồ Họa 3D` : `<i class="fa-solid fa-circle-dot"></i> 🔮 Đồ Thị Gọn`;
            renderNetwork();
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
            if (!url) {
                alert('Vui lòng nhập API Endpoint URL trước!');
                return;
            }

            btnFetchModels.disabled = true;
            btnFetchModels.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...`;

            try {
                let modelsUrl = url;
                if (modelsUrl.endsWith('/chat/completions')) {
                    modelsUrl = modelsUrl.replace('/chat/completions', '/models');
                } else if (modelsUrl.endsWith('/v1')) {
                    modelsUrl = modelsUrl + '/models';
                } else if (!modelsUrl.endsWith('/models')) {
                    modelsUrl = modelsUrl.replace(/\/+$/, '') + '/models';
                }

                const headers = { 'Content-Type': 'application/json' };
                if (key) headers['Authorization'] = `Bearer ${key}`;

                const res = await fetch(modelsUrl, { method: 'GET', headers });
                if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể kết nối tới ${modelsUrl}`);
                const data = await res.json();

                let list = [];
                if (data && Array.isArray(data.data)) list = data.data.map(m => m.id || m.name).filter(Boolean);
                else if (data && Array.isArray(data.models)) list = data.models.map(m => m.id || m.name || m).filter(Boolean);
                else if (Array.isArray(data)) list = data.map(m => m.id || m.name || String(m)).filter(Boolean);

                if (list.length === 0) {
                    throw new Error('API trả về nhưng không tìm thấy danh sách model hợp lệ!');
                }

                modelSelect.innerHTML = list.map(m => `<option value="${m}" ${m === modelInput.value ? 'selected' : ''}>${m}</option>`).join('');
                modelSelect.style.display = 'block';
                modelInput.style.width = '160px';
                if (list[0] && !modelInput.value) modelInput.value = list[0];

                modelSelect.onchange = () => { modelInput.value = modelSelect.value; };
                alert(`🎉 Đã tải thành công ${list.length} model! Bạn có thể chọn ngay ở danh sách bên cạnh.`);
            } catch (err) {
                alert('⚠️ Lỗi khi tải danh sách Model: ' + err.message + '\nBạn vẫn có thể gõ trực tiếp tên model vào ô.');
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

        overlay.querySelector('#lore_btn_add_node').addEventListener('click', () => {
            const name = prompt('Nhập tên địa điểm mới:', 'Khu Vực / Điểm Mới');
            if (!name || !name.trim()) return;
            const category = prompt('Phân loại (major_hub / sub_location / danger_zone / nature_or_open / secret_or_special):', 'sub_location') || 'sub_location';
            const contextType = prompt('Loại địa điểm theo bối cảnh (VD: Phòng học, Trạm vũ trụ, Quán ăn, Cấm địa...):', 'Khu vực') || 'Khu vực';
            const danger = prompt('Mức độ an toàn / rủi ro tại đây:', 'An toàn bình thường') || 'An toàn bình thường';
            const controlled = prompt('Ai hoặc tổ chức nào kiểm soát nơi này?', 'Chung / Không rõ') || 'Chung';
            const features = prompt('Đặc điểm nổi bật / Tài nguyên / Chức năng tại đây:', 'Không có') || '';
            const desc = prompt('Mô tả chi tiết hoặc sự kiện xảy ra tại địa điểm này:', 'Một địa điểm vừa được ghi nhận.') || '';

            const id = 'node_' + Date.now();
            mapData.nodes.push({
                id,
                label: name.trim(),
                category: category.trim(),
                context_type: contextType.trim(),
                danger_level: danger.trim(),
                controlled_by: controlled.trim(),
                features: features.trim(),
                status: 'Hoạt động bình thường',
                description: desc.trim()
            });
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

            const relType = prompt('Loại liên kết (physical_path: Đường bộ/hành lang / transit_fast: Thang máy/phương tiện / restricted: Cần thẻ/bị khóa / connection: Kế bên):', 'physical_path') || 'physical_path';
            const label = prompt('Mô tả kết nối (VD: Cầu thang bộ, Thang máy số 2, Cánh cửa...):', 'Đường nối');
            const dist = prompt('Khoảng cách hoặc thời gian (VD: 2 phút đi bộ, Kế bên, 10km...):', 'Gần') || '';

            mapData.edges.push({
                from: nFrom.id,
                to: nTo.id,
                label: label || '',
                relation_type: ['physical_path', 'transit_fast', 'restricted', 'connection'].includes(relType) ? relType : 'physical_path',
                distance: dist
            });
            saveMapData();
            renderNetwork();
        });

        overlay.querySelector('#lore_btn_ai_scan').addEventListener('click', async () => {
            await triggerAiWorldScan();
        });

        const searchInput = overlay.querySelector('#lore_search_input');
        function doSearch() {
            const kw = searchInput.value.trim().toLowerCase();
            if (!kw) return;
            const found = mapData.nodes.find(n => n.label.toLowerCase().includes(kw) || (n.description && n.description.toLowerCase().includes(kw)) || (n.features && n.features.toLowerCase().includes(kw)));
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
            const isDanger = n.danger_level && (
                n.danger_level.toLowerCase().includes('nguy') ||
                n.danger_level.toLowerCase().includes('cấm') ||
                n.danger_level.toLowerCase().includes('tử') ||
                n.danger_level.toLowerCase().includes('hỗn loạn') ||
                n.danger_level.toLowerCase().includes('bạo động')
            );

            if (renderMode === 'premium_svg') {
                const unselectedImg = generateNodeSvgUrl(n, false);
                const selectedImg = generateNodeSvgUrl(n, true);

                return {
                    id: n.id,
                    shape: 'image',
                    image: {
                        unselected: unselectedImg,
                        selected: selectedImg
                    },
                    size: 40,
                    title: `${n.label}\n• Phân loại: ${cat.label}\n• Kiểu địa điểm: ${n.context_type || 'Chung'}\n• Kiểm soát bởi: ${n.controlled_by || 'Chung'}\n• Đặc điểm/Chức năng: ${n.features || 'Không có'}\n• Trạng thái: ${n.status || 'Bình thường'}`,
                    font: { color: 'transparent', size: 1 }, // Ẩn nhãn text mặc định vì SVG đã hiển thị siêu nét
                    margin: 0
                };
            } else {
                // Chế độ Đồ Thị Gọn (Compact Glow Nodes)
                return {
                    id: n.id,
                    label: `${cat.icon} ${n.label}\n[${n.danger_level || 'An toàn'}]`,
                    title: `${n.label}\n• Phân loại: ${cat.label}\n• Kiểu địa điểm: ${n.context_type || 'Chung'}\n• Kiểm soát bởi: ${n.controlled_by || 'Chung'}`,
                    color: {
                        background: cat.bg,
                        border: isDanger ? '#ef4444' : cat.border,
                        highlight: { background: cat.highlight, border: '#ffffff' }
                    },
                    font: { color: THEME.text, size: 14, face: '-apple-system, Inter, sans-serif', bold: true },
                    borderWidth: isDanger ? 3 : 2,
                    shadow: { enabled: true, color: 'rgba(0,0,0,0.7)', size: 14, x: 0, y: 6 },
                    shape: 'box',
                    margin: 12
                };
            }
        });

        const edgesArray = mapData.edges.map(e => {
            const relStyle = THEME.edgeRelations[e.relation_type] || THEME.edgeRelations.physical_path;
            const labelText = e.distance ? `${e.label || 'Kết nối'} (${e.distance})` : (e.label || 'Kết nối');
            const wrappedLabel = wrapText(labelText, 24);

            return {
                from: e.from,
                to: e.to,
                label: wrappedLabel,
                title: `${relStyle.label}\n• Chi tiết: ${e.label || 'Không có'}\n• Khoảng cách/Thời gian: ${e.distance || 'Kế bên'}`,
                color: { color: relStyle.color, highlight: '#38bdf8' },
                dashes: relStyle.dashes || false,
                font: {
                    color: THEME.edgeText,
                    size: 11.5,
                    face: '-apple-system, Inter, sans-serif',
                    background: THEME.edgeLabelBg,
                    strokeWidth: 0,
                    align: 'horizontal'
                },
                arrows: { to: { enabled: true, scaleFactor: 0.85 } },
                smooth: { type: 'continuous', roundness: 0.22 },
                width: relStyle.width || 2.5
            };
        });

        const data = {
            nodes: new window.vis.DataSet(nodesArray),
            edges: new window.vis.DataSet(edgesArray)
        };

        const options = {
            physics: {
                forceAtlas2Based: {
                    gravitationalConstant: -100,
                    centralGravity: 0.012,
                    springLength: renderMode === 'premium_svg' ? 260 : 220,
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

    function renderInspector() {
        const contentDiv = doc.getElementById('inspector_content');
        if (!contentDiv) return;

        if (!selectedNodeId) {
            const listNodesHTML = mapData.nodes.map(n => {
                let badgeClass = 'badge-safe';
                if (n.danger_level && (n.danger_level.toLowerCase().includes('nguy') || n.danger_level.toLowerCase().includes('cấm') || n.danger_level.toLowerCase().includes('tử') || n.danger_level.toLowerCase().includes('hỗn loạn'))) badgeClass = 'badge-danger';
                else if (n.danger_level && n.danger_level.toLowerCase().includes('thận')) badgeClass = 'badge-warn';

                return `
                    <div onclick="window._loreJumpToNode('${n.id}')" style="padding: 10px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; cursor: pointer; transition: all 0.15s; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-weight: 700; color: #38bdf8; font-size: 0.96em;">📍 ${n.label}</span>
                            <span class="lore-badge ${badgeClass}">${n.danger_level || 'An toàn'}</span>
                        </div>
                        <div style="font-size: 0.82em; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            🏷️ ${n.context_type || 'Khu vực'} | 🛡️ Kiểm soát: ${n.controlled_by || 'Chung'}
                        </div>
                    </div>
                `;
            }).join('') || '<div style="color: #64748b; text-align: center;">Bản đồ chưa có địa điểm nào.</div>';

            contentDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 12px; flex: 1; min-height: 0;">
                    <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 12px; padding: 10px; font-size: 0.84em; color: #e0f2fe; flex-shrink: 0;">
                        💡 <b>Mẹo:</b> Kéo chuột để di chuyển địa điểm. Cuộn chuột zoom. Nhấp vào nút [✨ Thẻ Đồ Họa 3D] trên thanh công cụ để trải nghiệm đồ họa thẻ SVG siêu đẹp!
                    </div>

                    <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
                        <div style="font-size: 0.78em; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; flex-shrink: 0;">
                            📋 TẤT CẢ ĐỊA ĐIỂM (${mapData.nodes.length})
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1; padding-right: 4px;">
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
            const relInfo = THEME.edgeRelations[e.relation_type] || THEME.edgeRelations.physical_path;

            return `
                <div style="padding: 8px 10px; background: rgba(255,255,255,0.05); border-radius: 10px; font-size: 0.86em; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;">
                    <div style="overflow: hidden; max-width: 200px;">
                        <div style="font-weight: 700; color: #38bdf8;">${arrow}: ${targetName}</div>
                        <div style="font-size: 0.8em; color: ${relInfo.color}; font-weight: bold; margin-top: 2px;">${relInfo.label}</div>
                        <div style="font-size: 0.82em; color: #94a3b8; margin-top: 1px;">${e.label || 'Kết nối'} ${e.distance ? `(${e.distance})` : ''}</div>
                    </div>
                    <button onclick="window._loreJumpToNode('${targetId}')" class="lore-btn" style="background: rgba(168,85,247,0.2); border: 1px solid rgba(168,85,247,0.4); color: #c084fc; padding: 6px 10px; font-size: 0.85em;" title="Chuyển sang địa điểm này">🎯</button>
                </div>
            `;
        }).join('') || '<div style="color:#64748b; font-size: 0.85em;">Chưa có kết nối nào tới địa điểm này.</div>';

        contentDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div>
                    <label style="font-size: 0.76em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Tên Địa Điểm</label>
                    <input id="insp_label" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px; font-weight: bold; font-size: 1.02em;" value="${node.label}">
                </div>

                <div style="display: flex; gap: 8px;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.76em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Phân loại</label>
                        <select id="insp_category" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px;">
                            <option value="major_hub" ${node.category === 'major_hub' ? 'selected' : ''}>🏢 Trung tâm / Khu vực lớn</option>
                            <option value="sub_location" ${node.category === 'sub_location' ? 'selected' : ''}>📍 Phân khu / Phòng / Điểm cụ thể</option>
                            <option value="danger_zone" ${node.category === 'danger_zone' ? 'selected' : ''}>⚠️ Vùng nguy hiểm / Cấm địa</option>
                            <option value="nature_or_open" ${node.category === 'nature_or_open' ? 'selected' : ''}>🌿 Không gian mở / Công cộng</option>
                            <option value="secret_or_special" ${node.category === 'secret_or_special' ? 'selected' : ''}>🔐 Khu vực bí mật / Mật thất</option>
                            <option value="other" ${node.category === 'other' ? 'selected' : ''}>🏷️ Khác</option>
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.76em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Kiểu địa điểm</label>
                        <input id="insp_context_type" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px;" value="${node.context_type || 'Khu vực'}" placeholder="Phòng học, Trạm vũ trụ...">
                    </div>
                </div>

                <div style="display: flex; gap: 8px;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.76em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Kiểm soát bởi</label>
                        <input id="insp_controlled" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px;" value="${node.controlled_by || 'Chung'}" placeholder="Ai sở hữu?">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.76em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Mức an toàn / rủi ro</label>
                        <input id="insp_danger" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px;" value="${node.danger_level || 'An toàn'}" placeholder="An toàn / Nguy hiểm...">
                    </div>
                </div>

                <div style="display: flex; gap: 8px;">
                    <div style="flex: 1;">
                        <label style="font-size: 0.76em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Đặc điểm / Chức năng</label>
                        <input id="insp_features" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px;" value="${node.features || ''}" placeholder="Tài nguyên, chức năng...">
                    </div>
                    <div style="flex: 1;">
                        <label style="font-size: 0.76em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Trạng thái</label>
                        <input id="insp_status" type="text" class="lore-input" style="width: 100%; box-sizing: border-box; margin-top: 2px;" value="${node.status || 'Bình thường'}" placeholder="Bình thường / Phong tỏa...">
                    </div>
                </div>

                <div>
                    <label style="font-size: 0.76em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Mô tả chi tiết & Sự Kiện</label>
                    <textarea id="insp_desc" class="lore-input" style="width: 100%; height: 75px; box-sizing: border-box; margin-top: 2px; resize: vertical; line-height: 1.5;">${node.description || ''}</textarea>
                </div>

                <div style="display: flex; gap: 8px; margin-top: 2px;">
                    <button id="insp_btn_save" class="lore-btn lore-btn-success" style="flex: 2; justify-content: center;">
                        <i class="fa-solid fa-floppy-disk"></i> Lưu Thay Đổi
                    </button>
                    <button id="insp_btn_delete" class="lore-btn lore-btn-danger" style="flex: 1; justify-content: center;">
                        <i class="fa-solid fa-trash"></i> Xóa
                    </button>
                </div>

                <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 10px;">
                    <label style="font-size: 0.76em; color: #38bdf8; font-weight: 800; text-transform: uppercase; display: block; margin-bottom: 6px;">🔗 Các Địa Điểm Kết Nối (${connectedEdges.length})</label>
                    <div style="display: flex; flex-direction: column; gap: 8px; max-height: 160px; overflow-y: auto;">
                        ${linksHTML}
                    </div>
                </div>
            </div>
        `;

        contentDiv.querySelector('#insp_btn_save').addEventListener('click', () => {
            node.label = contentDiv.querySelector('#insp_label').value.trim() || node.label;
            node.category = contentDiv.querySelector('#insp_category').value;
            node.context_type = contentDiv.querySelector('#insp_context_type').value.trim() || 'Khu vực';
            node.controlled_by = contentDiv.querySelector('#insp_controlled').value.trim() || 'Chung';
            node.danger_level = contentDiv.querySelector('#insp_danger').value.trim() || 'An toàn';
            node.features = contentDiv.querySelector('#insp_features').value.trim();
            node.status = contentDiv.querySelector('#insp_status').value.trim() || 'Bình thường';
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

            const existingNodesStr = mapData.nodes.map(n => `- ${n.label} (${n.context_type}, Kiểm soát: ${n.controlled_by})`).join('\n');
            const prompt = `Bạn là Bậc Thầy Kiến Trúc Sư Địa Lý Đa Thể Loại (Universal World Lore Architect).
Dưới đây là Lịch sử trò chơi gần đây (${historyLimit} tin nhắn):
=== LỊCH SỬ CHAT ===
${historyText.slice(0, 8800)}
====================

Các địa điểm đã có trên bản đồ:
${existingNodesStr || '(Chưa có)'}

NGUYÊN TẮC VÀ NHIỆM VỤ QUAN TRỌNG:
1. KHÔNG áp đặt định kiến Fantasy/chơi game. Hãy phân tích đúng theo THỂ LOẠI THỰC TẾ của câu chuyện (Ví dụ nếu bối cảnh là Hiện đại học đường thì địa điểm là Lớp học, Sân thượng, Hành lang; nếu Sci-Fi thì là Trạm vũ trụ, Phòng thí nghiệm; nếu Tu Tiên thì là Tông môn, Động phủ; nếu Horror thì là Căn nhà ma, Bệnh viện hoang...).
2. Trích xuất tất cả Địa Điểm, Khu vực lớn hoặc Phòng/Phân khu cụ thể xuất hiện/được nhắc đến.
3. Với mỗi địa điểm, xác định category phổ quát:
   - "major_hub": Trung tâm / Khu vực lớn / Tổ chức chính
   - "sub_location": Phân khu / Phòng / Điểm cụ thể
   - "danger_zone": Vùng nguy hiểm / Cấm địa / Khu tranh chấp
   - "nature_or_open": Không gian mở / Thiên nhiên / Khu công cộng
   - "secret_or_special": Khu vực bí mật / Đặc biệt / Mật thất
   - "other": Khác
4. Với các liên kết, phân loại relation_type phổ quát:
   - "physical_path": Đường bộ / Hành lang / Cầu thang / Đường nối liền
   - "transit_fast": Phương tiện nhanh / Thang máy / Dịch chuyển
   - "restricted": Bị hạn chế / Khóa / Cần thẻ hay điều kiện
   - "connection": Liên kết chung / Kế bên
5. TRẢ VỀ DUY NHẤT 1 JSON HỢP LỆ (không kèm lời dẫn):
{
  "nodes": [
    {
      "label": "Tên địa điểm chính xác theo bối cảnh truyện",
      "category": "major_hub | sub_location | danger_zone | nature_or_open | secret_or_special | other",
      "context_type": "Loại địa điểm thực tế (VD: Phòng học, Trạm vũ trụ, Quán ăn, Động phủ...)",
      "danger_level": "VD: An toàn bình thường / Cực kỳ nguy hiểm / Khu vực giám sát...",
      "controlled_by": "Ai hoặc thế lực/nhân vật nào quản lý/sở hữu?",
      "features": "Đặc điểm, tài nguyên, chức năng nổi bật tại đây",
      "status": "VD: Đang hoạt động / Bị phong tỏa / Đã bỏ hoang...",
      "description": "Mô tả vai trò và sự kiện diễn ra tại địa điểm này"
    }
  ],
  "edges": [
    {
      "from_label": "Tên địa điểm xuất phát",
      "to_label": "Tên địa điểm đích đến",
      "label": "Mô tả kết nối ngắn gọn dưới 20 ký tự (VD: Cầu thang bộ, Hành lang nối...)",
      "relation_type": "physical_path | transit_fast | restricted | connection",
      "distance": "VD: 2 phút đi bộ / Kế bên / 50km / Qua 1 cánh cửa"
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
                                { role: 'system', content: 'Bạn là chuyên gia xuất JSON bản đồ truyện/game hợp lệ 100%.' },
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
                        { role: 'system', content: 'Bạn là chuyên gia xuất JSON bản đồ truyện/game hợp lệ 100%.' },
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
                    if (item.danger_level) existing.danger_level = item.danger_level;
                    if (item.context_type) existing.context_type = item.context_type;
                    if (item.controlled_by && existing.controlled_by === 'Chung') existing.controlled_by = item.controlled_by;
                    if (item.features && !existing.features) existing.features = item.features;
                    if (item.status) existing.status = item.status;
                } else {
                    const newId = 'node_' + Math.random().toString(36).substr(2, 8);
                    mapData.nodes.push({
                        id: newId,
                        label: cleanLabel,
                        category: ['major_hub', 'sub_location', 'danger_zone', 'nature_or_open', 'secret_or_special'].includes(item.category) ? item.category : 'other',
                        context_type: item.context_type || 'Khu vực',
                        danger_level: item.danger_level || 'An toàn',
                        controlled_by: item.controlled_by || 'Chung',
                        features: item.features || '',
                        status: item.status || 'Hoạt động bình thường',
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
                                relation_type: ['physical_path', 'transit_fast', 'restricted', 'connection'].includes(link.relation_type) ? link.relation_type : 'physical_path',
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
