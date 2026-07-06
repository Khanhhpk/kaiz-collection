/**
 * SillyTavern Extension: KAIZ Collection
 * Entry point nạp tự động các module trong hệ sinh thái với cơ chế kiểm tra môi trường sẵn sàng & thu thập log hệ thống.
 */

// ==========================================
// HỆ THỐNG QUẢN LÝ LOG (KAIZ LOGGER)
// ==========================================
window._kaizLogs = window._kaizLogs || [];

function logToKaiz(message, type = 'info') {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const logItem = { time: timeStr, message: String(message), type: type };
    
    window._kaizLogs.push(logItem);
    if (window._kaizLogs.length > 800) window._kaizLogs.shift(); // Giữ tối đa 800 dòng log

    // Nếu UI log đang mở/tồn tại trong DOM, cập nhật ngay vào khung log
    const logBox = document.getElementById('kaiz_log_box');
    if (logBox) {
        if (logBox.children.length === 1 && logBox.children[0].textContent.includes('Chưa có nhật ký')) {
            logBox.innerHTML = '';
        }
        const div = document.createElement('div');
        let badgeColor = '#88c0d0';
        let badgeBg = 'rgba(136, 192, 208, 0.2)';
        let badgeText = 'INFO';
        
        if (type === 'warn') {
            badgeColor = '#ebcb8b';
            badgeBg = 'rgba(235, 203, 139, 0.2)';
            badgeText = 'WARN';
        } else if (type === 'error') {
            badgeColor = '#bf616a';
            badgeBg = 'rgba(191, 97, 106, 0.2)';
            badgeText = 'ERR ';
        }
        
        div.style.cssText = "padding: 4px 8px; border-radius: 4px; background: rgba(255,255,255,0.03); border-left: 3px solid " + badgeColor + "; display: flex; gap: 8px; align-items: baseline; flex-shrink: 0;";
        div.innerHTML = `
            <span style="color: #888; font-size: 0.8em; white-space: nowrap;">[${logItem.time}]</span>
            <span style="color: ${badgeColor}; background: ${badgeBg}; font-size: 0.75em; font-weight: bold; padding: 1px 5px; border-radius: 3px;">${badgeText}</span>
            <span style="color: #fff; word-break: break-all; flex: 1;">${logItem.message}</span>
        `;
        logBox.appendChild(div);
        logBox.scrollTop = logBox.scrollHeight;
    }
}

// Intercept (Chuyển hướng) toàn diện console.log / warn / error của Web Console về bảng Log của Extension
const kaizPrefixes = [
    '[phoneecosystem]', '[phone ecosystem]', '[sillytavern extension]', 
    '[kaiz collection]', '[kaiz]', '[phonecore]', '[phone core]', '[floatingball]', 
    '[app ', '[app]', '[shimeji]', '[vtuber]', '[vtuber', '[vn dialogue]', '[vndialogue]', 
    '[storageinspector]', '[storage inspector]', '[avar]', '[autouserrp]', '[wechat]', 
    '[weather]', '[music]', '[chess]', '[canvas]', '[browser]', '[cleanup]', '[flappy]', 
    '[freegen]', '[infinite]', '[livestream]', '[news]', '[pollinations]', '[terminal]', 
    '[theme]', '[virtual tube]', '[world map]', '[bản đồ thế giới]', '[youtube]', 
    '[oc group]', '[auau]', '[create char]', '[điện thoại]', '[cài đặt]', '[iframe]', 
    '[bong bóng]', '[floatingmenumanager]', '[phonesystem]', '[bản đồ]', '[tạo char]', 
    '[tạo oc]', 'reset pose error', 'init model error', 'lỗi ai chat', 
    'lỗi giải mã android', 'lỗi fetch models', 'lỗi nạp dữ liệu'
];

function isKaizLog(args) {
    if (!args || args.length === 0) return false;
    const fullStr = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
    return kaizPrefixes.some(prefix => fullStr.includes(prefix));
}

function getTargetWindow() {
    return (typeof window !== 'undefined' && window.parent && window.parent.document) ? window.parent : window;
}

