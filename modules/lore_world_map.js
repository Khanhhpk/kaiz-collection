/**
 * KAIZ Collection - Bản Đồ Thế Giới AI (Universal World Map) - v8.3 Deep Prompt, Custom Editor & Request Debugger (v1.3.0.8)
 * - [🔥 Prompt AI Chi Tiết & Phân Tích Sâu (`Super Detailed & Analytical Prompts`)]:
 *   - Loại bỏ hoàn toàn việc cắt lẹm lịch sử chat (`slice 8,800 chars` cũ -> Mở rộng lên tới `65,000+ chars` hoặc không giới hạn).
 *   - Lệnh AI phân tích cực kỳ kỹ lưỡng: bối cảnh, kiến trúc, không gian cảm quan, bí mật/vật phẩm, sự kiện lịch sử, và **Lối đi kết nối liên khu vực (`connections`)**.
 * - [📝 Khung Chỉnh Sửa Prompt AI (`Custom Prompt Templates Editor UI`)]:
 *   - Ngay trong Cấu hình AI, bạn có thể xem và chỉnh sửa trực tiếp Prompt Quét Bản Đồ và Prompt Khám Phá Sâu Phân Khu theo ý muốn!
 *   - Hỗ trợ biến động `{{history}}`, `{{existing_map}}`, `{{target_name}}`, `{{target_desc}}`... kèm nút **[ 🔄 Khôi Phục Mặc Định ]**.
 * - [🔗 Cải Thiện Mạnh Liên Kết Qua Lại (`Inter-Location Connections & Transit`)]:
 *   - Bổ sung trường dữ liệu Lối đi / Cổng kết nối (`connections`) cho từng địa điểm.
 *   - Hộp thoại chi tiết hiển thị rõ ràng: các lối đi ngầm, thang máy, hành lang, hay cổng thông ra khu vực nào khác.
 * - [🐞 Trình Kiểm Tra & Debug AI Request (`AI Request Inspector Modal`)]:
 *   - Thêm nút **[ 🐞 Debug AI Request ]** để kiểm tra chính xác 100% những gì sẽ được gửi cho AI: Số lượng tin nhắn, Tổng ký tự ~ Tokens ước tính, và Toàn bộ Raw Text trước khi bấm Quét!
 * - Phiên bản: v1.3.0.8
 */

