/**
 * KAIZ Collection - Bản Đồ Thế Giới AI (Universal World Map) - v8.7 Graph & Compact UI/UX (v1.3.0.15)
 * - [🚀 Cải thiện toàn diện UI/UX Thẻ Địa Điểm (`Rich Geographic Cards & Header Badges`)]:
 *   - Thẻ địa điểm có bố cục hiện đại, hiển thị Huy hiệu Phân loại (`Category Pill`), Huy hiệu Mức độ An toàn (`Danger Level Pill`), và Trạng thái truy cập.
 *   - Danh sách nhân vật hiển thị dạng Pill kèm Avatar rực rỡ, dễ bấm, dễ quan sát.
 *   - Tóm tắt mô tả bối cảnh 2 dòng (`loc-desc-snippet`) ngay ngoài card.
 * - [🌐 Đường Nối Liền Thông Minh & Liên Kết Bản Đồ (`Smart Network Roads & Transit Bridges`)]:
 *   - Loại bỏ hoàn toàn đường nối dọc (`road-vertical` / `⦙ NỐI LIỀN ⦙`) thiếu logic giữa các ô không liên quan.
 *   - Thêm `Khung Sơ Đồ Giao Thông Liên Kết` (`lore-network-overview-bar`) ngay trên lưới để theo dõi tổng quan mạng lưới đường nối trong tầng/khu vực.
 *   - Các cổng/lối đi tiếp giáp (`connections`) trong card và trong modal Deep Info tự động nhận diện tên địa điểm liên quan và biến thành Nút Chuyển Nhanh (`smart-transit-link`).
 *   - Hỗ trợ nút `Bật/Ẩn Cầu Nối Lưới` (`window._loreToggleVisualConnectors`) và hiệu ứng chuyển nhanh tới địa điểm (`window._loreQuickJumpToLocation`).
 * - [🔥 Chế độ Sửa trực tiếp trên Modal (`Inline Modal Editor`)]:
 *   - Sửa thông tin nhanh ngay trực tiếp trên Modal Deep Info mà không cần pop-up làm phiền.
 * - Phiên bản: v1.3.0.15
 */