window._kaizSilentF12 = false;
try {
    const savedCfg = localStorage.getItem('st_phone_ecosystem_config');
    if (savedCfg) {
        const parsedCfg = JSON.parse(savedCfg);
        if (parsedCfg.silent_f12) window._kaizSilentF12 = true;
    }
} catch (e) {}

function setupConsoleInterception(targetConsole) {
    if (!targetConsole || targetConsole._kaizIntercepted) return;
    targetConsole._kaizIntercepted = true;

    const origLog = targetConsole.log;
    const origWarn = targetConsole.warn;
    const origError = targetConsole.error;

    targetConsole.log = function(...args) {
        if (isKaizLog(args)) {
            logToKaiz(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'info');
            if (window._kaizSilentF12) return;
        }
        origLog.apply(targetConsole, args);
    };

    targetConsole.warn = function(...args) {
        if (isKaizLog(args)) {
            logToKaiz(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'warn');
            if (window._kaizSilentF12) return;
        }
        origWarn.apply(targetConsole, args);
    };

    targetConsole.error = function(...args) {
        if (isKaizLog(args)) {
            logToKaiz(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'error');
            if (window._kaizSilentF12) return;
        }
        origError.apply(targetConsole, args);
    };
}

// Đánh chặn console của cả window hiện tại và window cha (SillyTavern chính)
setupConsoleInterception(console);
if (typeof window !== 'undefined' && window.console) setupConsoleInterception(window.console);
const targetWin = getTargetWindow();
if (targetWin && targetWin.console) setupConsoleInterception(targetWin.console);

console.log('[KAIZ Collection] Đang chờ môi trường SillyTavern sẵn sàng...');

function waitForEnvironment(callback) {
    let attempts = 0;
    const checkInterval = setInterval(() => {
        attempts++;
        const targetWin = getTargetWindow();
        const doc = targetWin.document || document;
        const jq = targetWin.$ || targetWin.jQuery || window.$ || window.jQuery;

        if (
            doc &&
            doc.body &&
            doc.readyState !== 'loading' &&
            jq
        ) {
            clearInterval(checkInterval);
            console.log(`[KAIZ Collection] Môi trường đã sẵn sàng sau ${attempts * 100}ms!`);
            callback(targetWin, jq);
        } else if (attempts >= 100) { // 10 giây
            console.warn('[KAIZ Collection] Quá thời gian chờ jQuery/DOM, tiến hành nạp ép buộc...');
            clearInterval(checkInterval);
            callback(targetWin, jq || window.$ || null);
        }
    }, 100);
}

// ==========================================
// CẤU HÌNH & QUẢN LÝ TRẠNG THÁI MODULES
// ==========================================
const CONFIG_KEY = 'st_phone_ecosystem_config';

const CORE_MODULES = [
    { file: 'floating_ball_manager.js', path: './modules/floating_ball_manager.js', name: 'Bong bóng mẹ (UI Master)', desc: 'Quản lý nút nổi, menu chính và điều hướng' },
    { file: 'phone_core.js', path: './modules/phone_core.js', name: 'Hệ điều hành Phone Core', desc: 'Lõi xử lý nền và bộ điều khiển ứng dụng' }
];