(function () {
    'use strict';

    console.log('[Lore World Map] Đang khởi tạo Bản Đồ Thế Giới v8.3 Deep Prompt, Editor & Request Debugger (v1.3.0.8)...');

    const MODULE_ID = 'lore_world_map_app';
    const MODULE_TITLE = 'Bản Đồ Thế Giới (App Lưới)';
    const STORAGE_PREFIX = 'kaiz_lore_app_map_';
    const AI_CONFIG_KEY = 'kaiz_lore_graph_ai_config';

    // ============ DEFAULT SUPER ANALYTICAL PROMPTS ============
    const DEFAULT_WORLD_SCAN_PROMPT = `Bạn là Kiến Trúc Sư Địa Lý & Tác Giả Thiết Kế Thế Giới Chuyên Sâu (Universal Deep Lore & World Map Architect).
Nhiệm vụ của bạn là đọc kỹ Lịch Sử Trò Chuyện dưới đây, phân tích toàn diện bối cảnh câu chuyện và dựng lên bản đồ các Khu Vực Lớn cùng Phân Khu Tầng Sâu bên trong một cách sống động, chuẩn xác và phong phú nhất.

=== LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY ===
{{history}}
==================================

Cấu trúc bản đồ hiện có trong hệ thống:
{{existing_map}}

CÁC YÊU CẦU PHÂN TÍCH CHUYÊN SÂU:
1. HIỂU ĐÚNG THỂ LOẠI & BỐI CẢNH: KHÔNG áp đặt định kiến Fantasy nếu truyện là Học đường hiện đại, Sci-Fi vũ trụ, Horror tâm linh, hay Slice of Life gia đình. Hãy dùng từ ngữ địa lý chuẩn xác với bối cảnh truyện (VD: Trường học thì có Sân thượng, Phòng y tế, Ký túc xá; Vũ trụ thì có Trạm chỉ huy, Phòng phản ứng core...).
2. THÔNG TIN ĐA CHIỀU (DEEP LORE INFO): Với mỗi khu vực và phòng ban, buộc phải tổng hợp chi tiết:
   - "atmosphere": Không gian cảm quan (thời tiết, ánh sáng, mùi hương, tiếng động, nhịp sống tại nơi đó).
   - "secrets": Bí mật, hòm giấu đồ, vật phẩm quan trọng (Loot/Key items), hoặc ghi chép ẩn giấu tại nơi này.
   - "events": Sự kiện lịch sử, xung đột hay biến cố đang diễn ra ngay lúc này tại địa điểm.
   - "connections": LỐI ĐI & LIÊN KẾT GIAO THÔNG (Mô tả rõ địa điểm này có cổng, thang máy, hành lang, hay đường hầm thông thẳng tới những địa điểm nào khác trong truyện).
   - "status": Trạng thái truy cập ("Tự do ra vào", "Khóa mật mã / Cửa khóa", "Cấm địa / Tuyệt mật", "Hạn chế").
3. KHÔNG TẠO TRÙNG LẶP: Nếu địa điểm đã có trong danh sách hiện có, hãy bổ sung thông tin cho phong phú hơn hoặc thêm các phân khu con (subLocations) bên trong nó.

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ (Không kèm lời dẫn, không markdown ngoài JSON block) theo đúng định dạng sau:
{
  "locations": [
    {
      "name": "Tên Khu Vực Lớn / Trung Tâm (VD: Trường Trung Học Sakura / Trạm Vũ Trụ Alpha)",
      "category": "major_hub",
      "context_type": "Khu trung tâm / Tòa nhà chính / Đảo lớn / Tông môn...",
      "danger_level": "An toàn tuyệt đối / An toàn bình thường / Nguy hiểm tiềm ẩn / Cực kỳ rủi ro...",
      "controlled_by": "Tên nhân vật hoặc thế lực quản lý/kiểm soát nơi này",
      "status": "Tự do ra vào / Khóa về đêm / Tuyệt mật...",
      "description": "Mô tả tổng quan kiến trúc, vai trò lịch sử và vị trí địa lý của khu vực",
      "characters": ["Tên nhân vật A đang ở đây", "Tên nhân vật B"],
      "atmosphere": "Môi trường, thời tiết, âm thanh, ánh sáng và cảm giác tại khu vực",
      "secrets": "Vật phẩm đặc biệt, bảo vật hoặc bí mật giấu kín tại đây",
      "events": "Sự kiện hoặc biến cố đang diễn ra",
      "connections": "Cổng Bắc nối ra Phố Chợ, Hành lang Tây nối tới Khu Nghiên Cứu...",
      "subLocations": [
        {
          "name": "Tên Căn Phòng / Phân Khu Nhỏ bên trong (VD: Phòng Ngủ / Thư Viện Tầng 3 / Hầm Ngầm)",
          "category": "sub_location",
          "context_type": "Phòng cá nhân / Phòng thí nghiệm / Sân thượng / Động phủ...",
          "danger_level": "An toàn / Nguy hiểm...",
          "controlled_by": "Tên nhân vật chủ phòng",
          "status": "Khóa riêng tư / Tự do...",
          "description": "Mô tả chi tiết bố trí nội thất và công dụng của phòng/phân khu này",
          "characters": ["Tên nhân vật đang có mặt trong phòng"],
          "atmosphere": "Môi trường, ánh sáng dịu nhẹ, mùi hương trong phòng...",
          "secrets": "Cuốn nhật ký dưới gối, chìa khóa két sắt giấu sau bức tranh...",
          "events": "Nhân vật đang làm gì hoặc chuyện gì vừa xảy ra trong phòng",
          "connections": "Cửa chính thông ra Hành Lang Tầng 2, cửa sổ nhìn ra Sân Sau..."
        }
      ]
    }
  ]
}`;

    const DEFAULT_DEEP_DRILL_PROMPT = `Bạn là Kiến Trúc Sư Khám Phá Địa Lý Sâu Đa Tầng (Deep Lore N-Layer Drill-Down Architect).
Chúng ta đang muốn KHÁM PHÁ SÂU VÀ DỰNG THÊM CÁC PHÂN KHU CON / CĂN PHÒNG / HẦM NGẦM NẰM BÊN TRONG địa điểm sau:
- Tên địa điểm cha: "{{target_name}}"
- Loại / Bối cảnh: "{{target_type}}"
- Mô tả hiện tại: "{{target_desc}}"
- Bầu không khí (Atmosphere): "{{target_atmo}}"
- Bí mật ẩn (Secrets): "{{target_secrets}}"

=== LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY ===
{{history}}
==================================

NHIỆM VỤ CỦA BẠN:
Hãy sáng tạo và xây dựng 2 đến 4 Phân Khu Con / Căn Phòng / Góc Bí Mật / Hầm Ngầm NẰM BÊN TRONG "{{target_name}}" sao cho hợp logic với cốt truyện và làm sâu sắc thêm trải nghiệm khám phá.
Mỗi phân khu con phải có đủ cảm quan Atmosphere, Vật phẩm bí mật Secrets, Sự kiện Events và Lối đi liên kết Connections.

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ theo định dạng:
{
  "subLocations": [
    {
      "name": "Tên Căn Phòng / Hầm bí mật / Phân khu bên trong",
      "category": "sub_location",
      "context_type": "Phòng riêng / Hầm ngầm / Gác mái / Két sắt ngầm...",
      "danger_level": "An toàn / Nguy hiểm...",
      "controlled_by": "Tên nhân vật quản lý phòng",
      "status": "Khóa riêng tư / Tự do / Tuyệt mật...",
      "description": "Mô tả công năng, kiến trúc và bố trí trong căn phòng/phân khu này",
      "characters": ["Tên nhân vật đang ở đây"],
      "atmosphere": "Môi trường, ánh sáng, mùi hương, tiếng động tại đây",
      "secrets": "Bí mật, mật thư hoặc vật phẩm quý giá giấu tại đây",
      "events": "Sự kiện hoặc biến cố đang diễn ra trong phòng",
      "connections": "Cửa nối ra phòng chính, lối đi thông gió dẫn ra hiên sau..."
    }
  ]
}`;

    // ============ CẤU HÌNH AI & PROMPT ============
    let aiConfig = {
        source: 'sillytavern', // 'sillytavern' | 'custom'
        customUrl: 'https://api.openai.com/v1/chat/completions',
        customKey: '',
        customModel: 'gpt-4o-mini',
        historyCount: 30,
        historyMaxChars: 0, // 0 = Không giới hạn theo token/ký tự, chỉ giới hạn theo số tin nhắn (mặc định 30)
        customPromptWorldScan: DEFAULT_WORLD_SCAN_PROMPT,
        customPromptDeepDrill: DEFAULT_DEEP_DRILL_PROMPT
    };

    function loadAiConfig() {
        const raw = localStorage.getItem(AI_CONFIG_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                Object.assign(aiConfig, parsed);
                if (!aiConfig.customPromptWorldScan || !aiConfig.customPromptWorldScan.trim()) aiConfig.customPromptWorldScan = DEFAULT_WORLD_SCAN_PROMPT;
                if (!aiConfig.customPromptDeepDrill || !aiConfig.customPromptDeepDrill.trim()) aiConfig.customPromptDeepDrill = DEFAULT_DEEP_DRILL_PROMPT;
                if (aiConfig.historyMaxChars === undefined) aiConfig.historyMaxChars = 0;
            } catch (e) {}
        }
    }

    function saveAiConfig() {
        try { localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig)); } catch (e) {}
    }

    // ============ DỮ LIỆU BẢN ĐỒ & INFINITE NAVIGATION STACK ============
    let activeChatId = 'default_global_chat';
    let mapData = { locations: [] };
    let navStack = [];
    let selectedDetailLocation = null;

    const SVG_GLOBE_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`;

    // ============ NHẬN DIỆN CHAT ID SIÊU CHÍNH XÁC ============
    function getActiveChatId() {
        try {
            const win = window.parent || window;
            if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
                const ctx = win.SillyTavern.getContext();
                if (ctx) {
                    if (ctx.chatId !== undefined && ctx.chatId !== null && String(ctx.chatId).trim() !== '') {
                        if (ctx.characterId !== undefined && ctx.characterId !== null) {
                            return `char_${ctx.characterId}_chat_${ctx.chatId}`;
                        }
                        return String(ctx.chatId);
                    }
                    if (ctx.saveName) return String(ctx.saveName);
                }
            }
            if (win.selected_chat) {
                if (win.this_ptid !== undefined && win.this_ptid !== null) {
                    return `char_${win.this_ptid}_chat_${win.selected_chat}`;
                }
                return String(win.selected_chat);
            }
            if (win.chat_metadata && win.chat_metadata.chat_id) return String(win.chat_metadata.chat_id);
            if (win.chatId) return String(win.chatId);
        } catch (e) {}
        return 'default_global_chat';
    }

    function loadMapDataForCurrentChat() {
        const newChatId = getActiveChatId();
        if (newChatId !== activeChatId) {
            navStack = []; // Reset breadcrumb stack khi sang chat mới
        }
        activeChatId = newChatId;

        const raw = localStorage.getItem(STORAGE_PREFIX + activeChatId);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.locations)) {
                    mapData = parsed;
                } else if (Array.isArray(parsed.nodes)) {
                    mapData = convertGraphToGridApp(parsed);
                    saveMapData();
                } else {
                    mapData = { locations: [] };
                }
            } catch (e) {
                mapData = { locations: [] };
            }
        } else {
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

            // Bản đồ mặc định khởi đầu rỗng (locations: []) theo đúng yêu cầu
            mapData = { locations: [] };
            saveMapData();
        }
        updateUI();
    }

    function convertGraphToGridApp(graphData) {
        let locations = [];
        const nodes = graphData.nodes || [];
        const edges = graphData.edges || [];

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
                status: h.status || 'Tự do',
                description: h.description || '',
                characters: h.controlled_by && h.controlled_by !== 'Chung' ? [h.controlled_by] : [],
                atmosphere: 'Bầu không khí bình thường.',
                secrets: 'Chưa phát hiện vật phẩm hay bí mật nào.',
                events: 'Tình hình ổn định.',
                connections: 'Đường nối thông ra các khu vực xung quanh.',
                subLocations: []
            });
        });

        subs.forEach(s => {
            const locObj = {
                id: s.id || ('sub_' + Math.random().toString(36).substr(2, 6)),
                name: s.label || 'Phân Khu',
                icon: getIconForCategory(s.category),
                category: s.category || 'sub_location',
                context_type: s.context_type || 'Phân khu',
                danger_level: s.danger_level || 'An toàn',
                controlled_by: s.controlled_by || 'Chung',
                status: s.status || 'Tự do',
                description: s.description || '',
                characters: s.controlled_by && s.controlled_by !== 'Chung' ? [s.controlled_by] : [],
                atmosphere: 'Không gian yên tĩnh.',
                secrets: 'Chưa có thông tin bí mật.',
                events: 'Không có biến cố đặc biệt.',
                connections: 'Lối đi nội bộ.',
                subLocations: []
            };

            const parentEdge = edges.find(e => (e.from === s.id || e.to === s.id) && hubs.some(h => h.id === e.from || h.id === e.to));
            let parentHubId = parentEdge ? (hubs.find(h => h.id === parentEdge.from || h.id === parentEdge.to)?.id) : (locations[0]?.id);
            let parentLoc = locations.find(l => l.id === parentHubId) || locations[0];
            if (parentLoc) {
                parentLoc.subLocations = parentLoc.subLocations || [];
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
        const hash = Array.from(charName).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const colors = ['#38bdf8', '#a855f7', '#f43f5e', '#10b981', '#f59e0b', '#6366f1'];
        return { isText: true, text: charName.substring(0, 2).toUpperCase(), bg: colors[hash % colors.length] };
    }

    const doc = (window.parent && window.parent.document) || document;

    function injectStyles() {
        if (doc.getElementById('lore-world-map-app-styles-v83')) return;
        const style = doc.createElement('style');
        style.id = 'lore-world-map-app-styles-v83';
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
                max-width: 1320px;
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
            .lore-header-left { display: flex; align-items: center; gap: 12px; }
            .lore-header-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
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
            
            /* ============ MAIN VIEWPORT & INFINITE N-LAYER BREADCRUMB ============ */
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
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 20px;
                background: rgba(255,255,255,0.06);
                padding: 12px 18px;
                border-radius: 16px;
                border: 1px solid rgba(255,255,255,0.14);
                font-size: 0.95em;
                font-weight: bold;
                flex-shrink: 0;
            }
            .lore-breadcrumb-btn {
                background: rgba(56, 189, 248, 0.2);
                color: #38bdf8;
                border: 1px solid rgba(56, 189, 248, 0.4);
                padding: 6px 14px;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.15s;
                font-size: 0.88em;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }
            .lore-breadcrumb-btn:hover { background: rgba(56, 189, 248, 0.35); transform: scale(1.02); }
            .lore-breadcrumb-item { cursor: pointer; color: #cbd5e1; padding: 4px 10px; border-radius: 8px; transition: all 0.15s; }
            .lore-breadcrumb-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
            .lore-breadcrumb-item.active { color: #38bdf8; font-weight: 800; cursor: default; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); }

            /* BỐ CỤC LƯỚI & ĐƯỜNG ĐI CHUẨN APP BẢN ĐỒ */
            .lore-grid-container {
                display: flex;
                flex-direction: column;
                gap: 16px;
                max-width: 1080px;
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
                #lore_app_header { flex-direction: column; align-items: stretch; max-height: 42vh; overflow-y: auto; gap: 10px; }
                .lore-header-left { justify-content: space-between; width: 100%; }
                .lore-header-actions { width: 100%; display: flex; flex-wrap: wrap; gap: 6px; }
                .lore-header-actions .lore-btn { flex: 1 1 auto; justify-content: center; }
                .lore-grid-row { grid-template-columns: repeat(2, 1fr) !important; gap: 12px; }
            }
            @media (max-width: 520px) {
                .lore-grid-row { grid-template-columns: 1fr !important; }
            }

            .location-button {
                min-height: 145px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: relative;
                background: linear-gradient(145deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.96));
                border: 2px solid rgba(148, 163, 184, 0.35);
                border-radius: 18px;
                padding: 18px 14px;
                cursor: pointer;
                transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
                color: #f8fafc;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                overflow: visible;
                user-select: none;
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

            .location-button > i { font-size: 30px; margin-bottom: 8px; color: #38bdf8; z-index: 1; transition: transform 0.2s; }
            .location-button.hub-button > i { color: #c084fc; }
            .location-button.danger-button > i { color: #fb7185; }
            .location-button:hover > i { transform: scale(1.15); }
            
            .location-button > .loc-name { font-weight: 800; font-size: 1.08em; z-index: 1; line-height: 1.3; max-width: 100%; word-break: break-word; color: #f8fafc; pointer-events: none; }
            .location-button > .loc-sub-count { font-size: 0.8em; color: #93c5fd; background: rgba(59, 130, 246, 0.22); padding: 3px 10px; border-radius: 8px; margin-top: 8px; border: 1px solid rgba(59, 130, 246, 0.45); font-weight: bold; pointer-events: none; }

            /* MARKER NHÂN VẬT STANDING TRÊN ĐỊA ĐIỂM */
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

            /* MODALS: DETAIL, AI SETTINGS, SAVED MAPS, AND AI REQUEST DEBUGGER */
            #lore_location_detail_modal, #lore_ai_config_modal, #lore_saved_maps_modal, #lore_ai_debug_modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,0.86);
                backdrop-filter: blur(12px);
                z-index: 100000000 !important;
                display: none;
                overflow-y: auto;
                padding: 30px 16px;
                box-sizing: border-box;
            }
            #lore_location_detail_box, #lore_ai_config_box, #lore_saved_maps_box, #lore_ai_debug_box {
                width: 100%;
                max-width: 720px;
                background: #0f172a;
                border: 2px solid #38bdf8;
                border-radius: 22px;
                padding: 26px;
                color: #fff;
                box-shadow: 0 25px 65px rgba(0,0,0,0.95);
                display: flex;
                flex-direction: column;
                gap: 16px;
                margin: auto;
                flex-shrink: 0;
                position: relative;
            }
            #lore_ai_config_box { max-width: 820px; }
            #lore_ai_debug_box { max-width: 860px; }
            
            /* DEEP INFO BOXES IN DETAILS MODAL */
            .deep-info-card {
                background: rgba(255,255,255,0.04);
                border: 1px solid rgba(255,255,255,0.12);
                border-radius: 14px;
                padding: 14px;
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .deep-info-title {
                font-size: 0.78em;
                color: #94a3b8;
                font-weight: 800;
                text-transform: uppercase;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .deep-info-text {
                font-size: 0.94em;
                color: #e2e8f0;
                line-height: 1.55;
            }

            .saved-map-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 14px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.14);
                border-radius: 12px;
                gap: 12px;
                transition: background 0.15s;
            }
            .saved-map-item:hover { background: rgba(255,255,255,0.1); }

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

    // EXTRACT HISTORY SIÊU ĐẦY ĐỦ (KHÔNG BỊ CẮT LẸM)
    function extractFullHistoryText(historyCountLimit, maxCharLimit) {
        const win = window.parent || window;
        let chatArray = [];
        if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
            const ctx = win.SillyTavern.getContext();
            if (ctx && Array.isArray(ctx.chat)) chatArray = ctx.chat;
        } else if (win.chat && Array.isArray(win.chat)) {
            chatArray = win.chat;
        }

        const count = historyCountLimit || 30;
        const recentChat = chatArray.slice(-count);
        let historyText = recentChat.map(m => {
            const sender = m.is_user ? 'Tôi (User)' : (m.name || 'AI/Nhân vật');
            const mes = m.mes || m.content || '';
            return `${sender}: ${mes}`;
        }).join('\n---\n');

        // Nếu có giới hạn ký tự tối đa (VD: 65,000), cắt từ cuối lên để luôn giữ lại những tin nhắn mới nhất
        if (maxCharLimit && maxCharLimit > 0 && historyText.length > maxCharLimit) {
            historyText = '...(Đã lược bỏ phần chat cũ xa xôi phía trên để tối ưu Tokens)...\n' + historyText.slice(-maxCharLimit);
        }

        return {
            text: historyText,
            msgCount: recentChat.length,
            charCount: historyText.length,
            estTokens: Math.round(historyText.length / 4)
        };
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
                        <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #38bdf8, #818cf8); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 12px rgba(56,189,248,0.4); flex-shrink: 0;">
                            ${SVG_GLOBE_ICON}
                        </div>
                        <div>
                            <div style="font-weight: 800; font-size: 1.12em; color: #f8fafc; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span>BẢN ĐỒ THẾ GIỚI (v1.3.0.8)</span>
                                <span id="lore_stats_badge" style="background: rgba(56,189,248,0.18); color: #38bdf8; font-size: 0.75em; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.3);">0 khu vực</span>
                                <span id="lore_ai_badge" style="background: rgba(168,85,247,0.18); color: #c084fc; font-size: 0.75em; padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(168,85,247,0.3); cursor: pointer;" title="Nhấp để cấu hình AI">🤖 Nguồn AI</span>
                            </div>
                            <div id="lore_chat_status" style="font-size: 0.78em; color: #94a3b8; margin-top: 2px;">Chat ID: <span style="color: #c084fc;">...</span> | Chuột Trái: Vào Phân Khu | Chuột Phải: Xem Thông Tin</div>
                        </div>
                    </div>

                    <div class="lore-header-actions">
                        <button id="lore_btn_ai_scan" class="lore-btn lore-btn-primary" title="AI quét lịch sử chat dựng bản đồ chính xác theo bối cảnh">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Quét & Xây Map
                        </button>

                        <button id="lore_btn_ai_debug" class="lore-btn" style="background: rgba(168,85,247,0.22); border: 1px solid #c084fc; color: #e9d5ff;" title="Kiểm tra chính xác 100% những gì đang gửi cho AI và lý do bị lẹm history">
                            <i class="fa-solid fa-bug"></i> Debug Request AI
                        </button>

                        <button id="lore_btn_add_location" class="lore-btn lore-btn-secondary" title="Thêm địa điểm vào lớp hiện tại">
                            <i class="fa-solid fa-plus"></i> Thêm Địa Điểm
                        </button>

                        <button id="lore_btn_saved_maps" class="lore-btn lore-btn-secondary" title="Kiểm tra & Xóa nhanh các bản đồ / chat đang lưu">
                            <i class="fa-solid fa-folder-tree"></i> Quản lý Map Lưu
                        </button>

                        <button id="lore_btn_ai_settings" class="lore-btn lore-btn-secondary" title="Cấu hình AI & Chỉnh sửa Prompt tùy biến">
                            <i class="fa-solid fa-gear"></i> Cấu hình AI & Prompt
                        </button>

                        <button id="lore_btn_close_app" class="lore-btn" style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #f87171; padding: 8px 12px; font-size: 1.05em;" title="Đóng bản đồ">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Viewport & Infinite N-Layer Breadcrumb -->
                <div id="lore_app_viewport">
                    <!-- Instruction Banner Chuột Trái / Chuột Phải -->
                    <div style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.25); border-radius: 12px; padding: 8px 14px; margin-bottom: 14px; font-size: 0.86em; color: #bae6fd; display: flex; align-items: center; gap: 8px; justify-content: space-between; flex-wrap: wrap;">
                        <span>💡 <b>Hướng dẫn điều khiển:</b> Nhấp <b>Chuột Trái</b> vào địa điểm để đi sâu vào tập con/phân khu bên trong $\\rightarrow$ Nhấp <b>Chuột Phải</b> (hoặc Nhấn Giữ) để xem & đọc Thông Tin Chi Tiết (Deep Info).</span>
                        <span style="font-size: 0.9em; color: #38bdf8; font-weight: bold;">[ Lưu tự động theo Chat ]</span>
                    </div>

                    <!-- Dynamic Infinite Breadcrumb Bar -->
                    <div id="lore_breadcrumb_container" class="lore-breadcrumb" style="display: none;">
                        <button id="btn_back_parent" class="lore-breadcrumb-btn"><i class="fa-solid fa-arrow-left"></i> Lùi 1 lớp</button>
                        <div id="breadcrumb_path_list" style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-left: 6px;"></div>
                    </div>

                    <!-- Lưới Địa Điểm & Đường Đi -->
                    <div id="lore_grid_container" class="lore-grid-container">
                        <!-- Nạp động -->
                    </div>
                </div>
            </div>

            <!-- MODAL CHI TIẾT ĐỊA ĐIỂM (DEEP INFO POPUP - Mở bằng Chuột Phải) -->
            <div id="lore_location_detail_modal">
                <div id="lore_location_detail_box">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <i id="det_icon" class="fas fa-building" style="font-size: 1.6em; color: #38bdf8;"></i>
                            <span id="det_name" style="font-size: 1.35em; font-weight: 800; color: #f8fafc;">Tên địa điểm</span>
                        </div>
                        <span id="det_close" style="cursor: pointer; color: #f87171; font-size: 1.3em; padding: 4px 8px;">✕</span>
                    </div>

                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span id="det_category_badge" style="padding: 5px 12px; border-radius: 8px; background: rgba(168,85,247,0.2); color: #d8b4fe; font-size: 0.84em; font-weight: bold; border: 1px solid rgba(168,85,247,0.4);">🏢 Khu vực lớn</span>
                        <span id="det_danger_badge" style="padding: 5px 12px; border-radius: 8px; background: rgba(34,197,94,0.2); color: #4ade80; font-size: 0.84em; font-weight: bold; border: 1px solid rgba(34,197,94,0.4);">🛡️ An toàn</span>
                        <span id="det_status_badge" style="padding: 5px 12px; border-radius: 8px; background: rgba(245,158,11,0.2); color: #fcd34d; font-size: 0.84em; font-weight: bold; border: 1px solid rgba(245,158,11,0.4);">🔓 Tự do</span>
                        <span id="det_type_badge" style="padding: 5px 12px; border-radius: 8px; background: rgba(59,130,246,0.2); color: #93c5fd; font-size: 0.84em; font-weight: bold; border: 1px solid rgba(59,130,246,0.4);">🏷️ Khu vực</span>
                    </div>

                    <!-- DEEP INFO SECTIONS & CONNECTIONS -->
                    <div class="deep-info-card">
                        <div class="deep-info-title"><i class="fa-solid fa-users"></i> Nhân vật kiểm soát / Hiện diện tại địa điểm</div>
                        <div id="det_characters" class="deep-info-text" style="color: #38bdf8; font-weight: bold;">Chung / Không rõ</div>
                    </div>

                    <div class="deep-info-card">
                        <div class="deep-info-title"><i class="fa-solid fa-scroll"></i> Mô tả chi tiết vai trò & Cảnh quan</div>
                        <div id="det_description" class="deep-info-text" style="white-space: pre-wrap;">Không có mô tả.</div>
                    </div>

                    <div class="deep-info-card" style="background: rgba(56,189,248,0.06); border-color: rgba(56,189,248,0.25);">
                        <div class="deep-info-title" style="color: #38bdf8;"><i class="fa-solid fa-route"></i> Cổng Kết Nối & Lối Đi Giao Thông Liên Vùng (Connections)</div>
                        <div id="det_connections" class="deep-info-text" style="color: #7dd3fc; font-weight: 600;">Đường nối nội bộ, chưa rõ lối ra tiếp theo.</div>
                    </div>

                    <div class="deep-info-card">
                        <div class="deep-info-title"><i class="fa-solid fa-cloud-sun"></i> Môi trường & Bầu không khí (Atmosphere)</div>
                        <div id="det_atmosphere" class="deep-info-text" style="color: #a7f3d0;">Bình thường, yên tĩnh.</div>
                    </div>

                    <div class="deep-info-card">
                        <div class="deep-info-title"><i class="fa-solid fa-gem"></i> Bí mật / Vật phẩm / Tài nguyên ẩn (Secrets & Loot)</div>
                        <div id="det_secrets" class="deep-info-text" style="color: #fde047;">Chưa phát hiện bí mật hay vật phẩm đặc biệt.</div>
                    </div>

                    <div class="deep-info-card">
                        <div class="deep-info-title"><i class="fa-solid fa-bolt-lightning"></i> Sự kiện hoặc Biến cố đang diễn ra (Active Events)</div>
                        <div id="det_events" class="deep-info-text" style="color: #fca5a5;">Không có biến cố nào.</div>
                    </div>

                    <!-- ACTIONS & INFINITE DRILL-DOWN -->
                    <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <button id="det_btn_enter_sub" class="lore-btn lore-btn-success" style="padding: 10px 18px; font-size: 0.95em;" title="Đi vào tập con / phân khu bên trong của địa điểm này">
                                <i class="fa-solid fa-door-open"></i> Vào Tập Con / Phân Khu
                            </button>
                            <button id="det_btn_ai_drill" class="lore-btn lore-btn-primary" style="padding: 10px 16px; font-size: 0.9em; background: linear-gradient(135deg, #0284c7, #9333ea);" title="Dùng AI khám phá & tạo tự động các phân khu nhỏ/hầm ngầm bên trong địa điểm này">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> AI Khám Phá Sâu
                            </button>
                        </div>

                        <div style="display: flex; gap: 8px;">
                            <button id="det_btn_edit" class="lore-btn lore-btn-secondary" style="padding: 8px 16px;">
                                <i class="fa-solid fa-pen"></i> Sửa Deep Info
                            </button>
                            <button id="det_btn_delete" class="lore-btn lore-btn-danger" style="padding: 8px 16px;">
                                <i class="fa-solid fa-trash"></i> Xóa
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- MODAL QUẢN LÝ MAP ĐÃ LƯU (SAVED MAPS MANAGER v8.2) -->
            <div id="lore_saved_maps_modal">
                <div id="lore_saved_maps_box">
                    <div style="font-weight: 800; font-size: 1.18em; color: #38bdf8; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 12px;">
                        <span>🗂️ QUẢN LÝ BẢN ĐỒ LƯU THEO CHAT</span>
                        <span id="saved_maps_close" style="cursor: pointer; color: #f87171; font-size: 1.15em;">✕</span>
                    </div>

                    <div style="font-size: 0.88em; color: #cbd5e1; line-height: 1.5; background: rgba(56,189,248,0.1); padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(56,189,248,0.25);">
                        ℹ️ Tất cả bản đồ thế giới đều được **tự động lưu riêng biệt theo từng Chat ID** của bạn. Dưới đây là danh sách các bản đồ hiện có trong hệ thống:
                    </div>

                    <div id="saved_maps_list" style="display: flex; flex-direction: column; gap: 10px; max-height: 52vh; overflow-y: auto; padding-right: 4px;">
                        <!-- Nạp danh sách các map đã lưu từ localStorage -->
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 14px; margin-top: 6px; flex-wrap: wrap; gap: 10px;">
                        <button id="btn_delete_all_inactive" class="lore-btn lore-btn-danger" style="padding: 10px 16px;">
                            <i class="fa-solid fa-broom"></i> Xóa Tất Cả Map Cũ (Giữ lại Chat hiện tại)
                        </button>
                        <button id="btn_refresh_saved_list" class="lore-btn lore-btn-secondary" style="padding: 10px 18px;">
                            <i class="fa-solid fa-rotate"></i> Làm Mới Danh Sách
                        </button>
                    </div>
                </div>
            </div>

            <!-- MODAL DEBUG AI REQUEST v8.3 -->
            <div id="lore_ai_debug_modal">
                <div id="lore_ai_debug_box">
                    <div style="font-weight: 800; font-size: 1.18em; color: #c084fc; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 12px;">
                        <span>🐞 TRÌNH DEBUG & KIỂM TRA REQUEST GỬI CHO AI</span>
                        <span id="ai_debug_close" style="cursor: pointer; color: #f87171; font-size: 1.15em;">✕</span>
                    </div>

                    <div style="font-size: 0.88em; color: #cbd5e1; line-height: 1.5; background: rgba(168,85,247,0.12); padding: 12px; border-radius: 12px; border: 1px solid rgba(168,85,247,0.3);">
                        ℹ️ <b>Vì sao trước đây bạn cảm giác AI bị cắt hay gửi không đầy đủ?</b><br>
                        - Phiên bản cũ giới hạn cứng cắt chuỗi ở 8,800 ký tự (~2,000 tokens), khiến nếu chat dài thì các tin nhắn bị xén mất phần đầu.<br>
                        - Từ bản v8.3, hệ thống đã mở rộng giới hạn lên tới <b>65,000+ ký tự</b> và cho phép bạn tùy chỉnh thoải mái trong Cấu hình AI! Dưới đây là chính xác những gì sẽ gửi đi lúc này:
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); text-align: center;">
                            <div style="font-size: 0.76em; color: #94a3b8; font-weight: bold;">SỐ TIN NHẮN QUÉT</div>
                            <div id="dbg_msg_count" style="font-size: 1.3em; font-weight: 800; color: #38bdf8; margin-top: 4px;">0 tin</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); text-align: center;">
                            <div style="font-size: 0.76em; color: #94a3b8; font-weight: bold;">TỔNG KÝ TỰ (CHARS)</div>
                            <div id="dbg_char_count" style="font-size: 1.3em; font-weight: 800; color: #4ade80; margin-top: 4px;">0 chars</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.15); text-align: center;">
                            <div style="font-size: 0.76em; color: #94a3b8; font-weight: bold;">ƯỚC TÍNH TOKENS</div>
                            <div id="dbg_token_count" style="font-size: 1.3em; font-weight: 800; color: #fde047; margin-top: 4px;">~0 tokens</div>
                        </div>
                    </div>

                    <div>
                        <label style="font-size: 0.8em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Toàn bộ Payload / Prompt sẽ gửi đến AI (Raw Payload Preview):</label>
                        <textarea id="dbg_prompt_textarea" class="lore-input" style="width: 100%; height: 280px; box-sizing: border-box; margin-top: 6px; font-family: monospace; font-size: 0.82em; line-height: 1.45;" readonly></textarea>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                        <button id="dbg_btn_copy" class="lore-btn lore-btn-primary" style="padding: 10px 18px;">
                            <i class="fa-solid fa-copy"></i> Sao Chép Toàn Bộ Request
                        </button>
                        <button id="dbg_btn_refresh" class="lore-btn lore-btn-secondary" style="padding: 10px 18px;">
                            <i class="fa-solid fa-rotate"></i> Làm Mới Preview
                        </button>
                    </div>
                </div>
            </div>

            <!-- MODAL CÀI ĐẶT AI & KHUNG CHỈNH SỬA PROMPT v8.3 -->
            <div id="lore_ai_config_modal">
                <div id="lore_ai_config_box">
                    <div style="font-weight: 800; font-size: 1.15em; color: #38bdf8; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 10px;">
                        <span>🤖 CẤU HÌNH AI & KHUNG TÙY CHỈNH PROMPT (v8.3)</span>
                        <span id="ai_cfg_close" style="cursor: pointer; color: #f87171; font-size: 1.1em;">✕</span>
                    </div>

                    <div style="display: flex; gap: 12px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 10px;">
                        <button id="tab_btn_conn" class="lore-breadcrumb-btn active" style="font-size: 0.9em; padding: 8px 16px;">🔌 Kết Nối & Model</button>
                        <button id="tab_btn_prompt_scan" class="lore-breadcrumb-btn" style="font-size: 0.9em; padding: 8px 16px;">📝 Prompt Quét Toàn Bộ Map</button>
                        <button id="tab_btn_prompt_drill" class="lore-breadcrumb-btn" style="font-size: 0.9em; padding: 8px 16px;">📝 Prompt Khám Phá Sâu</button>
                    </div>

                    <!-- TAB 1: CONNECTION SETTINGS -->
                    <div id="tab_pane_conn" style="display: flex; flex-direction: column; gap: 14px;">
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

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <label style="font-size: 0.8em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Số tin nhắn quét gần nhất (Mặc định 30)</label>
                                <select id="cfg_history_count" class="lore-input" style="width: 100%; margin-top: 4px;">
                                    <option value="10">10 tin nhắn</option>
                                    <option value="15">15 tin nhắn</option>
                                    <option value="30">30 tin nhắn (Mặc định - Khuyên dùng)</option>
                                    <option value="50">50 tin nhắn (Sâu & Chi tiết)</option>
                                    <option value="100">100 tin nhắn (Toàn cảnh)</option>
                                    <option value="200">200 tin nhắn (Cực dài)</option>
                                </select>
                            </div>
                            <div>
                                <label style="font-size: 0.8em; color: #94a3b8; font-weight: bold; text-transform: uppercase;">Giới hạn cắt theo Ký tự / Token</label>
                                <select id="cfg_history_max_chars" class="lore-input" style="width: 100%; margin-top: 4px;">
                                    <option value="0">Không giới hạn (Mặc định - Chỉ theo số tin nhắn)</option>
                                    <option value="65000">65,000 ký tự (~16,000 tokens)</option>
                                    <option value="100000">100,000 ký tự (~25,000 tokens)</option>
                                    <option value="200000">200,000 ký tự (~50,000 tokens)</option>
                                    <option value="30000">30,000 ký tự (~7,500 tokens)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- TAB 2: PROMPT WORLD SCAN EDITOR -->
                    <div id="tab_pane_prompt_scan" style="display: none; flex-direction: column; gap: 10px;">
                        <div style="font-size: 0.82em; color: #93c5fd; line-height: 1.4;">
                            💡 Biến hỗ trợ: <code>{{history}}</code> (Lịch sử chat được chèn vào), <code>{{existing_map}}</code> (Cấu trúc map hiện tại).
                        </div>
                        <textarea id="cfg_prompt_world_scan" class="lore-input" style="width: 100%; height: 320px; box-sizing: border-box; font-family: monospace; font-size: 0.82em; line-height: 1.45;"></textarea>
                        <div style="display: flex; justify-content: flex-start;">
                            <button id="btn_reset_prompt_scan" class="lore-btn lore-btn-secondary" style="font-size: 0.8em;">
                                <i class="fa-solid fa-rotate-left"></i> Khôi Phục Prompt Quét Mặc Định
                            </button>
                        </div>
                    </div>

                    <!-- TAB 3: PROMPT DEEP DRILL EDITOR -->
                    <div id="tab_pane_prompt_drill" style="display: none; flex-direction: column; gap: 10px;">
                        <div style="font-size: 0.82em; color: #93c5fd; line-height: 1.4;">
                            💡 Biến hỗ trợ: <code>{{history}}</code>, <code>{{target_name}}</code>, <code>{{target_type}}</code>, <code>{{target_desc}}</code>, <code>{{target_atmo}}</code>, <code>{{target_secrets}}</code>.
                        </div>
                        <textarea id="cfg_prompt_deep_drill" class="lore-input" style="width: 100%; height: 320px; box-sizing: border-box; font-family: monospace; font-size: 0.82em; line-height: 1.45;"></textarea>
                        <div style="display: flex; justify-content: flex-start;">
                            <button id="btn_reset_prompt_drill" class="lore-btn lore-btn-secondary" style="font-size: 0.8em;">
                                <i class="fa-solid fa-rotate-left"></i> Khôi Phục Prompt Khám Phá Mặc Định
                            </button>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;">
                        <button id="ai_cfg_save" class="lore-btn lore-btn-success" style="padding: 10px 20px;">
                            <i class="fa-solid fa-check"></i> Lưu Toàn Bộ Cấu Hình & Prompt
                        </button>
                    </div>
                </div>
            </div>
        `;
        doc.body.appendChild(overlay);

        overlay.querySelector('#lore_btn_close_app').addEventListener('click', () => overlay.style.display = 'none');
        overlay.querySelector('#btn_back_parent').addEventListener('click', () => {
            if (navStack.length > 0) {
                navStack.pop();
                renderAppGrid();
            }
        });

        // Xử lý nút Thêm Địa Điểm
        overlay.querySelector('#lore_btn_add_location').addEventListener('click', () => {
            const currentParent = navStack.length > 0 ? navStack[navStack.length - 1] : null;
            const name = prompt('Nhập tên địa điểm/phân khu mới:', 'Khu Vực / Căn Phòng Mới');
            if (!name || !name.trim()) return;
            const contextType = prompt('Loại địa điểm theo bối cảnh (VD: Phòng học, Trạm vũ trụ, Quán ăn...):', currentParent ? 'Phân khu tầng sâu' : 'Khu vực lớn') || 'Khu vực';
            const danger = prompt('Mức độ an toàn / rủi ro tại đây:', 'An toàn bình thường') || 'An toàn';
            const controlled = prompt('Nhân vật nào đang đứng tại hoặc quản lý nơi này? (Nhập tên để hiện Avatar):', 'Tôi') || 'Chung';
            const desc = prompt('Mô tả chi tiết hoặc sự kiện diễn ra tại đây:', 'Một địa điểm vừa được thêm vào bản đồ.') || '';
            const connections = prompt('Cổng kết nối / Lối đi liên kết tới các khu vực khác:', 'Đường nối nội bộ, thang máy hay hành lang...') || 'Lối đi thông ra xung quanh.';
            const atmo = prompt('Môi trường & Bầu không khí (Atmosphere):', 'Không gian yên tĩnh, ánh sáng dịu nhẹ.') || 'Bình thường';
            const secrets = prompt('Bí mật / Vật phẩm / Tài nguyên ẩn (Secrets & Loot):', 'Chưa có thông tin bí mật.') || 'Chưa phát hiện bí mật nào';

            const newLoc = {
                id: (currentParent ? 'sub_' : 'loc_') + Date.now(),
                name: name.trim(),
                icon: currentParent ? 'fa-door-open' : 'fa-building',
                category: currentParent ? 'sub_location' : 'major_hub',
                context_type: contextType.trim(),
                danger_level: danger.trim(),
                controlled_by: controlled.trim(),
                status: 'Tự do ra vào',
                description: desc.trim(),
                characters: controlled && controlled !== 'Chung' ? controlled.split(',').map(c => c.trim()).filter(Boolean) : [],
                atmosphere: atmo.trim(),
                secrets: secrets.trim(),
                events: 'Tình hình ổn định.',
                connections: connections.trim(),
                subLocations: []
            };

            if (currentParent) {
                currentParent.subLocations = currentParent.subLocations || [];
                currentParent.subLocations.push(newLoc);
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

        // Xử lý nút Debug AI Request v8.3
        const debugModal = overlay.querySelector('#lore_ai_debug_modal');
        const btnDebug = overlay.querySelector('#lore_btn_ai_debug');
        
        function openDebugInspector() {
            loadAiConfig();
            const histObj = extractFullHistoryText(aiConfig.historyCount, aiConfig.historyMaxChars);
            overlay.querySelector('#dbg_msg_count').innerText = `${histObj.msgCount} tin`;
            overlay.querySelector('#dbg_char_count').innerText = `${histObj.charCount.toLocaleString()} chars`;
            overlay.querySelector('#dbg_token_count').innerText = `~${histObj.estTokens.toLocaleString()} tokens`;

            const existingStr = mapData.locations.map(l => `- ${l.name} (${l.context_type}): [${(l.subLocations||[]).map(s=>s.name).join(', ')}]`).join('\n');
            let template = aiConfig.customPromptWorldScan || DEFAULT_WORLD_SCAN_PROMPT;
            const fullPromptPreview = template.replace('{{history}}', histObj.text).replace('{{existing_map}}', existingStr || '(Chưa có)');

            overlay.querySelector('#dbg_prompt_textarea').value = fullPromptPreview;
            debugModal.style.display = 'flex';
        }

        btnDebug.addEventListener('click', openDebugInspector);
        overlay.querySelector('#ai_debug_close').addEventListener('click', () => debugModal.style.display = 'none');
        overlay.querySelector('#dbg_btn_refresh').addEventListener('click', openDebugInspector);
        overlay.querySelector('#dbg_btn_copy').addEventListener('click', () => {
            const txt = overlay.querySelector('#dbg_prompt_textarea').value;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(txt).then(() => alert('📋 Đã sao chép toàn bộ Prompt Request vào clipboard!'));
            } else {
                alert('Vui lòng bôi đen và nhấn Ctrl+C để sao chép trong khung văn bản.');
            }
        });

        // Xử lý Quản lý Bản đồ đã lưu
        const savedModal = overlay.querySelector('#lore_saved_maps_modal');
        const btnSavedMaps = overlay.querySelector('#lore_btn_saved_maps');
        btnSavedMaps.addEventListener('click', () => {
            renderSavedMapsList();
            savedModal.style.display = 'flex';
        });
        overlay.querySelector('#saved_maps_close').addEventListener('click', () => savedModal.style.display = 'none');
        overlay.querySelector('#btn_refresh_saved_list').addEventListener('click', () => renderSavedMapsList());
        overlay.querySelector('#btn_delete_all_inactive').addEventListener('click', () => {
            if (!confirm('⚠️ Bạn có chắc chắn muốn xóa toàn bộ các bản đồ cũ của các chat khác không? (Bản đồ của Chat hiện tại sẽ được giữ lại an toàn)')) return;
            let count = 0;
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k.startsWith(STORAGE_PREFIX) && k !== STORAGE_PREFIX + activeChatId) {
                    localStorage.removeItem(k);
                    count++;
                }
            }
            alert(`✅ Đã xóa dọn dẹp ${count} bản đồ chat cũ thành công!`);
            renderSavedMapsList();
        });

        // Xử lý Cài đặt AI & Chỉnh sửa Prompt
        const aiModal = overlay.querySelector('#lore_ai_config_modal');
        const btnAiSettings = overlay.querySelector('#lore_btn_ai_settings');
        const badgeAi = overlay.querySelector('#lore_ai_badge');

        function openAiConfig() {
            loadAiConfig();
            overlay.querySelector('#cfg_source').value = aiConfig.source || 'sillytavern';
            overlay.querySelector('#cfg_url').value = aiConfig.customUrl || '';
            overlay.querySelector('#cfg_key').value = aiConfig.customKey || '';
            overlay.querySelector('#cfg_model').value = aiConfig.customModel || 'gpt-4o-mini';
            overlay.querySelector('#cfg_history_count').value = String(aiConfig.historyCount || 30);
            overlay.querySelector('#cfg_history_max_chars').value = String(aiConfig.historyMaxChars !== undefined ? aiConfig.historyMaxChars : 65000);

            overlay.querySelector('#cfg_prompt_world_scan').value = aiConfig.customPromptWorldScan || DEFAULT_WORLD_SCAN_PROMPT;
            overlay.querySelector('#cfg_prompt_deep_drill').value = aiConfig.customPromptDeepDrill || DEFAULT_DEEP_DRILL_PROMPT;

            overlay.querySelector('#cfg_custom_group').style.display = aiConfig.source === 'custom' ? 'flex' : 'none';
            aiModal.style.display = 'flex';
        }

        btnAiSettings.addEventListener('click', openAiConfig);
        badgeAi.addEventListener('click', openAiConfig);

        // Chuyển Tab trong AI Config
        const tabBtnConn = overlay.querySelector('#tab_btn_conn');
        const tabBtnScan = overlay.querySelector('#tab_btn_prompt_scan');
        const tabBtnDrill = overlay.querySelector('#tab_btn_prompt_drill');
        const paneConn = overlay.querySelector('#tab_pane_conn');
        const paneScan = overlay.querySelector('#tab_pane_prompt_scan');
        const paneDrill = overlay.querySelector('#tab_pane_prompt_drill');

        function switchTab(target) {
            [tabBtnConn, tabBtnScan, tabBtnDrill].forEach(b => b.style.background = 'rgba(56,189,248,0.2)');
            [paneConn, paneScan, paneDrill].forEach(p => p.style.display = 'none');
            if (target === 'conn') {
                tabBtnConn.style.background = 'rgba(56,189,248,0.45)';
                paneConn.style.display = 'flex';
            } else if (target === 'scan') {
                tabBtnScan.style.background = 'rgba(56,189,248,0.45)';
                paneScan.style.display = 'flex';
            } else {
                tabBtnDrill.style.background = 'rgba(56,189,248,0.45)';
                paneDrill.style.display = 'flex';
            }
        }

        tabBtnConn.addEventListener('click', () => switchTab('conn'));
        tabBtnScan.addEventListener('click', () => switchTab('scan'));
        tabBtnDrill.addEventListener('click', () => switchTab('drill'));
        switchTab('conn');

        overlay.querySelector('#btn_reset_prompt_scan').addEventListener('click', () => {
            if (confirm('Khôi phục Prompt Quét Bản Đồ về mặc định chuẩn chuyên sâu v8.3?')) {
                overlay.querySelector('#cfg_prompt_world_scan').value = DEFAULT_WORLD_SCAN_PROMPT;
            }
        });
        overlay.querySelector('#btn_reset_prompt_drill').addEventListener('click', () => {
            if (confirm('Khôi phục Prompt Khám Phá Sâu về mặc định chuẩn chuyên sâu v8.3?')) {
                overlay.querySelector('#cfg_prompt_deep_drill').value = DEFAULT_DEEP_DRILL_PROMPT;
            }
        });

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
            aiConfig.historyMaxChars = parseInt(overlay.querySelector('#cfg_history_max_chars').value, 10) || 0;
            aiConfig.customPromptWorldScan = overlay.querySelector('#cfg_prompt_world_scan').value.trim() || DEFAULT_WORLD_SCAN_PROMPT;
            aiConfig.customPromptDeepDrill = overlay.querySelector('#cfg_prompt_deep_drill').value.trim() || DEFAULT_DEEP_DRILL_PROMPT;

            saveAiConfig();
            updateUI();
            aiModal.style.display = 'none';
            alert('🎉 Đã lưu thành công cấu hình AI và các Prompt tùy chỉnh!');
        });

        // Xử lý Modal Chi Tiết Deep Lore Info
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
            selectedDetailLocation.status = prompt('Trạng thái truy cập (Khóa / Tự do / Tuyệt mật):', selectedDetailLocation.status || 'Tự do') || 'Tự do';
            selectedDetailLocation.description = prompt('Mô tả chi tiết & vai trò:', selectedDetailLocation.description || '') || '';
            selectedDetailLocation.connections = prompt('Cổng kết nối / Lối đi liên kết tới các khu vực khác:', selectedDetailLocation.connections || '') || 'Đường nối nội bộ.';
            selectedDetailLocation.atmosphere = prompt('Môi trường & Bầu không khí (Atmosphere):', selectedDetailLocation.atmosphere || '') || 'Bình thường';
            selectedDetailLocation.secrets = prompt('Bí mật / Vật phẩm / Tài nguyên ẩn (Secrets & Loot):', selectedDetailLocation.secrets || '') || 'Chưa phát hiện bí mật nào';
            selectedDetailLocation.events = prompt('Sự kiện hoặc biến cố đang diễn ra (Events):', selectedDetailLocation.events || '') || 'Không có biến cố nào';
            
            saveMapData();
            detModal.style.display = 'none';
            renderAppGrid();
        });

        overlay.querySelector('#det_btn_enter_sub').addEventListener('click', () => {
            if (!selectedDetailLocation) return;
            detModal.style.display = 'none';
            navStack.push(selectedDetailLocation);
            renderAppGrid();
        });

        // AI Khám Phá Sâu Phân Khu Bên Trong (Deep Drill Scan)
        overlay.querySelector('#det_btn_ai_drill').addEventListener('click', async () => {
            if (!selectedDetailLocation) return;
            await triggerAiDeepDrillScan(selectedDetailLocation);
        });

        overlay.querySelector('#det_btn_delete').addEventListener('click', () => {
            if (!selectedDetailLocation || !confirm(`Bạn có chắc muốn xóa "${selectedDetailLocation.name}"?`)) return;
            const currentParent = navStack.length > 0 ? navStack[navStack.length - 1] : null;
            if (currentParent && Array.isArray(currentParent.subLocations)) {
                currentParent.subLocations = currentParent.subLocations.filter(l => l.id !== selectedDetailLocation.id);
            } else {
                mapData.locations = mapData.locations.filter(l => l.id !== selectedDetailLocation.id);
            }
            saveMapData();
            detModal.style.display = 'none';
            renderAppGrid();
        });
    }

    function renderSavedMapsList() {
        const listContainer = doc.getElementById('saved_maps_list');
        if (!listContainer) return;

        let items = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(STORAGE_PREFIX)) {
                const chatId = k.replace(STORAGE_PREFIX, '');
                let count = 0;
                let sizeBytes = 0;
                try {
                    const val = localStorage.getItem(k);
                    sizeBytes = new Blob([val || '']).size;
                    const parsed = JSON.parse(val || '{}');
                    if (Array.isArray(parsed.locations)) count = countAllLocations(parsed.locations);
                } catch (e) {}
                items.push({ key: k, chatId, count, sizeKB: (sizeBytes / 1024).toFixed(1) });
            }
        }

        if (items.length === 0) {
            listContainer.innerHTML = `<div style="text-align: center; color: #64748b; padding: 30px;">Chưa có bản đồ nào được lưu trong bộ nhớ.</div>`;
            return;
        }

        listContainer.innerHTML = items.map(item => {
            const isCurrent = item.chatId === activeChatId;
            return `
                <div class="saved-map-item" style="${isCurrent ? 'border-color: #38bdf8; background: rgba(56,189,248,0.12);' : ''}">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="font-weight: 800; color: #f8fafc; font-size: 0.98em;">
                            💬 Chat ID: <span style="color: #c084fc;">${item.chatId}</span>
                            ${isCurrent ? `<span style="background: #38bdf8; color: #000; font-size: 0.72em; padding: 2px 6px; border-radius: 6px; margin-left: 6px;">⭐ Đang mở</span>` : ''}
                        </div>
                        <div style="font-size: 0.82em; color: #94a3b8;">
                            📍 <b>${item.count}</b> khu vực / phân khu | 📦 <b>${item.sizeKB} KB</b>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        ${!isCurrent ? `
                            <button class="lore-btn lore-btn-secondary" style="padding: 6px 12px; font-size: 0.82em;" onclick="window._loreLoadSavedMap('${item.chatId}')" title="Chuyển sang xem/sửa bản đồ này">
                                <i class="fa-solid fa-folder-open"></i> Xem Thử
                            </button>
                            <button class="lore-btn lore-btn-danger" style="padding: 6px 10px; font-size: 0.82em;" onclick="window._loreDeleteSavedMap('${item.key}', '${item.chatId}')" title="Xóa bản đồ chat này">
                                <i class="fa-solid fa-trash"></i> Xóa
                            </button>
                        ` : `
                            <span style="font-size: 0.82em; color: #38bdf8; font-weight: bold; padding: 6px 10px;">(Bản đồ hiện tại)</span>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    window._loreLoadSavedMap = function (chatId) {
        activeChatId = chatId;
        navStack = [];
        const raw = localStorage.getItem(STORAGE_PREFIX + activeChatId);
        if (raw) {
            try { mapData = JSON.parse(raw); } catch (e) { mapData = { locations: [] }; }
        } else {
            mapData = { locations: [] };
        }
        doc.getElementById('lore_saved_maps_modal').style.display = 'none';
        renderAppGrid();
        alert(`📂 Đã chuyển sang xem bản đồ của Chat ID: ${chatId}`);
    };

    window._loreDeleteSavedMap = function (storageKey, chatId) {
        if (!confirm(`Bạn có chắc muốn xóa bản đồ đã lưu của Chat ID "${chatId}" không?`)) return;
        try { localStorage.removeItem(storageKey); } catch (e) {}
        renderSavedMapsList();
        if (chatId === activeChatId) {
            mapData = { locations: [] };
            renderAppGrid();
        }
    };

    function countAllLocations(locList) {
        let count = 0;
        if (!Array.isArray(locList)) return 0;
        locList.forEach(l => {
            count++;
            if (Array.isArray(l.subLocations)) count += countAllLocations(l.subLocations);
        });
        return count;
    }

    function updateUI() {
        loadAiConfig();
        const statusBox = doc.getElementById('lore_chat_status');
        const badgeStats = doc.getElementById('lore_stats_badge');
        const badgeAi = doc.getElementById('lore_ai_badge');

        if (statusBox) statusBox.innerHTML = `Chat ID: <span style="color: #c084fc;">${activeChatId}</span> | Chuột Trái: Vào Phân Khu | Chuột Phải: Xem Thông Tin`;
        if (badgeStats) {
            const total = countAllLocations(mapData.locations);
            badgeStats.innerText = `${total} khu vực`;
        }
        if (badgeAi) {
            badgeAi.innerText = aiConfig.source === 'custom' ? `⚡ Custom AI (${aiConfig.customModel || 'model'})` : `⭐ SillyTavern AI`;
        }
    }

    function renderBreadcrumb() {
        const breadcrumb = doc.getElementById('lore_breadcrumb_container');
        const pathList = doc.getElementById('breadcrumb_path_list');
        if (!breadcrumb || !pathList) return;

        if (navStack.length === 0) {
            breadcrumb.style.display = 'none';
            return;
        }

        breadcrumb.style.display = 'flex';
        let html = `<span class="lore-breadcrumb-item" onclick="window._loreNavJump(-1)">🌍 Thế Giới / Lớp Gốc</span>`;
        
        navStack.forEach((loc, idx) => {
            html += `<span style="color: #64748b; font-weight: bold;">/</span>`;
            if (idx === navStack.length - 1) {
                html += `<span class="lore-breadcrumb-item active">📍 ${loc.name}</span>`;
            } else {
                html += `<span class="lore-breadcrumb-item" onclick="window._loreNavJump(${idx})">${loc.name}</span>`;
            }
        });

        pathList.innerHTML = html;
    }

    window._loreNavJump = function (stackIdx) {
        if (stackIdx === -1) {
            navStack = [];
        } else if (stackIdx >= 0 && stackIdx < navStack.length - 1) {
            navStack = navStack.slice(0, stackIdx + 1);
        }
        renderAppGrid();
    };

    function renderAppGrid() {
        updateUI();
        renderBreadcrumb();
        const gridContainer = doc.getElementById('lore_grid_container');
        if (!gridContainer) return;

        const currentParent = navStack.length > 0 ? navStack[navStack.length - 1] : null;
        let currentList = currentParent ? (currentParent.subLocations || []) : (mapData.locations || []);

        if (currentList.length === 0) {
            gridContainer.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #64748b; background: rgba(255,255,255,0.02); border-radius: 18px; border: 1px dashed rgba(255,255,255,0.12);">
                    <i class="fa-solid fa-map-location-dot" style="font-size: 3.5em; color: #38bdf8; opacity: 0.5; margin-bottom: 12px;"></i>
                    <div style="font-size: 1.1em; font-weight: bold; color: #cbd5e1;">Lớp phân khu này hiện chưa có địa điểm nào</div>
                    <div style="font-size: 0.88em; margin-top: 6px;">Nhấp <b>Chuột Phải</b> vào lớp cha để dùng <b>[ ⚡ AI Khám Phá Sâu ]</b> hoặc bấm nút <b>[ Thêm Địa Điểm ]</b> ở trên!</div>
                </div>
            `;
            return;
        }

        const COLS = 3;
        const rowsCount = Math.ceil(currentList.length / COLS);
        let html = '';

        for (let r = 0; r < rowsCount; r++) {
            html += `<div class="lore-grid-row">`;
            for (let c = 0; c < COLS; c++) {
                const idx = r * COLS + c;
                const loc = currentList[idx];

                if (loc) {
                    const isHub = loc.category === 'major_hub' || (!currentParent && (!loc.category || loc.category === 'major_hub'));
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
                            <div class="character-marker" title="Nhân vật hiện diện: ${charName} (Nhấp để mở Deep Info)" onclick="event.stopPropagation(); window._loreShowDetail('${loc.id}')">
                                <div class="character-marker-avatar">${inner}</div>
                                <div class="marker-pin"></div>
                            </div>
                        `;
                    }).join('');

                    html += `
                        <div class="${btnClass}" onclick="window._loreOnLocationLeftClick(event, '${loc.id}')" oncontextmenu="window._loreOnLocationRightClick(event, '${loc.id}')" title="🖱️ Chuột Trái: Vào Phân Khu (${subCount} tập con) | 🖱️ Chuột Phải: Xem & Đọc Thông Tin Chi Tiết (Deep Info)">
                            <div class="character-markers">${charPinsHTML}</div>
                            <i class="fas ${loc.icon || 'fa-location-dot'}"></i>
                            <span class="loc-name">${loc.name}</span>
                            ${subCount > 0 ? `<span class="loc-sub-count">📁 ${subCount} tập con bên trong</span>` : `<span style="font-size:0.75em; color:#94a3b8; margin-top:4px;">🏷️ ${loc.context_type || 'Phân khu'}</span>`}
                        </div>
                    `;
                } else if (idx === currentList.length) {
                    html += `
                        <div class="location-button empty-location" style="cursor: pointer; border-color: rgba(56,189,248,0.35); background: rgba(56,189,248,0.08);" onclick="document.getElementById('lore_btn_add_location').click()" title="Nhấp chuột trái để thêm địa điểm vào ô trống này">
                            <i class="fas fa-plus" style="color: #38bdf8; font-size: 24px;"></i>
                            <span style="font-size: 0.94em; font-weight: bold; color: #38bdf8;">Thêm Địa Điểm</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="location-button empty-location" style="opacity: 0.25; border: 1px dashed rgba(148,163,184,0.12);">
                            <i class="fas fa-question" style="font-size: 16px;"></i>
                            <span style="font-size: 0.82em;">Trống</span>
                        </div>
                    `;
                }

                if (c < COLS - 1 && currentList[idx] && currentList[idx + 1]) {
                    html += `<div class="road-vertical" style="position: absolute; right: -17px; top: 50%; transform: translateY(-50%); height: 32px; width: 16px;"></div>`;
                }
            }
            html += `</div>`;

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

    // CHUỘT TRÁI: Vào xem tập con / drill-down
    window._loreOnLocationLeftClick = function (event, locId) {
        if (event && event.stopPropagation) event.stopPropagation();
        const currentParent = navStack.length > 0 ? navStack[navStack.length - 1] : null;
        let list = currentParent ? (currentParent.subLocations || []) : mapData.locations;
        const found = list.find(l => l.id === locId);
        if (!found) return;

        if (Array.isArray(found.subLocations) && found.subLocations.length > 0) {
            navStack.push(found);
            renderAppGrid();
        } else {
            found.subLocations = found.subLocations || [];
            navStack.push(found);
            renderAppGrid();
        }
    };

    // CHUỘT PHẢI: Mở xem thông tin chi tiết (Deep Lore Info)
    window._loreOnLocationRightClick = function (event, locId) {
        if (event) {
            if (event.preventDefault) event.preventDefault();
            if (event.stopPropagation) event.stopPropagation();
        }
        window._loreShowDetail(locId);
        return false;
    };

    window._loreShowDetail = function (locId) {
        const currentParent = navStack.length > 0 ? navStack[navStack.length - 1] : null;
        let list = currentParent ? (currentParent.subLocations || []) : mapData.locations;
        let found = list.find(l => l.id === locId);
        if (!found) {
            found = findLocationRecursive(mapData.locations, locId);
        }
        if (!found) return;

        selectedDetailLocation = found;
        const detModal = doc.getElementById('lore_location_detail_modal');
        if (!detModal) return;

        doc.getElementById('det_icon').className = `fas ${found.icon || 'fa-building'}`;
        doc.getElementById('det_name').innerText = found.name;
        doc.getElementById('det_category_badge').innerText = found.category === 'major_hub' ? '🏢 Khu vực lớn / Tầng ngoài' : '📍 Phân khu / Phòng sâu';
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

        const statusBadge = doc.getElementById('det_status_badge');
        statusBadge.innerText = `🔓 ${found.status || 'Tự do'}`;

        const charsList = found.characters && found.characters.length > 0 ? found.characters.join(', ') : (found.controlled_by || 'Chung / Không rõ');
        doc.getElementById('det_characters').innerText = charsList;
        doc.getElementById('det_description').innerText = found.description || 'Không có thông tin mô tả chi tiết.';
        doc.getElementById('det_connections').innerText = found.connections || 'Đường nối nội bộ, chưa ghi nhận lối ra tiếp theo.';
        doc.getElementById('det_atmosphere').innerText = found.atmosphere || 'Bầu không khí bình thường, không có điểm bất thường.';
        doc.getElementById('det_secrets').innerText = found.secrets || 'Chưa phát hiện bí mật hay vật phẩm đặc biệt nào.';
        doc.getElementById('det_events').innerText = found.events || 'Tình hình ổn định, không có sự kiện căng thẳng nào.';

        const btnEnterSub = doc.getElementById('det_btn_enter_sub');
        btnEnterSub.style.display = 'inline-flex';
        if (Array.isArray(found.subLocations) && found.subLocations.length > 0) {
            btnEnterSub.innerHTML = `<i class="fa-solid fa-door-open"></i> Vào Tập Con (${found.subLocations.length})`;
        } else {
            btnEnterSub.innerHTML = `<i class="fa-solid fa-folder-plus"></i> Vào Tập Con (Tạo mới)`;
        }

        detModal.style.display = 'flex';
    };

    function findLocationRecursive(locList, targetId) {
        if (!Array.isArray(locList)) return null;
        for (let l of locList) {
            if (l.id === targetId) return l;
            if (Array.isArray(l.subLocations) && l.subLocations.length > 0) {
                const sub = findLocationRecursive(l.subLocations, targetId);
                if (sub) return sub;
            }
        }
        return null;
    }

    // AI Khám Phá Sâu & Dựng Phân Khu Con (Infinite Deep Drill Scan v8.3)
    async function triggerAiDeepDrillScan(targetLoc) {
        if (!targetLoc) return;
        loadAiConfig();
        const btnDrill = doc.getElementById('det_btn_ai_drill');
        if (btnDrill) {
            btnDrill.disabled = true;
            btnDrill.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> AI đang suy luận & tạo tầng sâu bên trong "${targetLoc.name}"...`;
        }

        try {
            const histObj = extractFullHistoryText(aiConfig.historyCount, aiConfig.historyMaxChars);
            let template = aiConfig.customPromptDeepDrill || DEFAULT_DEEP_DRILL_PROMPT;
            const prompt = template
                .replace('{{history}}', histObj.text)
                .replace('{{target_name}}', targetLoc.name || '')
                .replace('{{target_type}}', targetLoc.context_type || '')
                .replace('{{target_desc}}', targetLoc.description || '')
                .replace('{{target_atmo}}', targetLoc.atmosphere || '')
                .replace('{{target_secrets}}', targetLoc.secrets || '');

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
                            temperature: 0.75
                        })
                    });
                    const data = await res.json();
                    if (data && data.choices && data.choices[0] && data.choices[0].message) {
                        responseJson = parseJsonFromText(data.choices[0].message.content);
                    }
                } catch (e) {}
            }

            const win = window.parent || window;
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
                    ], { maxTokens: 4000, temperature: 0.75 });
                    responseJson = parseJsonFromText(rawRes);
                } catch (e) {}
            }

            if (!responseJson || !Array.isArray(responseJson.subLocations)) {
                throw new Error('AI không trả về JSON phân khu hợp lệ! Hãy kiểm tra trong nút [🐞 Debug AI Request].');
            }

            targetLoc.subLocations = targetLoc.subLocations || [];
            let added = 0;
            responseJson.subLocations.forEach(sub => {
                if (!sub || !sub.name) return;
                const exist = targetLoc.subLocations.find(s => s.name.toLowerCase() === sub.name.trim().toLowerCase());
                if (!exist) {
                    targetLoc.subLocations.push({
                        id: 'sub_' + Math.random().toString(36).substr(2, 7),
                        name: sub.name.trim(),
                        icon: 'fa-door-open',
                        category: 'sub_location',
                        context_type: sub.context_type || 'Phân khu tầng sâu',
                        danger_level: sub.danger_level || 'An toàn',
                        controlled_by: sub.controlled_by || 'Chung',
                        status: sub.status || 'Tự do',
                        description: sub.description || '',
                        characters: Array.isArray(sub.characters) ? sub.characters : [],
                        atmosphere: sub.atmosphere || 'Không gian yên tĩnh.',
                        secrets: sub.secrets || 'Chưa phát hiện bí mật nào.',
                        events: sub.events || 'Tình hình ổn định.',
                        connections: sub.connections || 'Lối đi nội bộ.',
                        subLocations: []
                    });
                    added++;
                }
            });

            saveMapData();
            doc.getElementById('lore_location_detail_modal').style.display = 'none';
            navStack.push(targetLoc);
            renderAppGrid();
            alert(`🎉 AI đã khám phá thành công +${added} phân khu tầng sâu bên trong "${targetLoc.name}"!`);
        } catch (err) {
            alert('⚠️ Lỗi khi AI khám phá tầng sâu: ' + err.message);
        } finally {
            if (btnDrill) {
                btnDrill.disabled = false;
                btnDrill.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> AI Khám Phá Sâu`;
            }
        }
    }

    // AI Quét Map Toàn Cảnh (v8.3)
    async function triggerAiWorldScan() {
        loadAiConfig();
        const btnScan = doc.getElementById('lore_btn_ai_scan');
        if (btnScan) {
            btnScan.disabled = true;
            btnScan.classList.add('lore-ai-loading');
            btnScan.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang đọc chat & dựng lưới bản đồ...`;
        }

        try {
            const histObj = extractFullHistoryText(aiConfig.historyCount, aiConfig.historyMaxChars);
            if (!histObj.text || histObj.text.trim().length < 20) {
                alert('Lịch sử cuộc trò chuyện quá ngắn để AI phân tích bản đồ!');
                return;
            }

            const existingStr = mapData.locations.map(l => `- ${l.name} (${l.context_type}): [${(l.subLocations||[]).map(s=>s.name).join(', ')}]`).join('\n');
            let template = aiConfig.customPromptWorldScan || DEFAULT_WORLD_SCAN_PROMPT;
            const prompt = template
                .replace('{{history}}', histObj.text)
                .replace('{{existing_map}}', existingStr || '(Chưa có)');

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

            const win = window.parent || window;
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
                throw new Error('AI không trả về JSON bản đồ hợp lệ! Hãy bấm vào nút [🐞 Debug Request AI] để kiểm tra nguyên nhân.');
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
                        status: item.status || 'Tự do',
                        description: item.description || '',
                        characters: Array.isArray(item.characters) ? item.characters : [],
                        atmosphere: item.atmosphere || 'Bầu không khí bình thường.',
                        secrets: item.secrets || 'Chưa phát hiện bí mật nào.',
                        events: item.events || 'Tình hình ổn định.',
                        connections: item.connections || 'Đường nối nội bộ và ngoại vi.',
                        subLocations: []
                    };
                    mapData.locations.push(hub);
                    addedCount++;
                } else {
                    if (item.description && hub.description.length < item.description.length) hub.description = item.description;
                    if (item.atmosphere) hub.atmosphere = item.atmosphere;
                    if (item.secrets) hub.secrets = item.secrets;
                    if (item.events) hub.events = item.events;
                    if (item.connections) hub.connections = item.connections;
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
                                status: sub.status || 'Khóa riêng tư',
                                description: sub.description || '',
                                characters: Array.isArray(sub.characters) ? sub.characters : [],
                                atmosphere: sub.atmosphere || 'Môi trường bình thường.',
                                secrets: sub.secrets || 'Chưa có bí mật nào.',
                                events: sub.events || 'Tình hình ổn định.',
                                connections: sub.connections || 'Cửa nối nội bộ ra khu chính.'
                            });
                            addedCount++;
                        }
                    });
                }
            });

            saveMapData();
            renderAppGrid();
            alert(`🎉 AI đã xây dựng thành công bản đồ lưới Deep Lore! +${addedCount} khu vực mới.`);
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
                navStack = [];
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
                win.eventSource.on('chat_changed', () => loadMapDataForCurrentChat());
                win.eventSource.on('character_selected', () => loadMapDataForCurrentChat());
            }
        } catch (e) {}
    }

    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