(function () {
    'use strict';

    console.log('[Lore World Map] Đang khởi tạo Bản Đồ Thế Giới v8.7 Graph & Compact UI/UX (v1.3.0.15)...');

    const MODULE_ID = 'lore_world_map_app';
    const MODULE_TITLE = 'Bản Đồ Thế Giới (App Lưới)';
    const STORAGE_PREFIX = 'kaiz_lore_app_map_';
    const AI_CONFIG_KEY = 'kaiz_lore_graph_ai_config';

    // ============ DEFAULT SUPER ANALYTICAL PROMPTS ============
    const DEFAULT_WORLD_SCAN_PROMPT = `Bạn là Kiến Trúc Sư Địa Lý & Tác Giả Thiết Kế Thế Giới Chuyên Sâu (Universal Deep Lore & World Map Architect).
Nhiệm vụ của bạn là đọc kỹ Lịch Sử Trò Chuyện dưới đây, phân tích toàn diện bối cảnh câu chuyện một cách KHÁCH QUAN, CHUẨN XÁC và dựng lên bản đồ các Khu Vực Lớn cùng Phân Khu Tầng Sâu bên trong cùng hệ thống liên kết giao thông một cách logic, chính xác và sống động nhất.

=== LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY ===
{{history}}
==================================

Cấu trúc bản đồ hiện có trong hệ thống:
{{existing_map}}

CÁC YÊU CẦU PHÂN TÍCH CHUYÊN SÂU & THÔNG TIN CHUẨN:
1. HIỂU ĐÚNG THỂ LOẠI & BỐI CẢNH KHÁCH QUAN: Phân tích dựa trên thông tin chuẩn xác trong truyện. KHÔNG áp đặt định kiến Fantasy nếu truyện là Học đường hiện đại, Sci-Fi vũ trụ, Horror tâm linh, hay Slice of Life gia đình. Hãy dùng từ ngữ địa lý chuẩn xác với bối cảnh (VD: Trường học thì có Sân thượng, Phòng y tế, Ký túc xá; Vũ trụ thì có Trạm chỉ huy, Phòng phản ứng core...).
2. TOÀN QUYỀN QUYẾT ĐỊNH PHÂN LOẠI & NHÃN (CATEGORY & TAGS): BẠN HOÀN TOÀN TỰ DO ĐẶT TÊN Phân loại (\`category\`) và Nhãn dán (\`tags\`) chuẩn xác theo công năng và kiến trúc địa điểm, KHÔNG bị gò bó vào bất kỳ khuôn mẫu cố định nào! (VD: "Đô thị sa hoa", "Khu quân sự", "Cấm địa tâm linh", "Phòng bí mật", "Quán bar ngầm"...).
3. HỆ THỐNG LIÊN KẾT GIAO THÔNG CHUẨN XÁC (CONNECTIONS - CỰC KỲ QUAN TRỌNG): Với mỗi địa điểm, hãy xác định rõ hướng đi, lối tiếp giáp và đường thông giao thông tới các địa điểm khác (VD: "Cổng phía Đông nối thẳng tới Chợ Trung Tâm, thang máy phía Bắc đi xuống Hầm Ngầm..."). Hệ thống sẽ tự động vẽ sơ đồ mạng lưới dựa trên mô tả liên kết này!
4. THÔNG TIN ĐA CHIỀU (DEEP LORE INFO): Với mỗi khu vực và phòng ban, tổng hợp chi tiết:
   - "description": Mô tả tổng quan kiến trúc, vai trò lịch sử và vị trí địa lý chuẩn xác của khu vực.
   - "atmosphere": Không gian cảm quan cố định (thời tiết đặc trưng, ánh sáng, mùi hương, tiếng động, nhịp sống tại nơi đó).
   - "secrets": Bí mật, hòm giấu đồ, vật phẩm quan trọng (Loot/Key items), hoặc ghi chép ẩn giấu tại nơi này.
   - "connections": LỐI ĐI & LIÊN KẾT GIAO THÔNG tới các địa điểm khác trong truyện.
   - "status": Trạng thái truy cập hoặc tình trạng kiến trúc ("Tự do ra vào", "Khóa mật mã / Cửa khóa", "Cấm địa / Tuyệt mật", "Đang bị phá hủy"...).
   - "events": Sự kiện lịch sử nổi bật hay biến cố đang diễn ra ngay lúc này tại địa điểm (chỉ điền nếu theo dõi thông tin động).
   - "characters": Danh sách nhân vật đang đứng/hiện diện tại địa điểm lúc này (chỉ điền nếu theo dõi thông tin động).
5. KHÔNG TẠO TRÙNG LẶP: Nếu địa điểm đã có trong danh sách hiện có, hãy bổ sung thông tin cho chuẩn xác hơn hoặc thêm các phân khu con (subLocations) bên trong nó.

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ (Không kèm lời dẫn, không markdown ngoài JSON block) theo đúng định dạng sau:
{
  "locations": [
    {
      "name": "Tên Khu Vực Lớn / Trung Tâm (VD: Trường Trung Học Sakura / Trạm Vũ Trụ Alpha / Đảo Rồng)",
      "category": "Phân loại chính tự do theo đúng bối cảnh truyện (VD: Tông môn / Chiến hạm / Đô thị ngầm / Học viện / Thần điện / Quán bar...)",
      "icon": "Tên class FontAwesome icon phản ánh đúng nhất tính chất địa điểm (VD: fa-school, fa-tree, fa-utensils, fa-shield-halved, fa-landmark, fa-flask, fa-space-shuttle, fa-dungeon, fa-store, fa-hospital, fa-building... BẠN TOÀN QUYỀN QUYẾT ĐỊNH ICON!)",
      "tags": ["Nhãn 1 tự do", "Nhãn 2 tự do", "Nhãn 3"],
      "context_type": "Mô tả loại hình không gian cụ thể",
      "controlled_by": "Tên nhân vật hoặc thế lực CHỦ QUẢN/KIỂM SOÁT nơi này (người sở hữu/cai quản cố định)",
      "status": "Trạng thái truy cập hoặc tình trạng hiện tại",
      "description": "Mô tả tổng quan kiến trúc, vai trò lịch sử và vị trí địa lý của khu vực",
      "atmosphere": "Môi trường, thời tiết, âm thanh, ánh sáng và cảm giác tại khu vực",
      "secrets": "Vật phẩm đặc biệt, bảo vật hoặc bí mật giấu kín tại đây",
      "connections": "Cổng Bắc nối ra Phố Chợ, Hành lang Tây nối tới Khu Nghiên Cứu...",
      "events": "Sự kiện hoặc biến cố đang diễn ra",
      "characters": ["Tên nhân vật A đang đứng/hiện diện tại đây"],
      "subLocations": [
        {
          "name": "Tên Căn Phòng / Phân Khu Nhỏ bên trong (VD: Phòng Ngủ / Thư Viện Tầng 3 / Hầm Ngầm)",
          "category": "Phân loại tập con tự do (VD: Phòng riêng / Hầm ngầm / Gác mái / Kho chứa / Vườn hoa / Phòng thí nghiệm...)",
          "icon": "Tên class FontAwesome icon cho căn phòng/phân khu (VD: fa-door-open, fa-bed, fa-book, fa-key, fa-flask, fa-utensils, fa-computer, fa-couch... BẠN TOÀN QUYỀN QUYẾT ĐỊNH ICON!)",
          "tags": ["Nhãn riêng tư", "Vật phẩm quý"],
          "context_type": "Loại hình căn phòng/phân khu",
          "controlled_by": "Tên nhân vật chủ phòng/quản lý",
          "status": "Khóa riêng tư / Tự do...",
          "description": "Mô tả chi tiết bố trí nội thất và công dụng của phòng/phân khu này",
          "atmosphere": "Môi trường, ánh sáng dịu nhẹ, mùi hương trong phòng...",
          "secrets": "Cuốn nhật ký dưới gối, chìa khóa két sắt giấu sau bức tranh...",
          "connections": "Cửa chính thông ra Hành Lang Tầng 2, cửa sổ nhìn ra Sân Sau...",
          "events": "Biến cố đang diễn ra trong phòng",
          "characters": ["Tên nhân vật đang có mặt trong phòng lúc này"]
        }
      ]
    }
  ]
}

CHÚ Ý QUAN TRỌNG:
- BẠN HOÀN TOÀN TOÀN QUYỀN QUYẾT ĐỊNH PHÂN LOẠI (\`category\`), NHÃN DÁN (\`tags\`), ICON BẢN ĐỒ (\`icon\`) VÀ LIÊN KẾT (\`connections\`)! Hãy sáng tạo tối đa và khách quan theo bối cảnh truyện, tuyệt đối không bị gò bó bởi bất kỳ từ khóa hardcode nào!
- "controlled_by": Là nhân vật hoặc thế lực CHỦ QUẢN, sở hữu, cai quản, kiểm soát địa điểm này (nhân vật có thể là chủ của nhiều nơi cùng lúc).
- "characters": Là DANH SÁCH NHÂN VẬT ĐANG HIỆN DIỆN TẠI ĐÂY LÚC NÀY. Nếu đang ở chế độ bản đồ khách quan tĩnh hoặc không có nhân vật đứng tại đây, hãy để mảng rỗng \`[]\`.`;

    const DEFAULT_DEEP_DRILL_PROMPT = `Bạn là Kiến Trúc Sư Khám Phá Địa Lý Sâu Đa Tầng (Deep Lore N-Layer Drill-Down Architect).
Chúng ta đang muốn KHÁM PHÁ SÂU VÀ DỰNG THÊM CÁC PHÂN KHU CON / CĂN PHÒNG / HẦM NGẦM NẰM BÊN TRONG địa điểm sau một cách KHÁCH QUAN và CHUẨN XÁC:
- Tên địa điểm cha: "{{target_name}}"
- Loại / Bối cảnh: "{{target_type}}"
- Mô tả hiện tại: "{{target_desc}}"
- Bầu không khí (Atmosphere): "{{target_atmo}}"
- Bí mật ẩn (Secrets): "{{target_secrets}}"

=== LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY ===
{{history}}
==================================

NHIỆM VỤ CỦA BẠN:
Hãy sáng tạo và xây dựng 2 đến 4 Phân Khu Con / Căn Phòng / Góc Bí Mật / Hầm Ngầm NẰM BÊN TRONG "{{target_name}}" sao cho chuẩn xác, hợp logic với kiến trúc và cốt truyện để làm sâu sắc thêm trải nghiệm khám phá.
BẠN HOÀN TOÀN TOÀN QUYỀN QUYẾT ĐỊNH PHÂN LOẠI (\`category\`), ICON (\`icon\`), NHÃN DÁN (\`tags\`) VÀ LIÊN KẾT (\`connections\`) cho từng căn phòng/phân khu mới! Không bị giới hạn trong bất kỳ từ khóa cứng nhắc hay hardcode nào! Đặc biệt chú ý mô tả chuẩn lối đi liên kết giữa căn phòng này tới các khu vực bên ngoài (\`connections\`).

CHÚ Ý QUAN TRỌNG VỀ NHÂN VẬT:
- "controlled_by": Là nhân vật chủ phòng, quản lý hoặc thế lực cai quản.
- "characters": Là danh sách nhân vật ĐANG THỰC SỰ HIỆN DIỆN/ĐỨNG TRONG PHÒNG NÀY tại thời điểm hiện tại (nếu phòng trống hoặc ở chế độ bản đồ khách quan, để mảng rỗng \`[]\`).

TRẢ VỀ DUY NHẤT 1 OBJECT JSON HỢP LỆ theo định dạng:
{
  "subLocations": [
    {
      "name": "Tên Căn Phòng / Hầm bí mật / Phân khu bên trong",
      "category": "Phân loại tự do (VD: Phòng riêng / Hầm bí mật / Gác xép / Trung tâm điều khiển / Phòng lab...)",
      "icon": "Tên class FontAwesome icon (VD: fa-door-open, fa-bed, fa-book, fa-key, fa-flask, fa-utensils, fa-computer, fa-couch... BẠN TOÀN QUYỀN QUYẾT ĐỊNH!)",
      "tags": ["Nhãn 1 tự do", "Nhãn 2 tự do"],
      "context_type": "Mô tả công năng phòng/phân khu",
      "controlled_by": "Tên nhân vật chủ phòng/quản lý",
      "status": "Khóa riêng tư / Tự do / Tuyệt mật...",
      "description": "Mô tả công năng, kiến trúc và bố trí trong căn phòng/phân khu này",
      "atmosphere": "Môi trường, ánh sáng, mùi hương, tiếng động tại đây",
      "secrets": "Bí mật, mật thư hoặc vật phẩm quý giá giấu tại đây",
      "connections": "Cửa nối ra phòng chính, lối đi thông gió dẫn ra hiên sau...",
      "events": "Sự kiện hoặc biến cố đang diễn ra trong phòng",
      "characters": ["Tên nhân vật đang có mặt tại đây"]
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
        trackDynamicInfo: true, // Bật/Tắt theo dõi thông tin động (Nhân vật hiện diện, Sự kiện đang diễn ra)
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
                if (aiConfig.trackDynamicInfo === undefined) aiConfig.trackDynamicInfo = true;
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

    function sanitizeLocationsData(list) {
        if (!Array.isArray(list)) return;
        const cleanStr = (s) => {
            if (!s && s !== 0) return '';
            let str = String(s).trim();
            str = str.replace(/^([^\p{L}\p{N}\s\w,.:;!?'"()-]+)(?:\s*\1)+/gu, '$1').trim();
            str = str.replace(/^[🔖🏷️]\s*(?=[^\p{L}\p{N}\s\w,.:;!?'"()-]+)/gu, '').trim();
            return str;
        };
        list.forEach(loc => {
            if (!loc) return;
            if (loc.category && loc.category !== 'major_hub' && loc.category !== 'sub_location') loc.category = cleanStr(loc.category);
            if (loc.danger_level) loc.danger_level = cleanStr(loc.danger_level);
            if (loc.status) loc.status = cleanStr(loc.status);
            if (loc.controlled_by) loc.controlled_by = cleanStr(loc.controlled_by);
            if (loc.context_type) loc.context_type = cleanStr(loc.context_type);
            if (Array.isArray(loc.tags)) {
                loc.tags = loc.tags.map(t => cleanStr(t)).filter(Boolean);
            } else if (typeof loc.tags === 'string' && loc.tags) {
                loc.tags = loc.tags.split(',').map(t => cleanStr(t)).filter(Boolean);
            }
            if (Array.isArray(loc.subLocations) && loc.subLocations.length > 0) {
                sanitizeLocationsData(loc.subLocations);
            }
        });
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
                        sanitizeLocationsData(mapData.locations);
                        updateUI();
                        return;
                    }
                } catch (e) {}
            }

            // Bản đồ mặc định khởi đầu rỗng (locations: []) theo đúng yêu cầu
            mapData = { locations: [] };
            saveMapData();
        }
        sanitizeLocationsData(mapData.locations);
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
                icon: getIconForCategory(h.icon || h.category, h.label || h.name, h.context_type),
                category: h.category || 'major_hub',
                context_type: h.context_type || 'Khu vực',
                danger_level: h.danger_level || 'An toàn',
                controlled_by: h.controlled_by || 'Chung',
                status: h.status || 'Tự do',
                description: h.description || '',
                characters: Array.isArray(h.characters) ? h.characters.filter(Boolean) : (typeof h.characters === 'string' && h.characters ? h.characters.split(',').map(c=>c.trim()).filter(Boolean) : []),
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
                icon: getIconForCategory(s.icon || s.category, s.label || s.name, s.context_type),
                category: s.category || 'sub_location',
                context_type: s.context_type || 'Phân khu',
                danger_level: s.danger_level || 'An toàn',
                controlled_by: s.controlled_by || 'Chung',
                status: s.status || 'Tự do',
                description: s.description || '',
                characters: Array.isArray(s.characters) ? s.characters.filter(Boolean) : (typeof s.characters === 'string' && s.characters ? s.characters.split(',').map(c=>c.trim()).filter(Boolean) : []),
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

        sanitizeLocationsData(locations);
        return { locations };
    }

    function getIconForCategory(cat, name = '', contextType = '') {
        if (!cat) cat = '';
        const cleanCat = String(cat).trim();
        // Nếu AI trả về trực tiếp class FontAwesome (VD: fa-school, fa-utensils, fas fa-book...)
        if (cleanCat.startsWith('fa-') || cleanCat.includes(' fa-')) {
            return cleanCat.replace(/^fas\s+|^far\s+|^fab\s+/i, '').trim();
        }

        const combined = `${cleanCat} ${name} ${contextType}`.toLowerCase();
        
        // Phân tích ngữ nghĩa tự do cho mọi phân loại/nhãn mà AI hoặc người dùng tạo ra
        if (combined.includes('nguy') || combined.includes('cấm') || combined.includes('danger') || combined.includes('quái') || combined.includes('bẫy') || combined.includes('tử')) return 'fa-triangle-exclamation';
        if (combined.includes('trường') || combined.includes('học') || combined.includes('school') || combined.includes('academy') || combined.includes('lớp')) return 'fa-school';
        if (combined.includes('thư viện') || combined.includes('sách') || combined.includes('book') || combined.includes('library') || combined.includes('tài liệu')) return 'fa-book-open';
        if (combined.includes('phòng thí nghiệm') || combined.includes('lab') || combined.includes('nghiên cứu') || combined.includes('science') || combined.includes('hoá học')) return 'fa-flask';
        if (combined.includes('bệnh viện') || combined.includes('y tế') || combined.includes('hospital') || combined.includes('clinic') || combined.includes('thuốc') || combined.includes('xá')) return 'fa-hospital';
        if (combined.includes('ăn') || combined.includes('nhà hàng') || combined.includes('quán') || combined.includes('bếp') || combined.includes('restaurant') || combined.includes('food') || combined.includes('cafe')) return 'fa-utensils';
        if (combined.includes('ngủ') || combined.includes('phòng riêng') || combined.includes('bed') || combined.includes('dorm') || combined.includes('khách sạn') || combined.includes('hotel')) return 'fa-bed';
        if (combined.includes('cửa hàng') || combined.includes('chợ') || combined.includes('shop') || combined.includes('market') || combined.includes('mua') || combined.includes('thương mại')) return 'fa-store';
        if (combined.includes('tông môn') || combined.includes('thần điện') || combined.includes('đền') || combined.includes('chùa') || combined.includes('temple') || combined.includes('shrine') || combined.includes('sanctuary') || combined.includes('thánh')) return 'fa-landmark';
        if (combined.includes('quân') || combined.includes('chiến hạm') || combined.includes('căn cứ') || combined.includes('base') || combined.includes('ship') || combined.includes('pháo') || combined.includes('giáp') || combined.includes('shield')) return 'fa-shield-halved';
        if (combined.includes('vũ trụ') || combined.includes('space') || combined.includes('trạm') || combined.includes('hàng không') || combined.includes('bay')) return 'fa-user-astronaut';
        if (combined.includes('rừng') || combined.includes('cây') || combined.includes('vườn') || combined.includes('tự nhiên') || combined.includes('nature') || combined.includes('tree') || combined.includes('forest') || combined.includes('park')) return 'fa-tree';
        if (combined.includes('hầm') || combined.includes('ngầm') || combined.includes('dungeon') || combined.includes('hang') || combined.includes('lao') || combined.includes('giam')) return 'fa-dungeon';
        if (combined.includes('bí mật') || combined.includes('secret') || combined.includes('kho') || combined.includes('két') || combined.includes('bảo vật') || combined.includes('chìa khóa')) return 'fa-key';
        if (combined.includes('cửa') || combined.includes('hành lang') || combined.includes('lối') || combined.includes('phân khu') || cleanCat === 'sub_location') return 'fa-door-open';
        if (cleanCat === 'major_hub' || combined.includes('tòa nhà') || combined.includes('building') || combined.includes('trung tâm')) return 'fa-building';

        return 'fa-map-location-dot';
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
                min-height: 52px;
                border-bottom: 1px solid rgba(255,255,255,0.12);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 14px;
                flex-shrink: 0;
                background: rgba(10, 15, 28, 0.88);
                gap: 10px;
                z-index: 10;
            }
            .lore-header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
            .lore-header-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
            .lore-btn {
                padding: 6px 12px;
                border-radius: 8px;
                border: none;
                font-weight: 700;
                font-size: 0.83em;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                transition: all 0.15s;
                color: #fff;
                white-space: nowrap;
            }
            .lore-btn-primary { background: linear-gradient(135deg, #2563eb, #7c3aed); box-shadow: 0 3px 10px rgba(124, 58, 237, 0.35); }
            .lore-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 5px 15px rgba(124, 58, 237, 0.55); }
            .lore-btn-success { background: linear-gradient(135deg, #059669, #10b981); }
            .lore-btn-danger { background: linear-gradient(135deg, #e11d48, #f43f5e); }
            .lore-btn-secondary { background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.18); color: #e2e8f0; }
            .lore-btn-secondary:hover { background: rgba(255, 255, 255, 0.18); border-color: rgba(255,255,255,0.35); }
            
            /* ============ MAIN VIEWPORT & INFINITE N-LAYER BREADCRUMB ============ */
            /* ============ FIXED TOP PANEL & MAIN VIEWPORT ============ */
            #lore_fixed_top_panel {
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 6px 14px;
                background: rgba(15, 23, 42, 0.96);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                z-index: 20;
                user-select: none;
            }
            #lore_app_viewport {
                flex: 1 1 0%;
                display: flex;
                flex-direction: column;
                overflow: auto;
                padding: 30px 20px 80px 20px;
                position: relative;
                box-sizing: border-box;
                cursor: grab;
                user-select: none;
            }
            #lore_app_viewport:active {
                cursor: grabbing;
            }
            .lore-breadcrumb {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 6px;
                background: rgba(255,255,255,0.04);
                padding: 6px 12px;
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.1);
                font-size: 0.86em;
                font-weight: bold;
                flex-shrink: 0;
                cursor: default;
            }
            .lore-breadcrumb-btn {
                background: rgba(56, 189, 248, 0.2);
                color: #38bdf8;
                border: 1px solid rgba(56, 189, 248, 0.4);
                padding: 4px 10px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.15s;
                font-size: 0.86em;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            .lore-breadcrumb-btn:hover { background: rgba(56, 189, 248, 0.35); transform: scale(1.02); }
            .lore-breadcrumb-item { cursor: pointer; color: #cbd5e1; padding: 4px 10px; border-radius: 8px; transition: all 0.15s; }
            .lore-breadcrumb-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
            .lore-breadcrumb-item.active { color: #38bdf8; font-weight: 800; cursor: default; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); }

            /* BỐ CỤC GRAPH CANVAS & ĐƯỜNG ĐI CHUẨN NODE GRAPH */
            .lore-grid-container {
                display: flex;
                flex-direction: column;
                gap: 20px;
                min-width: 1040px;
                max-width: 1380px;
                margin: 0 auto;
                padding: 10px 10px 60px 10px;
                transform-origin: top center;
                transition: transform 0.18s ease-out;
            }
            .lore-grid-row {
                display: flex;
                align-items: stretch;
                justify-content: center;
                gap: 12px;
                position: relative;
                width: 100%;
                flex-wrap: nowrap;
            }
            .lore-grid-row > .location-button {
                flex: 1 1 340px;
                min-width: 300px;
                max-width: 440px;
            }
            @media (max-width: 880px) {
                #lore_app_header { flex-direction: column; align-items: stretch; max-height: 42vh; overflow-y: auto; gap: 10px; }
                .lore-header-left { justify-content: space-between; width: 100%; }
                .lore-header-actions { width: 100%; display: flex; flex-wrap: wrap; gap: 6px; }
                .lore-header-actions .lore-btn { flex: 1 1 auto; justify-content: center; }
            }

            .location-button {
                min-height: 210px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                position: relative;
                background: linear-gradient(145deg, rgba(30, 41, 59, 0.94), rgba(15, 23, 42, 0.98));
                border: 2px solid rgba(148, 163, 184, 0.35);
                border-radius: 20px;
                padding: 16px 14px 12px 14px;
                cursor: pointer;
                transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                color: #f8fafc;
                box-shadow: 0 12px 28px rgba(0,0,0,0.6);
                overflow: visible;
                user-select: none;
            }
            .location-button:hover {
                transform: translateY(-5px) scale(1.015);
                border-color: #38bdf8;
                box-shadow: 0 18px 40px rgba(56, 189, 248, 0.28);
                background: linear-gradient(145deg, rgba(30, 41, 59, 0.98), rgba(30, 58, 138, 0.45));
            }
            .location-button.hub-button { border-color: #c084fc; background: linear-gradient(145deg, rgba(46, 16, 101, 0.72), rgba(15, 23, 42, 0.96)); }
            .location-button.hub-button:hover { border-color: #e9d5ff; box-shadow: 0 18px 40px rgba(192, 132, 252, 0.35); }
            .location-button.danger-button { border-color: #fb7185; background: linear-gradient(145deg, rgba(136, 19, 55, 0.72), rgba(15, 23, 42, 0.96)); }
            .location-button.danger-button:hover { border-color: #fca5a5; box-shadow: 0 18px 40px rgba(251, 113, 133, 0.35); }
            
            .location-button.empty-location {
                min-height: 150px;
                background: rgba(15, 23, 42, 0.4);
                border: 2px dashed rgba(148, 163, 184, 0.25);
                color: #64748b;
                cursor: default;
                box-shadow: none;
                justify-content: center;
                align-items: center;
            }
            .location-button.empty-location:hover { transform: none; border-color: rgba(148, 163, 184, 0.25); background: rgba(15, 23, 42, 0.4); box-shadow: none; }

            /* CARD HEADER BADGES & ANNOTATIONS */
            .loc-card-header {
                display: flex;
                align-items: flex-start;
                justify-content: flex-start;
                flex-wrap: wrap;
                gap: 6px;
                width: 100%;
                max-width: 100%;
                margin-bottom: 10px;
                pointer-events: none;
                box-sizing: border-box;
            }
            .badge-pill {
                font-size: 0.75em;
                font-weight: 800;
                padding: 4px 10px;
                border-radius: 14px;
                display: inline-flex;
                align-items: center;
                gap: 5px;
                letter-spacing: 0.3px;
                white-space: normal;
                word-break: break-word;
                overflow-wrap: break-word;
                line-height: 1.35;
                text-align: left;
                max-width: 100%;
                box-sizing: border-box;
            }
            .badge-cat { background: rgba(56, 189, 248, 0.16); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.4); }
            .badge-hub { background: rgba(192, 132, 252, 0.18); color: #e9d5ff; border: 1px solid rgba(192, 132, 252, 0.45); }
            .badge-danger-safe { background: rgba(34, 197, 94, 0.16); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.4); }
            .badge-danger-warn { background: rgba(251, 113, 133, 0.18); color: #fda4af; border: 1px solid rgba(251, 113, 133, 0.45); }
            .badge-status { background: rgba(245, 158, 11, 0.15); color: #fde047; border: 1px solid rgba(245, 158, 11, 0.38); }

            /* CARD BODY */
            .loc-card-body {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
                gap: 6px;
                width: 100%;
                flex: 1;
            }
            .loc-card-body > i { font-size: 32px; color: #38bdf8; filter: drop-shadow(0 0 10px rgba(56,189,248,0.4)); transition: transform 0.2s; margin-bottom: 2px; }
            .location-button.hub-button .loc-card-body > i { color: #c084fc; filter: drop-shadow(0 0 10px rgba(192,132,252,0.4)); }
            .location-button.danger-button .loc-card-body > i { color: #fb7185; filter: drop-shadow(0 0 10px rgba(251,113,133,0.4)); }
            .location-button:hover .loc-card-body > i { transform: scale(1.16); }
            
            .loc-name { font-weight: 800; font-size: 1.12em; line-height: 1.35; color: #f8fafc; pointer-events: none; word-break: break-word; }
            .loc-desc-snippet { font-size: 0.82em; color: #94a3b8; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 95%; pointer-events: none; }

            /* CHARACTER PILLS ON CARD */
            .loc-char-pills {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 6px;
                margin: 4px 0 6px 0;
                pointer-events: auto;
                z-index: 5;
            }
            .loc-char-pill {
                display: flex;
                align-items: center;
                gap: 6px;
                background: rgba(15, 23, 42, 0.85);
                border: 1px solid #38bdf8;
                padding: 2px 9px 2px 3px;
                border-radius: 16px;
                font-size: 0.78em;
                font-weight: 700;
                color: #e0f2fe;
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                cursor: pointer;
                transition: transform 0.18s, border-color 0.18s;
            }
            .loc-char-pill:hover { transform: scale(1.08); border-color: #7dd3fc; }
            .loc-char-avatar { width: 22px; height: 22px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 10px; background: #0284c7; font-weight: bold; flex-shrink: 0; }
            .loc-char-avatar img { width: 100%; height: 100%; object-fit: cover; }

            /* CARD FOOTER & SMART TRANSIT BOX */
            .loc-card-footer {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 12px;
                padding-top: 10px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
            }
            .loc-sub-folder-pill {
                font-size: 0.82em;
                color: #93c5fd;
                background: rgba(59, 130, 246, 0.18);
                padding: 6px 12px;
                border-radius: 10px;
                border: 1px solid rgba(59, 130, 246, 0.45);
                font-weight: bold;
                display: flex;
                align-items: center;
                justify-content: space-between;
                pointer-events: none;
            }
            .loc-transit-box {
                background: rgba(0, 0, 0, 0.42);
                border-radius: 12px;
                padding: 8px 11px;
                border: 1px solid rgba(56, 189, 248, 0.22);
                text-align: left;
                font-size: 0.81em;
                color: #cbd5e1;
                line-height: 1.42;
                pointer-events: auto;
                word-break: break-word;
                overflow-wrap: break-word;
                max-height: 95px;
                overflow-y: auto;
            }
            .loc-transit-header { color: #38bdf8; font-weight: 800; font-size: 0.95em; display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
            .smart-transit-link {
                color: #38bdf8;
                font-weight: 800;
                background: rgba(56, 189, 248, 0.18);
                padding: 1px 6px;
                border-radius: 6px;
                border: 1px solid rgba(56, 189, 248, 0.35);
                cursor: pointer;
                transition: all 0.18s;
                display: inline-block;
                margin: 2px 0;
            }
            .smart-transit-link:hover { background: #38bdf8; color: #0f172a; transform: scale(1.04); }

            /* SMART ROAD CONNECTORS & NETWORK OVERVIEW */
            .lore-network-overview-bar {
                background: rgba(30, 41, 59, 0.75);
                border: 1px solid rgba(56, 189, 248, 0.25);
                border-radius: 10px;
                padding: 6px 12px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 8px;
                color: #e0f2fe;
                font-size: 0.85em;
            }
            .smart-road-h-cell {
                display: flex;
                align-items: center;
                justify-content: center;
                flex: 0 0 auto;
                padding: 0 4px;
                z-index: 5;
            }
            .smart-road-h-badge {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                box-shadow: 0 0 16px rgba(56,189,248,0.3);
                transition: all 0.2s;
                cursor: help;
                flex-shrink: 0;
            }
            .smart-road-h-badge:hover {
                transform: scale(1.2);
                background: #38bdf8;
                color: #0f172a;
                box-shadow: 0 0 24px rgba(56,189,248,0.9);
            }
            .smart-road-v {
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                margin: 8px 0;
                color: #38bdf8;
                font-size: 0.85em;
                font-weight: 800;
            }
            .smart-road-v .road-line { flex: 1; height: 2px; background: linear-gradient(90deg, transparent, rgba(56,189,248,0.55), transparent); }
            .smart-road-v .road-pill {
                background: rgba(15, 23, 42, 0.95);
                border: 1px solid rgba(56, 189, 248, 0.55);
                padding: 6px 16px;
                border-radius: 20px;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.6);
                color: #7dd3fc;
                letter-spacing: 0.5px;
            }
            /* GRAPH CONTROLS BAR INSIDE TOP PANEL */
            .lore-graph-controls {
                position: static;
                display: flex;
                align-items: center;
                gap: 5px;
                flex-wrap: wrap;
                background: rgba(15, 23, 42, 0.88);
                border: 1px solid rgba(56, 189, 248, 0.38);
                padding: 4px 8px;
                border-radius: 28px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.55);
                backdrop-filter: blur(8px);
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .lore-graph-controls:hover {
                border-color: #38bdf8;
                box-shadow: 0 6px 20px rgba(56, 189, 248, 0.25);
            }
            /* DEDICATED FLOATING 2D ZOOM & PAN TOOLBAR */
            .lore-zoom-pan-bar {
                position: absolute;
                bottom: 24px;
                right: 28px;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 6px;
                background: rgba(15, 23, 42, 0.94);
                border: 1px solid rgba(56, 189, 248, 0.45);
                border-radius: 28px;
                padding: 6px 14px;
                box-shadow: 0 10px 32px rgba(0, 0, 0, 0.85), 0 0 15px rgba(56, 189, 248, 0.18);
                backdrop-filter: blur(12px);
                user-select: none;
                transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .lore-zoom-pan-bar:hover {
                border-color: #38bdf8;
                box-shadow: 0 12px 36px rgba(0, 0, 0, 0.9), 0 0 22px rgba(56, 189, 248, 0.3);
            }
            #lore_app_viewport * {
                user-select: none !important;
                -webkit-user-drag: none !important;
            }
            .lore-graph-btn {
                background: rgba(255,255,255,0.08);
                border: 1px solid rgba(255,255,255,0.18);
                color: #e2e8f0;
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 0.82em;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.15s;
                display: inline-flex;
                align-items: center;
                gap: 5px;
            }
            .lore-graph-btn:hover {
                background: rgba(56,189,248,0.25);
                border-color: #38bdf8;
                color: #fff;
                transform: translateY(-1px);
            }
            .lore-graph-btn.active {
                background: linear-gradient(135deg, #0284c7, #2563eb);
                border-color: #7dd3fc;
                color: #fff;
                box-shadow: 0 0 12px rgba(56,189,248,0.5);
            }
            .lore-zone-divider {
                grid-column: 1 / -1;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 10px 0;
                color: #64748b;
                font-size: 0.8em;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 2px;
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

    // Biến trạng thái Graph 2D Zoom & Drag
    let loreGraphZoomLevel = 1.0;
    let loreGraphDragEnabled = true;
    let loreIsDraggingGraph = false;
    let loreDragStartX = 0;
    let loreDragStartY = 0;
    let loreScrollLeftStart = 0;
    let loreScrollTopStart = 0;

    window._loreGraphZoom = function(delta) {
        loreGraphZoomLevel = Math.max(0.4, Math.min(2.2, Number((loreGraphZoomLevel + delta).toFixed(2))));
        const grid = doc.getElementById('lore_grid_container');
        const label = doc.getElementById('lore_graph_zoom_label');
        if (grid) {
            // Sử dụng zoom thay cho scale để trình duyệt tự căn lại chính xác kích thước scrollWidth/scrollHeight không bị rìa vô hình chặn cắt
            if ('zoom' in grid.style) {
                grid.style.zoom = loreGraphZoomLevel;
                grid.style.transform = 'none';
            } else {
                grid.style.transform = `scale(${loreGraphZoomLevel})`;
                grid.style.transformOrigin = 'top left';
            }
        }
        if (label) label.innerText = `${Math.round(loreGraphZoomLevel * 100)}%`;
    };

    window._loreGraphReset = function() {
        loreGraphZoomLevel = 1.0;
        const grid = doc.getElementById('lore_grid_container');
        const label = doc.getElementById('lore_graph_zoom_label');
        if (grid) {
            if ('zoom' in grid.style) grid.style.zoom = '1';
            grid.style.transform = 'none';
        }
        if (label) label.innerText = `100%`;
    };

    window._loreToggleGraphDrag = function() {
        loreGraphDragEnabled = !loreGraphDragEnabled;
        const btn = doc.getElementById('lore_btn_graph_drag');
        const viewport = doc.getElementById('lore_app_viewport');
        if (btn) btn.classList.toggle('active', loreGraphDragEnabled);
        if (viewport) viewport.style.cursor = loreGraphDragEnabled ? 'grab' : 'default';
    };

    window._loreToggleDynamicTracking = function() {
        loadAiConfig();
        aiConfig.trackDynamicInfo = !aiConfig.trackDynamicInfo;
        saveAiConfig();
        updateUI();
        renderAppGrid();
    };

    let loreDidPanDuringDrag = false;

    function attachGraphPanListeners(overlay) {
        const viewport = overlay.querySelector('#lore_app_viewport');
        if (!viewport) return;

        viewport.addEventListener('dragstart', (e) => {
            if (loreGraphDragEnabled && !e.target.closest('input, textarea')) e.preventDefault();
        });

        viewport.addEventListener('mousedown', (e) => {
            if (!loreGraphDragEnabled || e.button !== 0) return;
            // Cho phép kéo thả trực tiếp trên cả nút địa điểm (.location-button), chỉ loại bỏ các thành phần nhập liệu hoặc nút bấm riêng lẻ
            if (e.target.closest('button, input, textarea, select, a, .smart-transit-link, #lore_location_detail_box, .lore-graph-controls, .lore-zoom-pan-bar')) return;
            loreIsDraggingGraph = true;
            loreDidPanDuringDrag = false;
            loreDragStartX = e.clientX;
            loreDragStartY = e.clientY;
            loreScrollLeftStart = viewport.scrollLeft;
            loreScrollTopStart = viewport.scrollTop;
            viewport.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!loreIsDraggingGraph || !loreGraphDragEnabled) return;
            const dx = e.clientX - loreDragStartX;
            const dy = e.clientY - loreDragStartY;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4 || loreDidPanDuringDrag) {
                loreDidPanDuringDrag = true;
                e.preventDefault();
                viewport.scrollLeft = loreScrollLeftStart - dx;
                viewport.scrollTop = loreScrollTopStart - dy;
            }
        });

        window.addEventListener('mouseup', () => {
            if (loreIsDraggingGraph) {
                loreIsDraggingGraph = false;
                if (loreGraphDragEnabled && viewport) viewport.style.cursor = 'grab';
                if (loreDidPanDuringDrag) {
                    setTimeout(() => { loreDidPanDuringDrag = false; }, 150);
                }
            }
        });

        viewport.addEventListener('wheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                window._loreGraphZoom(e.deltaY < 0 ? 0.08 : -0.08);
            }
        }, { passive: false });
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
                        <div style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #38bdf8, #818cf8); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 2px 10px rgba(56,189,248,0.4); flex-shrink: 0;">
                            ${SVG_GLOBE_ICON}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-weight: 800; font-size: 1.08em; color: #f8fafc;">BẢN ĐỒ THẾ GIỚI</span>
                            <span style="font-size: 0.76em; color: #38bdf8; background: rgba(56,189,248,0.14); padding: 2px 8px; border-radius: 8px; border: 1px solid rgba(56,189,248,0.28); font-weight: 700;">v8.7 Graph</span>
                            <span id="lore_stats_badge" style="background: rgba(56,189,248,0.16); color: #38bdf8; font-size: 0.76em; font-weight: 700; padding: 2px 8px; border-radius: 8px; border: 1px solid rgba(56,189,248,0.3);">0 khu vực</span>
                            <span id="lore_ai_badge" style="background: rgba(168,85,247,0.16); color: #c084fc; font-size: 0.76em; font-weight: 700; padding: 2px 8px; border-radius: 8px; border: 1px solid rgba(168,85,247,0.3); cursor: pointer;" title="Nhấp để cấu hình AI">🤖 Nguồn AI</span>
                            <span id="lore_chat_status" style="font-size: 0.76em; color: #94a3b8; background: rgba(255,255,255,0.04); padding: 2px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">💬 Chat: <span style="color: #c084fc;">...</span></span>
                        </div>
                    </div>

                    <div class="lore-header-actions">
                        <button id="lore_btn_ai_scan" class="lore-btn lore-btn-primary" title="AI quét lịch sử chat dựng bản đồ chính xác theo bối cảnh">
                            <i class="fa-solid fa-wand-magic-sparkles"></i> AI Quét Map
                        </button>

                        <button id="lore_btn_add_location" class="lore-btn lore-btn-secondary" title="Thêm địa điểm vào lớp hiện tại">
                            <i class="fa-solid fa-plus"></i> Thêm Địa Điểm
                        </button>

                        <button id="lore_btn_saved_maps" class="lore-btn lore-btn-secondary" title="Kiểm tra & Xóa nhanh các bản đồ / chat đang lưu">
                            <i class="fa-solid fa-folder-tree"></i> Map Lưu
                        </button>

                        <button id="lore_btn_ai_settings" class="lore-btn lore-btn-secondary" title="Cấu hình AI & Chỉnh sửa Prompt tùy biến">
                            <i class="fa-solid fa-gear"></i> Cấu hình AI
                        </button>

                        <button id="lore_btn_ai_debug" class="lore-btn" style="background: rgba(168,85,247,0.18); border: 1px solid rgba(192,132,252,0.4); color: #e9d5ff; padding: 6px 10px;" title="Kiểm tra chính xác những gì gửi cho AI và lý do bị lẹm history">
                            <i class="fa-solid fa-bug"></i> Debug
                        </button>

                        <button id="lore_btn_close_app" class="lore-btn" style="background: rgba(239,68,68,0.22); border: 1px solid rgba(239,68,68,0.45); color: #f87171; padding: 6px 12px; font-size: 1.05em;" title="Đóng bản đồ">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Fixed Top Panel (Cố định hoàn toàn khi cuộn/kéo bản đồ 2D) -->
                <div id="lore_fixed_top_panel">
                    <!-- Instruction Banner Chuột Trái / Chuột Phải siêu gọn -->
                    <div id="lore_instruction_banner" style="background: rgba(15, 23, 42, 0.75); border: 1px solid rgba(56,189,248,0.2); border-radius: 8px; padding: 3px 10px; font-size: 0.78em; color: #94a3b8; display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                        <div>💡 <b style="color:#e2e8f0;">Điều khiển:</b> <span style="color:#38bdf8; font-weight:600;">Chuột Trái</span> vào địa điểm để đi sâu bên trong <span style="color:#475569;">|</span> <span style="color:#38bdf8; font-weight:600;">Chuột Phải</span> để xem chi tiết & chỉnh sửa <span style="color:#475569;">|</span> <span style="color:#38bdf8; font-weight:600;">Kéo thẻ</span> hoặc dùng con trỏ để di chuyển bản đồ 2D.</div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="color: #34d399; font-weight: 600;"><i class="fa-solid fa-cloud-arrow-up"></i> Lưu tự động</span>
                            <span style="cursor: pointer; color: #64748b; font-weight: bold; padding: 1px 6px; border-radius: 4px; background: rgba(255,255,255,0.05); transition: all 0.15s;" onclick="this.parentElement.parentElement.style.display='none'" title="Ẩn thanh hướng dẫn để mở rộng không gian">✕ Ẩn</span>
                        </div>
                    </div>

                    <!-- Top Navigation and Dynamic Action Bar -->
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; width: 100%;">
                        <div style="display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 200px;">
                            <!-- Dynamic Infinite Breadcrumb Bar -->
                            <div id="lore_breadcrumb_container" class="lore-breadcrumb" style="display: none; margin: 0;">
                                <button id="btn_back_parent" class="lore-breadcrumb-btn"><i class="fa-solid fa-arrow-left"></i> Lùi 1 lớp</button>
                                <div id="breadcrumb_path_list" style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-left: 6px;"></div>
                            </div>
                            <!-- Smart Roadmap & Inter-connection Overview Bar -->
                            <div id="lore_smart_roadmap_bar" style="display: none; margin: 0;"></div>
                        </div>

                        <!-- Nút Bật/Tắt chế độ theo dõi thông tin động (Nhân vật hiện diện, Sự kiện...) -->
                        <div class="lore-graph-controls" style="position: static; margin-left: auto;">
                            <button class="lore-graph-btn active" id="lore_btn_track_dynamic" onclick="window._loreToggleDynamicTracking()" style="padding: 6px 14px; font-size: 0.88em; border-radius: 20px;" title="Bật/Tắt chế độ theo dõi thông tin động (Nhân vật hiện diện, Sự kiện đang diễn ra...). Khi TẮT, AI và bản đồ chỉ tập trung vào thông tin địa lý, kiến trúc khách quan và liên kết giao thông chuẩn."><i class="fa-solid fa-bolt-lightning"></i> <span id="lore_label_track_dynamic">Thông tin động: BẬT</span></button>
                        </div>
                    </div>
                </div>

                <!-- Viewport (Chỉ chứa lưới đồ thị 2D) -->
                <div id="lore_app_viewport">
                    <!-- Thanh riêng: Điều khiển Zoom & Pan 2D (Floating 2D Navigation Bar) -->
                    <div id="lore_zoom_pan_bar" class="lore-zoom-pan-bar">
                        <button class="lore-graph-btn" onclick="window._loreGraphZoom(0.1)" title="Phóng to bản đồ 2D (Zoom In)"><i class="fa-solid fa-plus"></i></button>
                        <button class="lore-graph-btn" onclick="window._loreGraphReset()" title="Đặt lại kích thước 100% (Reset Zoom)"><span id="lore_graph_zoom_label">100%</span></button>
                        <button class="lore-graph-btn" onclick="window._loreGraphZoom(-0.1)" title="Thu nhỏ bản đồ 2D (Zoom Out)"><i class="fa-solid fa-minus"></i></button>
                        <div style="width: 1px; height: 18px; background: rgba(255,255,255,0.18); margin: 0 3px;"></div>
                        <button class="lore-graph-btn active" id="lore_btn_graph_drag" onclick="window._loreToggleGraphDrag()" title="Bật/Tắt chế độ con trỏ kéo bản đồ 2D (Drag to Pan)"><i class="fa-solid fa-hand"></i> Kéo 2D</button>
                    </div>

                    <!-- Lưới Địa Điểm & Đường Đi -->
                    <div id="lore_grid_container" class="lore-grid-container">
                        <!-- Nạp động -->
                    </div>
                </div>
                </div>
            </div>

            <!-- MODAL CHI TIẾT ĐỊA ĐIỂM (DEEP INFO POPUP - Mở bằng Chuột Phải) -->
            <div id="lore_location_detail_modal">
                <div id="lore_location_detail_box">
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                            <i id="det_icon" class="fas fa-building" style="font-size: 1.6em; color: #38bdf8;"></i>
                            <span id="det_name" style="font-size: 1.35em; font-weight: 800; color: #f8fafc;">Tên địa điểm</span>
                            <input id="edit_det_name" class="lore-input" style="display: none; font-size: 1.2em; font-weight: 800; width: 80%; max-width: 450px;" placeholder="Tên địa điểm..." />
                        </div>
                        <span id="det_close" style="cursor: pointer; color: #f87171; font-size: 1.3em; padding: 4px 8px;">✕</span>
                    </div>

                    <!-- Badges (View Mode) -->
                    <div id="det_view_badges" style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <span id="det_category_badge" style="padding: 5px 12px; border-radius: 8px; background: rgba(168,85,247,0.2); color: #d8b4fe; font-size: 0.84em; font-weight: bold; border: 1px solid rgba(168,85,247,0.4);">Khu vực lớn</span>
                        <span id="det_status_badge" style="padding: 5px 12px; border-radius: 8px; background: rgba(245,158,11,0.2); color: #fcd34d; font-size: 0.84em; font-weight: bold; border: 1px solid rgba(245,158,11,0.4);">Tự do</span>
                        <span id="det_type_badge" style="padding: 5px 12px; border-radius: 8px; background: rgba(59,130,246,0.2); color: #93c5fd; font-size: 0.84em; font-weight: bold; border: 1px solid rgba(59,130,246,0.4);">Khu vực</span>
                    </div>

                    <!-- Badges Edit Form (Edit Mode) -->
                    <div id="det_edit_badges" style="display: none; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; background: rgba(0,0,0,0.35); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15);">
                        <div>
                            <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold;">Cấp độ (Category)</label>
                            <input id="edit_det_category" class="lore-input" style="width: 100%; margin-top: 4px;" placeholder="VD: major_hub, Biệt thự, Căn phòng..." />
                        </div>
                        <div>
                            <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold;">Nhãn dán (Tags)</label>
                            <input id="edit_det_tags" class="lore-input" style="width: 100%; margin-top: 4px;" placeholder="VD: Nhãn 1, Quý hiếm, Cấm địa..." />
                        </div>
                        <div>
                            <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold;">Loại hình (Context Type)</label>
                            <input id="edit_det_type" class="lore-input" style="width: 100%; margin-top: 4px;" placeholder="VD: Sân thượng, Phòng thí nghiệm..." />
                        </div>
                        <div>
                            <label style="font-size: 0.78em; color: #94a3b8; font-weight: bold;">Trạng thái (Status)</label>
                            <input id="edit_det_status" class="lore-input" style="width: 100%; margin-top: 4px;" placeholder="VD: Tự do / Khóa mật mã..." />
                        </div>
                    </div>

                    <!-- DEEP INFO SECTIONS & CONNECTIONS -->
                    <div class="deep-info-card" style="background: rgba(56,189,248,0.08); border-color: rgba(56,189,248,0.3);">
                        <div class="deep-info-title" style="color: #38bdf8;"><i class="fa-solid fa-user-check"></i> Nhân vật hiện diện (Đang có mặt tại đây)</div>
                        <div id="det_characters" class="deep-info-text" style="color: #7dd3fc; font-weight: bold;">Chưa có nhân vật nào ở đây</div>
                        <input id="edit_det_characters" class="lore-input" style="display: none; width: 100%; margin-top: 6px; font-weight: bold; color: #38bdf8;" placeholder="Nhập tên nhân vật đang có mặt lúc này (cách nhau dấu phẩy ,)..." />
                    </div>

                    <div class="deep-info-card" style="background: rgba(168,85,247,0.08); border-color: rgba(168,85,247,0.3);">
                        <div class="deep-info-title" style="color: #c084fc;"><i class="fa-solid fa-shield-halved"></i> Nhân vật kiểm soát / Thế lực chủ quản</div>
                        <div id="det_controlled_by" class="deep-info-text" style="color: #e9d5ff; font-weight: bold;">Chung / Tự do</div>
                        <input id="edit_det_controlled_by" class="lore-input" style="display: none; width: 100%; margin-top: 6px; font-weight: bold; color: #c084fc;" placeholder="Nhập tên nhân vật/thế lực sở hữu, quản lý khu vực này..." />
                    </div>

                    <div class="deep-info-card">
                        <div class="deep-info-title"><i class="fa-solid fa-scroll"></i> Mô tả chi tiết vai trò & Cảnh quan</div>
                        <div id="det_description" class="deep-info-text" style="white-space: pre-wrap;">Không có mô tả.</div>
                        <textarea id="edit_det_description" class="lore-input" style="display: none; width: 100%; height: 95px; box-sizing: border-box; margin-top: 6px; line-height: 1.4;" placeholder="Mô tả công năng, kiến trúc và vai trò..."></textarea>
                    </div>

                    <div class="deep-info-card" style="background: rgba(56,189,248,0.06); border-color: rgba(56,189,248,0.25);">
                        <div class="deep-info-title" style="color: #38bdf8;"><i class="fa-solid fa-route"></i> Cổng Kết Nối & Lối Đi Giao Thông Liên Vùng (Connections)</div>
                        <div id="det_connections" class="deep-info-text" style="color: #7dd3fc; font-weight: 600;">Đường nối nội bộ, chưa rõ lối ra tiếp theo.</div>
                        <textarea id="edit_det_connections" class="lore-input" style="display: none; width: 100%; height: 70px; box-sizing: border-box; margin-top: 6px; color: #7dd3fc; line-height: 1.4;" placeholder="Mô tả cổng kết nối, thang máy, hành lang dẫn tới khu vực nào..."></textarea>
                    </div>

                    <div class="deep-info-card">
                        <div class="deep-info-title"><i class="fa-solid fa-cloud-sun"></i> Môi trường & Bầu không khí (Atmosphere)</div>
                        <div id="det_atmosphere" class="deep-info-text" style="color: #a7f3d0;">Bình thường, yên tĩnh.</div>
                        <textarea id="edit_det_atmosphere" class="lore-input" style="display: none; width: 100%; height: 70px; box-sizing: border-box; margin-top: 6px; color: #a7f3d0; line-height: 1.4;" placeholder="Môi trường, thời tiết, âm thanh, mùi hương..."></textarea>
                    </div>

                    <div class="deep-info-card">
                        <div class="deep-info-title"><i class="fa-solid fa-gem"></i> Bí mật / Vật phẩm / Tài nguyên ẩn (Secrets & Loot)</div>
                        <div id="det_secrets" class="deep-info-text" style="color: #fde047;">Chưa phát hiện bí mật hay vật phẩm đặc biệt.</div>
                        <textarea id="edit_det_secrets" class="lore-input" style="display: none; width: 100%; height: 70px; box-sizing: border-box; margin-top: 6px; color: #fde047; line-height: 1.4;" placeholder="Bí mật, mật thư hoặc vật phẩm quan trọng giấu tại đây..."></textarea>
                    </div>

                    <div class="deep-info-card">
                        <div class="deep-info-title"><i class="fa-solid fa-bolt-lightning"></i> Sự kiện hoặc Biến cố đang diễn ra (Active Events)</div>
                        <div id="det_events" class="deep-info-text" style="color: #fca5a5;">Không có biến cố nào.</div>
                        <textarea id="edit_det_events" class="lore-input" style="display: none; width: 100%; height: 70px; box-sizing: border-box; margin-top: 6px; color: #fca5a5; line-height: 1.4;" placeholder="Sự kiện, biến cố hoặc xung đột đang diễn ra..."></textarea>
                    </div>

                    <!-- ACTIONS BAR (View Mode) -->
                    <div id="det_view_actions" style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; justify-content: space-between; align-items: center;">
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

                    <!-- ACTIONS BAR (Edit Mode) -->
                    <div id="det_edit_actions" style="display: none; gap: 12px; margin-top: 8px; justify-content: flex-end; align-items: center; border-top: 1px solid rgba(255,255,255,0.12); padding-top: 14px;">
                        <button id="det_btn_cancel_edit" class="lore-btn lore-btn-secondary" style="padding: 10px 20px; font-size: 0.95em;">
                            <i class="fa-solid fa-xmark"></i> Hủy Bỏ
                        </button>
                        <button id="det_btn_save_edit" class="lore-btn lore-btn-success" style="padding: 10px 24px; font-size: 0.98em; font-weight: 800; box-shadow: 0 0 15px rgba(34,197,94,0.4);">
                            <i class="fa-solid fa-floppy-disk"></i> Lưu Thay Đổi
                        </button>
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
        attachGraphPanListeners(overlay);

        overlay.querySelector('#lore_btn_close_app').addEventListener('click', () => {
            overlay.style.display = 'none';
            doc.body.style.overflow = '';
            if (doc.documentElement) doc.documentElement.style.overflow = '';
        });
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
            const controlled = prompt('Nhân vật hoặc thế lực CHỦ QUẢN/KIỂM SOÁT nơi này:', 'Chung') || 'Chung';
            const presentChars = prompt('Nhân vật đang HIỆN DIỆN (đứng tại đây) lúc này (cách nhau dấu phẩy , nếu trống để trống):', '') || '';
            const desc = prompt('Mô tả chi tiết hoặc sự kiện diễn ra tại đây:', 'Một địa điểm vừa được thêm vào bản đồ.') || '';
            const connections = prompt('Cổng kết nối / Lối đi liên kết tới các khu vực khác:', 'Đường nối nội bộ, thang máy hay hành lang...') || 'Lối đi thông ra xung quanh.';
            const atmo = prompt('Môi trường & Bầu không khí (Atmosphere):', 'Không gian yên tĩnh, ánh sáng dịu nhẹ.') || 'Bình thường';
            const secrets = prompt('Bí mật / Vật phẩm / Tài nguyên ẩn (Secrets & Loot):', 'Chưa có thông tin bí mật.') || 'Chưa phát hiện bí mật nào';

            const newLoc = {
                id: (currentParent ? 'sub_' : 'loc_') + Date.now(),
                icon: getIconForCategory(contextType.trim(), name.trim(), contextType.trim()),
                category: contextType.trim() || (currentParent ? 'sub_location' : 'major_hub'),
                tags: [],
                context_type: contextType.trim(),
                danger_level: danger.trim(),
                controlled_by: controlled.trim(),
                status: 'Tự do ra vào',
                description: desc.trim(),
                characters: presentChars ? presentChars.split(',').map(c => c.trim()).filter(Boolean) : [],
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
            if (!selectedDetailLocation || typeof window._loreToggleDetailEditMode !== 'function') return;
            window._loreToggleDetailEditMode(true);
        });

        overlay.querySelector('#det_btn_cancel_edit').addEventListener('click', () => {
            if (typeof window._loreToggleDetailEditMode === 'function') window._loreToggleDetailEditMode(false);
        });

        overlay.querySelector('#det_btn_save_edit').addEventListener('click', () => {
            if (!selectedDetailLocation) return;
            const detBox = doc.getElementById('lore_location_detail_box');
            if (!detBox) return;

            const newName = detBox.querySelector('#edit_det_name')?.value?.trim();
            if (newName) selectedDetailLocation.name = newName;

            const newCat = detBox.querySelector('#edit_det_category')?.value?.trim();
            if (newCat) {
                selectedDetailLocation.category = newCat;
                selectedDetailLocation.icon = getIconForCategory(newCat, selectedDetailLocation.name, selectedDetailLocation.context_type);
            }
            const tagsRaw = detBox.querySelector('#edit_det_tags')?.value?.trim() || '';
            selectedDetailLocation.tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

            selectedDetailLocation.context_type = detBox.querySelector('#edit_det_type')?.value?.trim() || 'Khu vực';
            selectedDetailLocation.danger_level = detBox.querySelector('#edit_det_danger')?.value?.trim() || 'An toàn';
            selectedDetailLocation.status = detBox.querySelector('#edit_det_status')?.value?.trim() || 'Tự do';

            if (aiConfig.trackDynamicInfo !== false) {
                const charsRaw = detBox.querySelector('#edit_det_characters')?.value?.trim() || '';
                selectedDetailLocation.characters = charsRaw ? charsRaw.split(',').map(c => c.trim()).filter(Boolean) : [];
            }

            const controlledRaw = detBox.querySelector('#edit_det_controlled_by')?.value?.trim() || '';
            selectedDetailLocation.controlled_by = controlledRaw || 'Chung';

            selectedDetailLocation.description = detBox.querySelector('#edit_det_description')?.value?.trim() || '';
            selectedDetailLocation.connections = detBox.querySelector('#edit_det_connections')?.value?.trim() || '';
            selectedDetailLocation.atmosphere = detBox.querySelector('#edit_det_atmosphere')?.value?.trim() || '';
            selectedDetailLocation.secrets = detBox.querySelector('#edit_det_secrets')?.value?.trim() || '';
            if (aiConfig.trackDynamicInfo !== false) {
                selectedDetailLocation.events = detBox.querySelector('#edit_det_events')?.value?.trim() || '';
            }

            saveMapData();
            if (typeof window._loreToggleDetailEditMode === 'function') window._loreToggleDetailEditMode(false);
            window._loreShowDetail(selectedDetailLocation.id);
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

    function getAllLocationsFlattened(locList, out = []) {
        if (!Array.isArray(locList)) return out;
        locList.forEach(l => {
            if (l) out.push(l);
            if (Array.isArray(l.subLocations)) getAllLocationsFlattened(l.subLocations, out);
        });
        return out;
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
        
        navStack.forEach((item, idx) => {
            html += `<span style="color: #64748b; font-weight: bold;">/</span>`;
            if (idx === navStack.length - 1) {
                html += `<span class="lore-breadcrumb-item active">📍 ${item.name}</span>`;
            } else {
                html += `<span class="lore-breadcrumb-item" onclick="window._loreNavJump(${idx})">${item.name}</span>`;
            }
        });

        pathList.innerHTML = html;
    }

    function getAggregatedCharactersInfo(loc) {
        if (!loc) return [];
        let mapByChar = new Map();

        if (Array.isArray(loc.characters)) {
            loc.characters.forEach(c => {
                if (c && typeof c === 'string' && c.trim()) {
                    const name = c.trim();
                    mapByChar.set(name.toLowerCase(), { charName: name, locationName: loc.name || 'Trực tiếp tại đây', isDirect: true });
                }
            });
        }

        function traverse(subList, parentName) {
            if (!Array.isArray(subList)) return;
            subList.forEach(sub => {
                if (!sub) return;
                if (Array.isArray(sub.characters)) {
                    sub.characters.forEach(c => {
                        if (c && typeof c === 'string' && c.trim()) {
                            const name = c.trim();
                            mapByChar.set(name.toLowerCase(), { charName: name, locationName: sub.name || parentName, isDirect: false });
                        }
                    });
                }
                if (Array.isArray(sub.subLocations) && sub.subLocations.length > 0) {
                    traverse(sub.subLocations, sub.name);
                }
            });
        }
        traverse(loc.subLocations, loc.name);

        return Array.from(mapByChar.values());
    }

    window._loreNavJump = function (stackIdx) {
        if (stackIdx === -1) {
            navStack = [];
        } else if (stackIdx >= 0 && stackIdx < navStack.length - 1) {
            navStack = navStack.slice(0, stackIdx + 1);
        }
        renderAppGrid();
    };

    window._loreHideRoads = false;
    window._loreToggleVisualConnectors = function() {
        window._loreHideRoads = !window._loreHideRoads;
        renderAppGrid();
    };

    window._loreQuickJumpToLocation = function(event, targetId) {
        if (event && event.stopPropagation) event.stopPropagation();
        const grid = doc.getElementById('lore_grid_container');
        const viewport = doc.getElementById('lore_app_viewport');
        if (!grid || !viewport) return;
        const targetElem = grid.querySelector(`[data-loc-id="${targetId}"]`);
        if (targetElem) {
            // Cuộn hoàn toàn cục bộ bên trong #lore_app_viewport để không làm nhảy hay đẩy lệch cấu trúc web SillyTavern
            const vpRect = viewport.getBoundingClientRect();
            const elemRect = targetElem.getBoundingClientRect();
            const targetLeft = viewport.scrollLeft + (elemRect.left - vpRect.left) - (vpRect.width / 2) + (elemRect.width / 2);
            const targetTop = viewport.scrollTop + (elemRect.top - vpRect.top) - (vpRect.height / 2) + (elemRect.height / 2);

            viewport.scrollTo({
                left: targetLeft,
                top: targetTop,
                behavior: 'smooth'
            });

            targetElem.style.transition = 'box-shadow 0.3s, transform 0.3s';
            targetElem.style.boxShadow = '0 0 38px rgba(56, 189, 248, 0.95)';
            targetElem.style.transform = 'scale(1.04)';
            setTimeout(() => {
                targetElem.style.boxShadow = '';
                targetElem.style.transform = '';
            }, 1800);
        } else {
            window._loreShowDetail(targetId);
        }
    };

    function formatSmartTransit(connText, allLocs, currentLocId) {
        if (!connText || connText.trim() === '' || connText.toLowerCase().includes('chưa có') || connText.toLowerCase().includes('không có')) {
            return `<span style="color: #64748b; font-style: italic;">Chưa ghi nhận cổng nối tiếp giáp cụ thể.</span>`;
        }
        let formatted = connText;
        const allGlobalLocs = getAllLocationsFlattened(mapData.locations || []);
        
        // Sắp xếp tên dài trước để tránh match tên ngắn nằm bên trong tên dài
        const validTargets = allGlobalLocs
            .filter(l => l && l.id !== currentLocId && l.name && l.name.trim().length > 2)
            .sort((a, b) => b.name.trim().length - a.name.trim().length);

        const linkReplacements = [];
        validTargets.forEach(otherLoc => {
            const cleanName = otherLoc.name.trim();
            const reg = new RegExp(`(${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            if (reg.test(formatted)) {
                const placeholder = `__LORE_LINK_${linkReplacements.length}__`;
                linkReplacements.push({
                    placeholder,
                    html: `<span class="smart-transit-link" title="Chuyển nhanh tới ${cleanName}" onclick="window._loreQuickJumpToLocation(event, '${otherLoc.id}')"><i class="fa-solid fa-link" style="font-size:0.85em;"></i> ${cleanName}</span>`
                });
                formatted = formatted.replace(reg, placeholder);
            }
        });

        // Highlight từ khóa giao thông một cách an toàn không chạm vào placeholder
        const kwReplacements = [];
        const kwRegex = /(Cổng|Hành lang|Thang bộ|Thang máy|Lối đi|Sân|Đường|Tầng|Khu|Phòng|Sảnh)/gi;
        formatted = formatted.replace(kwRegex, match => {
            const placeholder = `__LORE_KW_${kwReplacements.length}__`;
            kwReplacements.push({
                placeholder,
                html: `<b style="color: #7dd3fc;">${match}</b>`
            });
            return placeholder;
        });

        // Khôi phục lại HTML từ placeholder
        kwReplacements.forEach(item => {
            formatted = formatted.split(item.placeholder).join(item.html);
        });
        linkReplacements.forEach(item => {
            formatted = formatted.split(item.placeholder).join(item.html);
        });

        return formatted;
    }

    function renderSmartRoadmapBar(currentList, currentParent) {
        const bar = doc.getElementById('lore_smart_roadmap_bar');
        if (!bar) return;
        if (!currentList || currentList.length === 0) {
            bar.style.display = 'none';
            return;
        }
        let totalConns = 0;
        currentList.forEach(loc => {
            if (loc.connections && loc.connections.trim() !== '' && !loc.connections.toLowerCase().includes('chưa có')) totalConns++;
        });
        bar.style.display = 'flex';
        bar.className = 'lore-network-overview-bar';
        bar.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span style="background: rgba(56,189,248,0.18); padding: 3px 10px; border-radius: 8px; color: #38bdf8; font-weight: 800; border: 1px solid rgba(56,189,248,0.35); display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-solid fa-project-diagram"></i> Sơ đồ liên kết
                </span>
                <span style="color: #cbd5e1;">
                    Đang hiển thị <b style="color: #fff;">${currentList.length}</b> phân khu tại ${currentParent ? `tập con <b style="color:#38bdf8;">[ ${currentParent.name} ]</b>` : '<b style="color:#38bdf8;">[ Lớp Bản Đồ Chính ]</b>'} ${totalConns > 0 ? `<span style="color:#34d399;">(có <b>${totalConns}</b> khu nối rõ ràng)</span>` : ''}
                </span>
            </div>
            <div>
                <button class="lore-btn lore-btn-secondary" style="padding: 4px 10px; font-size: 0.82em; border-radius: 8px;" onclick="window._loreToggleVisualConnectors()">
                    <i class="fa-solid fa-route"></i> ${window._loreHideRoads ? 'Bật Cầu Nối Lưới' : 'Ẩn Cầu Nối Lưới'}
                </button>
            </div>
        `;
    }

    function getSmartInterRowText(currentList, r, COLS, currentParent) {
        if (currentParent && currentParent.name) {
            return `Hành Lang Liên Thông & Lối Đi Nội Bộ [ ${currentParent.name} ]`;
        }
        return `Tuyến Đường Giao Thông & Cổng Kết Nối Liên Khu Vực`;
    }

    function renderAppGrid() {
        updateUI();
        renderBreadcrumb();
        const gridContainer = doc.getElementById('lore_grid_container');
        if (!gridContainer) return;

        const currentParent = navStack.length > 0 ? navStack[navStack.length - 1] : null;
        let currentList = currentParent ? (currentParent.subLocations || []) : (mapData.locations || []);

        renderSmartRoadmapBar(currentList, currentParent);

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
        const rowsCount = Math.ceil((currentList.length + 1) / COLS);
        let html = '';

        for (let r = 0; r < rowsCount; r++) {
            html += `<div class="lore-grid-row">`;
            for (let c = 0; c < COLS; c++) {
                const idx = r * COLS + c;
                const loc = currentList[idx];

                if (loc) {
                    const isHub = loc.category === 'major_hub' || (!currentParent && (!loc.category || loc.category === 'major_hub')) || loc.is_hub;
                    let btnClass = 'location-button';
                    if (isHub) btnClass += ' hub-button';

                    const subCount = Array.isArray(loc.subLocations) ? loc.subLocations.length : 0;
                    const presentCharsList = (aiConfig.trackDynamicInfo === false) ? [] : getAggregatedCharactersInfo(loc);
                    
                    const charPillsHTML = presentCharsList.slice(0, 5).map(item => {
                        const avatarData = getCharacterAvatar(item.charName);
                        let inner = '';
                        if (typeof avatarData === 'string' && avatarData) {
                            inner = `<img src="${avatarData}" alt="${item.charName}" onerror="this.style.display='none'; this.parentNode.innerHTML='${item.charName.substring(0,2).toUpperCase()}'">`;
                        } else if (typeof avatarData === 'object') {
                            inner = `<span style="background:${avatarData.bg}; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">${avatarData.text}</span>`;
                        } else {
                            inner = `<span>${item.charName.substring(0,2).toUpperCase()}</span>`;
                        }
                        const locSubTag = item.isDirect ? '' : ` <span style="color:#7dd3fc; font-size:0.84em; font-weight:normal; margin-left:3px;">➔ [${item.locationName}]</span>`;
                        return `
                            <div class="loc-char-pill" title="Nhân vật hiện diện: ${item.charName} ${item.isDirect ? `(Trực tiếp tại ${loc.name})` : `(Đang ở bên trong ${item.locationName})`} - Nhấp để mở Deep Info" onclick="event.stopPropagation(); window._loreShowDetail('${loc.id}')">
                                <div class="loc-char-avatar">${inner}</div>
                                <span>${item.charName}${locSubTag}</span>
                            </div>
                        `;
                    }).join('');

                    // Badges Pill & Flexible Tags logic (HOÀN TOÀN TỰ DO CHO AI QUYẾT ĐỊNH - KHÔNG TỰ Ý GÁN HOẶC LẶP ICON)
                    const cleanLabelText = (str) => {
                        if (!str && str !== 0) return '';
                        let s = String(str).trim();
                        s = s.replace(/^([^\p{L}\p{N}\s\w,.:;!?'"()-]+)(?:\s*\1)+/gu, '$1').trim();
                        return s;
                    };
                    const categoryText = cleanLabelText((loc.category && loc.category !== 'major_hub' && loc.category !== 'sub_location') ? loc.category : (loc.category === 'major_hub' || !currentParent ? 'Trung Tâm / Tầng Ngoài' : 'Phân Khu / Tầng Sâu'));
                    const statusText = cleanLabelText(loc.status || loc.access_status || '');
                    const controlledText = (loc.controlled_by && loc.controlled_by !== 'Chung' && loc.controlled_by !== 'Không có' && loc.controlled_by !== 'Không rõ') ? cleanLabelText(loc.controlled_by.includes('Chủ quản') ? loc.controlled_by : `Chủ quản: ${loc.controlled_by}`) : '';
                    
                    const tagsList = Array.isArray(loc.tags) ? loc.tags : (typeof loc.tags === 'string' && loc.tags ? loc.tags.split(',').map(t=>t.trim()) : []);
                    const tagsHTML = tagsList.map(t => `<span class="badge-pill badge-status" style="border-color: #c084fc; color: #e9d5ff; background: rgba(168,85,247,0.22);">${cleanLabelText(t)}</span>`).join('');

                    html += `
                        <div class="${btnClass}" data-loc-id="${loc.id}" onclick="window._loreOnLocationLeftClick(event, '${loc.id}')" oncontextmenu="window._loreOnLocationRightClick(event, '${loc.id}')" title="🖱️ Chuột Trái: Vào Phân Khu (${subCount} tập con) | 🖱️ Chuột Phải: Xem & Đọc Thông Tin Chi Tiết (Deep Info)">
                            <!-- HEADER BADGES -->
                            <div class="loc-card-header">
                                <span class="badge-pill ${isHub ? 'badge-hub' : 'badge-cat'}">${categoryText}</span>
                                ${statusText ? `<span class="badge-pill badge-status">${statusText}</span>` : ''}
                                ${controlledText ? `<span class="badge-pill" style="border-color: #a855f7; color: #f3e8ff; background: rgba(147, 51, 234, 0.28); font-weight: 800;" title="Nhân vật kiểm soát / Thế lực chủ quản">${controlledText}</span>` : ''}
                                ${tagsHTML}
                            </div>

                            <!-- MAIN BODY -->
                            <div class="loc-card-body">
                                <i class="fas ${loc.icon || 'fa-location-dot'}"></i>
                                <div class="loc-name">${loc.name}</div>
                                <div class="loc-desc-snippet">${loc.description || loc.atmosphere || 'Chưa có ghi chép chi tiết về bối cảnh hay không khí tại đây...'}</div>
                                ${charPillsHTML ? `
                                    <div style="font-size: 0.77em; color: #7dd3fc; font-weight: 700; margin: 6px 0 2px 0; display: flex; align-items: center; gap: 5px;">
                                        <i class="fa-solid fa-user-check"></i> Nhân vật hiện diện:
                                    </div>
                                    <div class="loc-char-pills">${charPillsHTML}</div>
                                ` : ''}
                            </div>

                            <!-- FOOTER & TRANSIT CONNECTIONS -->
                            <div class="loc-card-footer">
                                ${subCount > 0 ? `
                                    <div class="loc-sub-folder-pill">
                                        <span><i class="fa-solid fa-folder-tree" style="color: #60a5fa; margin-right: 6px;"></i> <b>${subCount}</b> tập con bên trong</span>
                                        <i class="fa-solid fa-chevron-right" style="opacity: 0.7;"></i>
                                    </div>
                                ` : ''}
                                <div class="loc-transit-box">
                                    <div class="loc-transit-header"><i class="fa-solid fa-route"></i> Cổng & Lối Nối:</div>
                                    <div>${formatSmartTransit(loc.connections, currentList, loc.id)}</div>
                                </div>
                            </div>
                        </div>
                    `;
                } else if (idx === currentList.length) {
                    html += `
                        <div class="location-button empty-location" style="cursor: pointer; border-color: rgba(56,189,248,0.35); background: rgba(56,189,248,0.08);" onclick="document.getElementById('lore_btn_add_location').click()" title="Nhấp chuột trái để thêm địa điểm mới vào ô trống này">
                            <i class="fas fa-plus" style="color: #38bdf8; font-size: 28px; margin-bottom: 8px;"></i>
                            <span style="font-size: 1em; font-weight: bold; color: #38bdf8;">+ Thêm Địa Điểm Mới</span>
                            <span style="font-size: 0.8em; color: #94a3b8; margin-top: 4px;">Tạo thêm phân khu hoặc địa điểm phụ tại lớp này</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="location-button empty-location" style="opacity: 0.18; border: 1px dashed rgba(148,163,184,0.12);">
                            <i class="fas fa-cube" style="font-size: 18px;"></i>
                            <span style="font-size: 0.82em;">Khoảng Trống</span>
                        </div>
                    `;
                }

                // Horizontal smart bridge between columns
                if (!window._loreHideRoads && c < COLS - 1 && currentList[idx] && currentList[idx + 1]) {
                    html += `
                        <div class="smart-road-h-cell" title="Cổng nối ngang thông trực tiếp giữa ${currentList[idx].name} và ${currentList[idx+1].name}">
                            <div class="smart-road-h-badge">
                                <i class="fa-solid fa-right-left"></i>
                            </div>
                        </div>
                    `;
                }
            }
            html += `</div>`;

            // Vertical smart bridge between rows
            if (!window._loreHideRoads && r < rowsCount - 1 && (r * COLS + COLS < currentList.length + 1)) {
                html += `
                    <div class="smart-road-v">
                        <div class="road-line"></div>
                        <div class="road-pill">
                            <i class="fa-solid fa-route" style="color: #38bdf8;"></i>
                            <span>${getSmartInterRowText(currentList, r, COLS, currentParent)}</span>
                        </div>
                        <div class="road-line"></div>
                    </div>
                `;
            } else if (r < rowsCount - 1) {
                html += `<div class="lore-zone-divider"><span style="background: rgba(255,255,255,0.04); padding: 4px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">--- Hết Phân Khu ---</span></div>`;
            }
        }

        gridContainer.innerHTML = html;
        if (typeof loreGraphZoomLevel === 'number') {
            gridContainer.style.transform = `scale(${loreGraphZoomLevel})`;
        }
    }

    // CHUỘT TRÁI: Vào xem tập con / drill-down
    window._loreOnLocationLeftClick = function (event, locId) {
        if (loreDidPanDuringDrag) {
            if (event && event.stopPropagation) event.stopPropagation();
            return;
        }
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
        if (loreDidPanDuringDrag) {
            if (event && event.preventDefault) event.preventDefault();
            if (event && event.stopPropagation) event.stopPropagation();
            return false;
        }
        if (event) {
            if (event.preventDefault) event.preventDefault();
            if (event.stopPropagation) event.stopPropagation();
        }
        window._loreShowDetail(locId);
        return false;
    };

    window._loreToggleDetailEditMode = function (isEdit) {
        if (!selectedDetailLocation) return;
        const detBox = doc.getElementById('lore_location_detail_box');
        if (!detBox) return;

        const elNameSpan = detBox.querySelector('#det_name');
        const elNameInput = detBox.querySelector('#edit_det_name');
        const elViewBadges = detBox.querySelector('#det_view_badges');
        const elEditBadges = detBox.querySelector('#det_edit_badges');

        const elCharsDiv = detBox.querySelector('#det_characters');
        const elCharsInput = detBox.querySelector('#edit_det_characters');
        const elControlledDiv = detBox.querySelector('#det_controlled_by');
        const elControlledInput = detBox.querySelector('#edit_det_controlled_by');
        const elDescDiv = detBox.querySelector('#det_description');
        const elDescInput = detBox.querySelector('#edit_det_description');
        const elConnDiv = detBox.querySelector('#det_connections');
        const elConnInput = detBox.querySelector('#edit_det_connections');
        const elAtmoDiv = detBox.querySelector('#det_atmosphere');
        const elAtmoInput = detBox.querySelector('#edit_det_atmosphere');
        const elSecDiv = detBox.querySelector('#det_secrets');
        const elSecInput = detBox.querySelector('#edit_det_secrets');
        const elEveDiv = detBox.querySelector('#det_events');
        const elEveInput = detBox.querySelector('#edit_det_events');

        const elViewActions = detBox.querySelector('#det_view_actions');
        const elEditActions = detBox.querySelector('#det_edit_actions');

        if (isEdit) {
            if (elNameInput) elNameInput.value = selectedDetailLocation.name || '';
            if (detBox.querySelector('#edit_det_category')) detBox.querySelector('#edit_det_category').value = selectedDetailLocation.category || '';
            if (detBox.querySelector('#edit_det_tags')) detBox.querySelector('#edit_det_tags').value = Array.isArray(selectedDetailLocation.tags) ? selectedDetailLocation.tags.join(', ') : (selectedDetailLocation.tags || '');
            if (detBox.querySelector('#edit_det_type')) detBox.querySelector('#edit_det_type').value = selectedDetailLocation.context_type || '';
            if (detBox.querySelector('#edit_det_danger')) detBox.querySelector('#edit_det_danger').value = selectedDetailLocation.danger_level || '';
            if (detBox.querySelector('#edit_det_status')) detBox.querySelector('#edit_det_status').value = selectedDetailLocation.status || '';

            if (elCharsInput) elCharsInput.value = Array.isArray(selectedDetailLocation.characters) ? selectedDetailLocation.characters.join(', ') : (selectedDetailLocation.characters || '');
            if (elControlledInput) elControlledInput.value = selectedDetailLocation.controlled_by || '';
            if (elDescInput) elDescInput.value = selectedDetailLocation.description || '';
            if (elConnInput) elConnInput.value = selectedDetailLocation.connections || '';
            if (elAtmoInput) elAtmoInput.value = selectedDetailLocation.atmosphere || '';
            if (elSecInput) elSecInput.value = selectedDetailLocation.secrets || '';
            if (elEveInput) elEveInput.value = selectedDetailLocation.events || '';

            if (elNameSpan) elNameSpan.style.display = 'none';
            if (elNameInput) { elNameInput.style.display = 'inline-block'; elNameInput.focus(); }
            if (elViewBadges) elViewBadges.style.display = 'none';
            if (elEditBadges) elEditBadges.style.display = 'grid';

            [elCharsDiv, elControlledDiv, elDescDiv, elConnDiv, elAtmoDiv, elSecDiv, elEveDiv].forEach(el => { if (el) el.style.display = 'none'; });
            [elCharsInput, elControlledInput, elDescInput, elConnInput, elAtmoInput, elSecInput, elEveInput].forEach(el => { if (el) el.style.display = 'block'; });
            if (aiConfig.trackDynamicInfo === false) {
                if (elCharsInput && elCharsInput.parentElement) elCharsInput.parentElement.style.display = 'none';
                if (elEveInput && elEveInput.parentElement) elEveInput.parentElement.style.display = 'none';
            } else {
                if (elCharsInput && elCharsInput.parentElement) elCharsInput.parentElement.style.display = 'block';
                if (elEveInput && elEveInput.parentElement) elEveInput.parentElement.style.display = 'block';
            }

            if (elViewActions) elViewActions.style.display = 'none';
            if (elEditActions) elEditActions.style.display = 'flex';
        } else {
            if (elNameSpan) elNameSpan.style.display = 'inline-block';
            if (elNameInput) elNameInput.style.display = 'none';
            if (elViewBadges) elViewBadges.style.display = 'flex';
            if (elEditBadges) elEditBadges.style.display = 'none';

            [elCharsDiv, elControlledDiv, elDescDiv, elConnDiv, elAtmoDiv, elSecDiv, elEveDiv].forEach(el => { if (el) el.style.display = 'block'; });
            [elCharsInput, elControlledInput, elDescInput, elConnInput, elAtmoInput, elSecInput, elEveInput].forEach(el => { if (el) el.style.display = 'none'; });
            if (aiConfig.trackDynamicInfo === false) {
                if (elCharsDiv && elCharsDiv.parentElement) elCharsDiv.parentElement.style.display = 'none';
                if (elEveDiv && elEveDiv.parentElement) elEveDiv.parentElement.style.display = 'none';
            } else {
                if (elCharsDiv && elCharsDiv.parentElement) elCharsDiv.parentElement.style.display = 'block';
                if (elEveDiv && elEveDiv.parentElement) elEveDiv.parentElement.style.display = 'block';
            }

            if (elViewActions) elViewActions.style.display = 'flex';
            if (elEditActions) elEditActions.style.display = 'none';
        }
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

        window._loreToggleDetailEditMode(false);

        doc.getElementById('det_icon').className = `fas ${found.icon || getIconForCategory(found.category, found.name, found.context_type)}`;
        doc.getElementById('det_name').innerText = found.name;
        const cleanModalLabel = (str) => {
            if (!str && str !== 0) return '';
            let s = String(str).trim();
            s = s.replace(/^([^\p{L}\p{N}\s\w,.:;!?'"()-]+)(?:\s*\1)+/gu, '$1').trim();
            return s;
        };
        const catBadgeText = cleanModalLabel((found.category && found.category !== 'major_hub' && found.category !== 'sub_location') ? found.category : (found.category === 'major_hub' || !currentParent ? 'Trung Tâm / Tầng Ngoài' : 'Phân Khu / Tầng Sâu'));
        doc.getElementById('det_category_badge').innerText = catBadgeText;
        doc.getElementById('det_type_badge').innerText = cleanModalLabel(found.context_type || 'Khu vực');
        
        const tagsList = Array.isArray(found.tags) ? found.tags : (typeof found.tags === 'string' && found.tags ? found.tags.split(',').map(t=>t.trim()) : []);
        let viewBadgesEl = doc.getElementById('det_view_badges');
        if (viewBadgesEl) {
            viewBadgesEl.querySelectorAll('.det-custom-tag-pill').forEach(e => e.remove());
            tagsList.forEach(t => {
                const span = doc.createElement('span');
                span.className = 'det-custom-tag-pill';
                span.style = 'background: rgba(168,85,247,0.22); color: #e9d5ff; border: 1px solid #c084fc; padding: 4px 12px; border-radius: 12px; font-size: 0.82em; font-weight: 800;';
                span.innerText = cleanModalLabel(t);
                viewBadgesEl.appendChild(span);
            });
        }
        
        const statusBadge = doc.getElementById('det_status_badge');
        if (statusBadge) statusBadge.innerText = cleanModalLabel(found.status || 'Tự do');

        const charBoxEl = doc.getElementById('det_characters')?.parentElement;
        const eventBoxEl = doc.getElementById('det_events')?.parentElement;
        if (aiConfig.trackDynamicInfo === false) {
            if (charBoxEl && charBoxEl.classList.contains('deep-info-card')) charBoxEl.style.display = 'none';
            if (eventBoxEl && eventBoxEl.classList.contains('deep-info-card')) eventBoxEl.style.display = 'none';
        } else {
            if (charBoxEl && charBoxEl.classList.contains('deep-info-card')) charBoxEl.style.display = 'block';
            if (eventBoxEl && eventBoxEl.classList.contains('deep-info-card')) eventBoxEl.style.display = 'block';

            const charArray = Array.isArray(found.characters) ? found.characters.filter(Boolean) : (typeof found.characters === 'string' && found.characters ? found.characters.split(',').map(c=>c.trim()).filter(Boolean) : []);
            if (charArray.length > 0) {
                doc.getElementById('det_characters').innerHTML = charArray.map(c => `<span style="background: rgba(56,189,248,0.22); border: 1px solid rgba(56,189,248,0.4); padding: 3px 10px; border-radius: 12px; font-weight: bold; color: #7dd3fc; display: inline-block; margin: 2px 4px 2px 0;">👤 ${cleanModalLabel(c)}</span>`).join(' ');
            } else {
                doc.getElementById('det_characters').innerHTML = `<span style="color: #94a3b8; font-style: italic;">Chưa có nhân vật nào đang hiện diện tại đây lúc này</span>`;
            }

            doc.getElementById('det_events').innerText = found.events || 'Tình hình ổn định, không có sự kiện căng thẳng nào.';
        }

        const controlledStr = found.controlled_by || 'Chung';
        if (controlledStr && controlledStr !== 'Chung' && controlledStr !== 'Không rõ' && controlledStr !== 'Không có') {
            doc.getElementById('det_controlled_by').innerHTML = `<span style="background: rgba(168,85,247,0.22); border: 1px solid rgba(168,85,247,0.4); padding: 3px 10px; border-radius: 12px; font-weight: bold; color: #e9d5ff; display: inline-block; margin: 2px 0;">${cleanModalLabel(controlledStr.includes('Chủ quản') ? controlledStr : 'Chủ quản: ' + controlledStr)}</span>`;
        } else {
            doc.getElementById('det_controlled_by').innerHTML = `<span style="color: #94a3b8; font-style: italic;">Chung / Không có thông tin thế lực chủ quản riêng</span>`;
        }
        doc.getElementById('det_description').innerText = found.description || 'Không có thông tin mô tả chi tiết.';
        doc.getElementById('det_connections').innerHTML = formatSmartTransit(found.connections, currentParent ? (currentParent.subLocations || []) : mapData.locations, found.id);
        doc.getElementById('det_atmosphere').innerText = found.atmosphere || 'Bầu không khí bình thường, không có điểm bất thường.';
        doc.getElementById('det_secrets').innerText = found.secrets || 'Chưa phát hiện bí mật hay vật phẩm đặc biệt nào.';

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
            let prompt = template
                .replace('{{history}}', histObj.text)
                .replace('{{target_name}}', targetLoc.name || '')
                .replace('{{target_type}}', targetLoc.context_type || '')
                .replace('{{target_desc}}', targetLoc.description || '')
                .replace('{{target_atmo}}', targetLoc.atmosphere || '')
                .replace('{{target_secrets}}', targetLoc.secrets || '');

            if (aiConfig.trackDynamicInfo === false) {
                prompt += `\n\n[CHÚ Ý QUAN TRỌNG: Chế độ theo dõi thông tin động hiện ĐANG TẮT. BẠN CHỈ TẬP TRUNG HOÀN TOÀN VÀO BẢN ĐỒ MANG TÍNH KHÁCH QUAN, CHI TIẾT MANG TÍNH ĐỊA ĐIỂM VÀ LIÊN KẾT GIAO THÔNG NHẤT CÓ THỂ. KHÔNG liên quan tới sự kiện hay những gì đang xảy ra hiện tại. Hãy để trường "events": "" và "characters": [] ở tất cả các phân khu con!]`;
            }

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
                        category: sub.category || 'sub_location',
                        tags: Array.isArray(sub.tags) ? sub.tags : (typeof sub.tags === 'string' ? sub.tags.split(',').map(t=>t.trim()) : []),
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
            let prompt = template
                .replace('{{history}}', histObj.text)
                .replace('{{existing_map}}', existingStr || '(Chưa có)');

            if (aiConfig.trackDynamicInfo === false) {
                prompt += `\n\n[CHÚ Ý QUAN TRỌNG: Chế độ theo dõi thông tin động hiện ĐANG TẮT. BẠN CHỈ TẬP TRUNG HOÀN TOÀN VÀO BẢN ĐỒ MANG TÍNH KHÁCH QUAN, CHI TIẾT MANG TÍNH ĐỊA ĐIỂM VÀ LIÊN KẾT GIAO THÔNG NHẤT CÓ THỂ. KHÔNG liên quan tới sự kiện hay những gì đang xảy ra hiện tại. Hãy để trường "events": "" và "characters": [] ở tất cả các khu vực và phân khu!]`;
            }

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
                        icon: item.icon ? item.icon.replace(/^fas\s+|^far\s+|^fab\s+/i, '').trim() : getIconForCategory(item.category, item.name, item.context_type),
                        category: item.category || 'major_hub',
                        tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? item.tags.split(',').map(t=>t.trim()) : []),
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
                    if (item.icon) hub.icon = item.icon.replace(/^fas\s+|^far\s+|^fab\s+/i, '').trim();
                    if (item.category && item.category !== 'major_hub') {
                        hub.category = item.category;
                        if (!hub.icon || hub.icon === 'fa-building') hub.icon = getIconForCategory(item.category, hub.name, hub.context_type);
                    }
                    if (Array.isArray(item.tags)) hub.tags = Array.from(new Set([...(hub.tags||[]), ...item.tags]));
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
                                icon: sub.icon ? sub.icon.replace(/^fas\s+|^far\s+|^fab\s+/i, '').trim() : getIconForCategory(sub.category || 'sub_location', sub.name, sub.context_type),
                                category: sub.category || 'sub_location',
                                tags: Array.isArray(sub.tags) ? sub.tags : (typeof sub.tags === 'string' ? sub.tags.split(',').map(t=>t.trim()) : []),
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
                doc.body.style.overflow = '';
                if (doc.documentElement) doc.documentElement.style.overflow = '';
            } else {
                overlay.style.display = 'flex';
                doc.body.style.overflow = 'hidden';
                if (doc.documentElement) doc.documentElement.style.overflow = 'hidden';
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