const PHONE_APPS = [
    { file: 'app_browser.js', path: './modules/app_browser.js', name: 'Trình duyệt Web', desc: 'Lướt web và tìm kiếm ngay trong SillyTavern' },
    { file: 'app_canvas.js', path: './modules/app_canvas.js', name: 'Vẽ Canvas', desc: 'Ứng dụng vẽ tranh, ghi chú sáng tạo' },
    { file: 'app_chess.js', path: './modules/app_chess.js', name: 'Cờ vua', desc: 'Giải trí cờ vua cùng nhân vật AI' },
    { file: 'app_cleanup.js', path: './modules/app_cleanup.js', name: 'Dọn dẹp bộ nhớ', desc: 'Tối ưu hóa hệ thống và giải phóng RAM' },
    { file: 'app_create_char_wechat.js', path: './modules/app_create_char_wechat.js', name: 'Tạo nhân vật WeChat', desc: 'Tạo card nhân vật nhanh chóng qua tin nhắn' },
    { file: 'app_create_oc_group_chat.js', path: './modules/app_create_oc_group_chat.js', name: 'Tạo OC Group Chat', desc: 'Tạo nhóm trò chuyện nhiều nhân vật' },
    { file: 'app_flappy_bird.js', path: './modules/app_flappy_bird.js', name: 'Game Flappy Bird', desc: 'Trò chơi giải trí kinh điển Flappy Bird' },
    { file: 'app_freegen.js', path: './modules/app_freegen.js', name: 'Freegen AI', desc: 'Tạo ảnh miễn phí tích hợp Freegen' },
    { file: 'app_infinite_craft.js', path: './modules/app_infinite_craft.js', name: 'Infinite Craft', desc: 'Trò chơi ghép từ và sáng tạo vô tận' },
    { file: 'app_livestream.js', path: './modules/app_livestream.js', name: 'Livestream', desc: 'Giao diện mô phỏng phát sóng trực tiếp' },
    { file: 'app_music.js', path: './modules/app_music.js', name: 'Máy nghe nhạc', desc: 'Trình phát nhạc nền thư giãn cho phòng chat' },
    { file: 'app_news.js', path: './modules/app_news.js', name: 'Đọc tin tức', desc: 'Cập nhật bảng tin thời sự trực tuyến' },
    { file: 'app_pollinations.js', path: './modules/app_pollinations.js', name: 'Vẽ ảnh Pollinations', desc: 'Tạo ảnh AI tự động qua Pollinations.ai' },
    { file: 'app_terminal_debug.js', path: './modules/app_terminal_debug.js', name: 'Terminal Debug', desc: 'Bảng điều khiển lập trình và theo dõi lỗi' },
    { file: 'app_theme.js', path: './modules/app_theme.js', name: 'Giao diện & Chủ đề', desc: 'Tùy chỉnh màu sắc, hình nền điện thoại' },
    { file: 'app_virtual_tube.js', path: './modules/app_virtual_tube.js', name: 'Virtual Tube', desc: 'Xem video trực tuyến trên điện thoại' },
    { file: 'app_weather.js', path: './modules/app_weather.js', name: 'Dự báo Thời tiết', desc: 'Cập nhật thời tiết theo thời gian thực' },
    { file: 'app_wechat_auau.js', path: './modules/app_wechat_auau.js', name: 'WeChat Âu Âu', desc: 'Mạng xã hội và bảng tin phong cách Âu Âu' },
    { file: 'app_wechat.js', path: './modules/app_wechat.js', name: 'WeChat Nhắn tin', desc: 'Nhắn tin phong cách WeChat với AI' },
    { file: 'app_world_map.js', path: './modules/app_world_map.js', name: 'Bản đồ thế giới', desc: 'Khám phá bản đồ thế giới trong game' },
    { file: 'app_youtube.js', path: './modules/app_youtube.js', name: 'YouTube', desc: 'Trình phát video YouTube tích hợp' }
];

const UTILITY_MODULES = [
    { file: 'avar_ai_input.js', path: './modules/avar_ai_input.js', name: 'Avar AI Input', desc: 'Hỗ trợ nhập liệu thông minh cho AI' },
    { file: 'shimeji.js', path: './modules/shimeji.js', name: 'Shimeji v14.21', desc: 'Thú cưng tương tác chạy nhảy trên màn hình' },
    { file: 'storage_inspector.js', path: './modules/storage_inspector.js', name: 'Storage Inspector', desc: 'Kiểm tra và quản lý dung lượng lưu trữ' },
    { file: 'visual_novel_dialogue.js', path: './modules/visual_novel_dialogue.js', name: 'Visual Novel Dialogue', desc: 'Hiển thị hội thoại phong cách Visual Novel' },
    { file: 'vtuber_assistant.js', path: './modules/vtuber_assistant.js', name: 'Vtuber Assistant', desc: 'Trợ lý ảo Vtuber hỗ trợ tương tác' }
];

function getPhoneConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        // Không gọi console.error để tránh đệ quy log vô tận
    }
    return {
        enabled: true,
        disabled_modules: []
    };
}

function savePhoneConfig(config) {
    try {
        if (config && config.silent_f12 !== undefined) {
            window._kaizSilentF12 = !!config.silent_f12;
        }
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        const win = getTargetWindow();
        if (win && win.toastr) {
            win.toastr.success('Đã lưu cấu hình KAIZ Collection! Nhấn F5 để áp dụng thay đổi.');
        }
    } catch (e) {}
}

// ==========================================
// HÀM TẠO GIAO DIỆN QUẢN LÝ TRONG TAB EXTENSIONS
// ==========================================
function renderExtensionSettings(targetWin, jq) {
    const doc = targetWin.document || document;
    const container = doc.getElementById('extensions_settings') || doc.getElementById('extensions-settings');
    if (!container) {
        setTimeout(() => renderExtensionSettings(targetWin, jq), 1000);
        return;
    }

    if (doc.getElementById('phone_ecosystem_settings_container')) {
        return; // Đã khởi tạo UI
    }

    const config = getPhoneConfig();

    const section = doc.createElement('div');
    section.id = 'phone_ecosystem_settings_container';
    section.className = 'extension_container';

    function buildModuleListHtml(modulesList) {
        return modulesList.map(mod => {
            const isChecked = !(config.disabled_modules && config.disabled_modules.includes(mod.file));
            return `
            <div class="pe-module-item" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; margin: 6px 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; transition: all 0.25s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                <label style="display: flex; align-items: center; gap: 12px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                    <input type="checkbox" class="pe_module_checkbox" data-file="${mod.file}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #88c0d0; flex-shrink: 0;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #fff; font-size: 0.94em; letter-spacing: 0.2px;">${mod.name}</div>
                        <div style="font-size: 0.78em; color: #aaa; margin-top: 3px; line-height: 1.3;">${mod.desc}</div>
                    </div>
                </label>
                <span class="pe-status-badge" style="font-size: 0.72em; font-weight: bold; padding: 4px 10px; border-radius: 20px; background: ${isChecked ? 'rgba(163, 190, 140, 0.2); color: #a3be8c; border: 1px solid rgba(163,190,140,0.3);' : 'rgba(191, 97, 106, 0.2); color: #bf616a; border: 1px solid rgba(191,97,106,0.3);'}; white-space: nowrap; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">
                    ${isChecked ? '🟢 Đang bật' : '🔴 Đã tắt'}
                </span>
            </div>`;
        }).join('');
    }

    function buildAccordionHtml(id, icon, title, subtitle, colorTheme, modulesList) {
        const count = modulesList.length;
        const activeCount = modulesList.filter(m => !(config.disabled_modules && config.disabled_modules.includes(m.file))).length;
        return `
        <div class="kaiz-accordion-section" style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.12)); border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: border-color 0.3s ease;">
            <div class="kaiz-accordion-header" data-target="kaiz_acc_body_${id}" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: linear-gradient(90deg, ${colorTheme}1a, rgba(0,0,0,0.1)); cursor: pointer; user-select: none; transition: background 0.2s;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 1.3em; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${icon}</span>
                    <div>
                        <div style="font-weight: bold; font-size: 0.98em; color: ${colorTheme}; letter-spacing: 0.3px;">${title}</div>
                        <div style="font-size: 0.75em; color: #ccc; opacity: 0.8; margin-top: 2px;">${subtitle}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="kaiz-acc-badge-${id}" style="font-size: 0.75em; background: rgba(0,0,0,0.4); color: #fff; padding: 4px 10px; border-radius: 14px; font-weight: bold; border: 1px solid rgba(255,255,255,0.15);">
                        <span style="color: #a3be8c;">${activeCount}</span>/${count} bật
                    </span>
                    <span id="kaiz_acc_icon_${id}" style="font-size: 0.85em; color: ${colorTheme}; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: rotate(-90deg); display: inline-block;">▼</span>
                </div>
            </div>
            <div id="kaiz_acc_body_${id}" class="kaiz-accordion-body" style="display: none; padding: 12px 14px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.2); flex-direction: column; gap: 6px;">
                ${buildModuleListHtml(modulesList)}
            </div>
        </div>`;
    }

    section.innerHTML = `
    <style>
        .kaiz-tab-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .pe-module-item:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.25) !important; transform: translateX(4px); }
        .kaiz-accordion-header:hover { background: rgba(255,255,255,0.08) !important; }
        #pe_reload_btn:hover { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 6px 16px rgba(136,192,208,0.4) !important; }
        .menu_button.interactable:hover { filter: brightness(1.15); transform: translateY(-1px); }
    </style>
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header" style="background: linear-gradient(90deg, rgba(136,192,208,0.2), rgba(0,0,0,0.1)); border-radius: 8px; padding: 10px 14px;">
            <b style="font-size: 1.05em; color: #88c0d0; letter-spacing: 0.3px;">✨ KAIZ Collection (Hệ sinh thái & Tiện ích)</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content" style="display: none; padding: 14px; flex-direction: column; gap: 16px;">
            <!-- Tab Navigation Buttons -->
            <div style="display: flex; gap: 10px; border-bottom: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.15)); padding-bottom: 12px;">
                <button id="kaiz_tab_btn_modules" class="kaiz-tab-btn" style="flex: 1; padding: 10px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; border: 1px solid var(--SmartThemeQuoteColor, #88c0d0); background: var(--SmartThemeQuoteColor, #88c0d0); color: #000; transition: all 0.2s; box-shadow: 0 2px 8px rgba(136,192,208,0.3); font-size: 0.92em;">
                    📦 Quản lý Module (28)
                </button>
                <button id="kaiz_tab_btn_logs" class="kaiz-tab-btn" style="flex: 1; padding: 10px 14px; border-radius: 8px; font-weight: bold; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: var(--SmartThemeBodyColor, #fff); transition: all 0.2s; font-size: 0.92em;">
                    📋 Nhật ký & Console
                </button>
            </div>

            <!-- TAB 1: MODULES MANAGEMENT -->
            <div id="kaiz_tab_content_modules" style="display: flex; flex-direction: column; gap: 16px;">
                <!-- Master Control Block -->
                <div style="padding: 16px; background: linear-gradient(135deg, rgba(136, 192, 208, 0.15), rgba(0,0,0,0.35)); border: 1px solid var(--SmartThemeQuoteColor, #88c0d0); border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.4em; filter: drop-shadow(0 0 8px rgba(136,192,208,0.6));">⚡</span>
                            <div>
                                <span style="font-size: 1.05em; font-weight: bold; color: #88c0d0; letter-spacing: 0.3px;">Công tắc Chính (Master Switch)</span>
                                <div style="font-size: 0.78em; color: #ccc; margin-top: 2px;">Điều khiển toàn bộ hệ sinh thái KAIZ Collection</div>
                            </div>
                        </div>
                        <label class="checkbox_label" style="margin: 0; cursor: pointer; display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.45); padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15);">
                            <input type="checkbox" id="pe_master_toggle" ${config.enabled ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #a3be8c;">
                            <span id="pe_master_status_text" style="font-weight: bold; font-size: 0.9em; color: ${config.enabled ? '#a3be8c' : '#bf616a'};">${config.enabled ? '🟢 ĐANG BẬT' : '🔴 ĐÃ TẮT'}</span>
                        </label>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px;">
                        <button id="pe_enable_all_btn" class="menu_button interactable" style="flex: 1; min-width: 120px; padding: 8px 12px; font-size: 0.85em; background: rgba(163, 190, 140, 0.25); color: #a3be8c; border: 1px solid #a3be8c; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
                            ✅ Bật tất cả
                        </button>
                        <button id="pe_disable_all_btn" class="menu_button interactable" style="flex: 1; min-width: 120px; padding: 8px 12px; font-size: 0.85em; background: rgba(191, 97, 106, 0.25); color: #bf616a; border: 1px solid #bf616a; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
                            ❌ Tắt tất cả
                        </button>
                    </div>
                    <button id="pe_reload_btn" class="menu_button interactable" style="width: 100%; margin-top: 12px; padding: 10px; background: linear-gradient(90deg, #88c0d0, #81a1c1); color: #000; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 0.92em; transition: all 0.2s; box-shadow: 0 4px 12px rgba(136,192,208,0.3);">
                        🔄 Làm mới trang (F5) để áp dụng thay đổi
                    </button>
                </div>

                <!-- Accordion Section 1: Core Modules -->
                ${buildAccordionHtml('core', '👑', 'Lõi Hệ thống (Core Masters)', 'Các module nền tảng và quản lý cốt lõi', '#ebcb8b', CORE_MODULES)}

                <!-- Accordion Section 2: Phone Apps -->
                ${buildAccordionHtml('apps', '📱', 'Ứng dụng Điện thoại (Phone Apps)', 'Hệ sinh thái ứng dụng giả lập điện thoại', '#88c0d0', PHONE_APPS)}

                <!-- Accordion Section 3: Utilities -->
                ${buildAccordionHtml('utils', '🛠️', 'Tiện ích Độc lập (Utilities & Assistants)', 'Thú cưng, trợ lý ảo, kiểm tra dung lượng', '#b48ead', UTILITY_MODULES)}
            </div>

            <!-- TAB 2: LOGS & CONSOLE -->
            <div id="kaiz_tab_content_logs" style="display: none; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.35); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 0.88em; font-weight: bold; color: #88c0d0;">💡 Nhật ký Hệ thống (Real-time Console):</span>
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82em; color: #ccc; cursor: pointer; user-select: none;">
                            <input type="checkbox" id="kaiz_silent_f12_cb" ${config.silent_f12 ? 'checked' : ''} style="cursor: pointer; accent-color: #88c0d0; width: 16px; height: 16px;">
                            <span>Ẩn log khỏi Console Web (F12) để giảm rác</span>
                        </label>
                    </div>
                    <button id="kaiz_log_clear_btn" class="menu_button interactable" style="padding: 6px 14px; font-size: 0.82em; border-radius: 6px; border: 1px solid #bf616a; background: rgba(191,97,106,0.2); color: #bf616a; cursor: pointer; font-weight: bold; transition: all 0.2s;">
                        🗑️ Xóa Log
                    </button>
                </div>
                <div id="kaiz_log_box" style="height: 400px; overflow-y: auto; background: rgba(0,0,0,0.75); border: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.15)); border-radius: 10px; padding: 12px; font-family: 'Consolas', 'Courier New', monospace; font-size: 0.86em; display: flex; flex-direction: column; gap: 6px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.6);">
                    <div style="color: #888; text-align: center; padding: 20px;">Chưa có nhật ký hoạt động nào.</div>
                </div>
            </div>
        </div>
    </div>`;

    container.appendChild(section);

    // Xử lý chuyển tab
    const tabBtnModules = doc.getElementById('kaiz_tab_btn_modules');
    const tabBtnLogs = doc.getElementById('kaiz_tab_btn_logs');
    const contentModules = doc.getElementById('kaiz_tab_content_modules');
    const contentLogs = doc.getElementById('kaiz_tab_content_logs');
    const logBox = doc.getElementById('kaiz_log_box');
    const logClearBtn = doc.getElementById('kaiz_log_clear_btn');

    function renderAllLogsToUI() {
        if (!logBox) return;
        logBox.innerHTML = '';
        const logs = window._kaizLogs || [];
        if (logs.length === 0) {
            logBox.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">Chưa có nhật ký hoạt động nào.</div>';
            return;
        }
        logs.forEach(item => {
            const div = doc.createElement('div');
            let badgeColor = '#88c0d0';
            let badgeBg = 'rgba(136, 192, 208, 0.2)';
            let badgeText = 'INFO';
            
            if (item.type === 'warn') {
                badgeColor = '#ebcb8b';
                badgeBg = 'rgba(235, 203, 139, 0.2)';
                badgeText = 'WARN';
            } else if (item.type === 'error') {
                badgeColor = '#bf616a';
                badgeBg = 'rgba(191, 97, 106, 0.2)';
                badgeText = 'ERR ';
            }
            
            div.style.cssText = `padding: 6px 10px; border-left: 3px solid ${badgeColor}; background: rgba(255,255,255,0.03); border-radius: 4px; display: flex; gap: 8px; align-items: flex-start; word-break: break-all;`;
            div.innerHTML = `
                <span style="color: #666; font-size: 0.85em; white-space: nowrap;">[${item.time}]</span>
                <span style="color: ${badgeColor}; background: ${badgeBg}; padding: 1px 6px; border-radius: 3px; font-size: 0.8em; font-weight: bold; white-space: nowrap;">${badgeText}</span>
                <span style="color: var(--SmartThemeBodyColor, #eee); flex: 1;">${item.msg}</span>
            `;
            logBox.appendChild(div);
        });
        logBox.scrollTop = logBox.scrollHeight;
    }

    if (tabBtnModules && tabBtnLogs) {
        tabBtnModules.addEventListener('click', () => {
            tabBtnModules.style.background = 'var(--SmartThemeQuoteColor, #88c0d0)';
            tabBtnModules.style.color = '#000';
            tabBtnModules.style.borderColor = 'var(--SmartThemeQuoteColor, #88c0d0)';
            tabBtnModules.style.boxShadow = '0 2px 8px rgba(136,192,208,0.3)';
            
            tabBtnLogs.style.background = 'rgba(0,0,0,0.3)';
            tabBtnLogs.style.color = 'var(--SmartThemeBodyColor, #fff)';
            tabBtnLogs.style.borderColor = 'rgba(255,255,255,0.2)';
            tabBtnLogs.style.boxShadow = 'none';

            contentModules.style.display = 'flex';
            contentLogs.style.display = 'none';
        });

        tabBtnLogs.addEventListener('click', () => {
            tabBtnLogs.style.background = 'var(--SmartThemeQuoteColor, #88c0d0)';
            tabBtnLogs.style.color = '#000';
            tabBtnLogs.style.borderColor = 'var(--SmartThemeQuoteColor, #88c0d0)';
            tabBtnLogs.style.boxShadow = '0 2px 8px rgba(136,192,208,0.3)';
            
            tabBtnModules.style.background = 'rgba(0,0,0,0.3)';
            tabBtnModules.style.color = 'var(--SmartThemeBodyColor, #fff)';
            tabBtnModules.style.borderColor = 'rgba(255,255,255,0.2)';
            tabBtnModules.style.boxShadow = 'none';

            contentModules.style.display = 'none';
            contentLogs.style.display = 'flex';
            renderAllLogsToUI();
        });
    }

    if (logClearBtn) {
        logClearBtn.addEventListener('click', () => {
            window._kaizLogs = [];
            renderAllLogsToUI();
        });
    }

    // Đăng ký nhận sự kiện log từ hệ thống để cập nhật realtime
    window.addEventListener('kaiz_log_updated', () => {
        if (contentLogs && contentLogs.style.display !== 'none') {
            renderAllLogsToUI();
        }
    });

    // Xử lý đóng/mở Accordion (phân khu thu nhỏ mặc định)
    const accHeaders = section.querySelectorAll('.kaiz-accordion-header');
    accHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.getAttribute('data-target');
            const body = doc.getElementById(targetId);
            const icon = header.querySelector('[id^="kaiz_acc_icon_"]');
            if (body) {
                const isHidden = body.style.display === 'none';
                body.style.display = isHidden ? 'flex' : 'none';
                if (icon) {
                    icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
                }
            }
        });
    });

    // Gắn sự kiện cho các nút điều khiển
    const masterToggle = doc.getElementById('pe_master_toggle');
    const masterStatusText = doc.getElementById('pe_master_status_text');
    const reloadBtn = doc.getElementById('pe_reload_btn');
    const enableAllBtn = doc.getElementById('pe_enable_all_btn');
    const disableAllBtn = doc.getElementById('pe_disable_all_btn');
    const checkboxes = section.querySelectorAll('.pe_module_checkbox');

    function updateCheckboxesUI() {
        checkboxes.forEach(cb => {
            const file = cb.getAttribute('data-file');
            const isChecked = !(config.disabled_modules && config.disabled_modules.includes(file));
            cb.checked = isChecked;
            const badge = cb.closest('.pe-module-item').querySelector('.pe-status-badge');
            if (badge) {
                badge.style.background = isChecked ? 'rgba(163, 190, 140, 0.2)' : 'rgba(191, 97, 106, 0.2)';
                badge.style.color = isChecked ? '#a3be8c' : '#bf616a';
                badge.style.border = isChecked ? '1px solid rgba(163,190,140,0.3)' : '1px solid rgba(191,97,106,0.3)';
                badge.textContent = isChecked ? '🟢 Đang bật' : '🔴 Đã tắt';
            }
        });

        // Cập nhật số lượng active trên các header accordion
        const updateCount = (id, list) => {
            const badgeEl = section.querySelector(`.kaiz-acc-badge-${id}`);
            if (badgeEl) {
                const active = list.filter(m => !(config.disabled_modules && config.disabled_modules.includes(m.file))).length;
                badgeEl.innerHTML = `<span style="color: #a3be8c;">${active}</span>/${list.length} bật`;
            }
        };
        updateCount('core', CORE_MODULES);
        updateCount('apps', PHONE_APPS);
        updateCount('utils', UTILITY_MODULES);
    }

    if (masterToggle) {
        masterToggle.addEventListener('change', (e) => {
            config.enabled = e.target.checked;
            if (masterStatusText) {
                masterStatusText.textContent = config.enabled ? '🟢 ĐANG BẬT' : '🔴 ĐÃ TẮT';
                masterStatusText.style.color = config.enabled ? '#a3be8c' : '#bf616a';
            }
            savePhoneConfig(config);
        });
    }

    if (enableAllBtn) {
        enableAllBtn.addEventListener('click', () => {
            config.disabled_modules = [];
            updateCheckboxesUI();
            savePhoneConfig(config);
        });
    }

    if (disableAllBtn) {
        disableAllBtn.addEventListener('click', () => {
            config.disabled_modules = [...CORE_MODULES, ...PHONE_APPS, ...UTILITY_MODULES].map(m => m.file);
            updateCheckboxesUI();
            savePhoneConfig(config);
        });
    }

    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            targetWin.location.reload();
        });
    }

    const silentF12Cb = doc.getElementById('kaiz_silent_f12_cb');
    if (silentF12Cb) {
        silentF12Cb.addEventListener('change', (e) => {
            config.silent_f12 = e.target.checked;
            window._kaizSilentF12 = e.target.checked;
            savePhoneConfig(config);
        });
    }

    checkboxes.forEach(cb => {
        cb.addEventListener('change', (e) => {
            const file = e.target.getAttribute('data-file');
            if (!config.disabled_modules) config.disabled_modules = [];
            
            if (e.target.checked) {
                config.disabled_modules = config.disabled_modules.filter(f => f !== file);
            } else {
                if (!config.disabled_modules.includes(file)) {
                    config.disabled_modules.push(file);
                }
            }
            updateCheckboxesUI();
            savePhoneConfig(config);
        });
    });
}

waitForEnvironment(async (targetWin, jq) => {
    console.log('[KAIZ Collection] Đang khởi tạo giao diện quản lý...');
    renderExtensionSettings(targetWin, jq);

    const config = getPhoneConfig();
    if (config.enabled === false) {
        console.log('[KAIZ Collection] ⏸️ Toàn bộ hệ sinh thái đang bị TẮT trong cài đặt Extensions.');
        if (targetWin && targetWin.toastr) {
            targetWin.toastr.info('KAIZ Collection: Hệ sinh thái đang tắt. Bạn có thể bật lại trong tab Extensions.');
        }
        return;
    }

    console.log('[KAIZ Collection] Đang nạp hệ sinh thái & tiện ích...');
    
    // Hàm hỗ trợ load module an toàn độc lập
    async function safeImport(path, name) {
        try {
            await import(path);
            console.log(`[KAIZ Collection] Đã nạp thành công: ${name}`);
            return true;
        } catch (err) {
            console.error(`[KAIZ Collection] ❌ Lỗi khi nạp module "${name}" (${path}):`, err);
            return false;
        }
    }

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    const allModulesToLoad = [...CORE_MODULES, ...PHONE_APPS, ...UTILITY_MODULES];

    for (const app of allModulesToLoad) {
        if (config.disabled_modules && config.disabled_modules.includes(app.file)) {
            console.log(`[KAIZ Collection] ⏸️ Bỏ qua module đã tắt trong cài đặt: ${app.name}`);
            skipCount++;
            continue;
        }
        const ok = await safeImport(app.path, app.name);
        if (ok) successCount++; else failCount++;
    }

    console.log(`[KAIZ Collection] Hoàn tất nạp bộ sưu tập: ${successCount} thành công, ${skipCount} bỏ qua, ${failCount} lỗi.`);
});
