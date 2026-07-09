/**
 * SillyTavern Extension: KAIZ Collection
 * Entry point nạp tự động các module trong hệ sinh thái với cơ chế kiểm tra môi trường sẵn sàng & thu thập log hệ thống.
 */

// ==========================================
// HỆ THỐNG QUẢN LÝ LOG (KAIZ LOGGER)
// ==========================================
window._kaizLogs = window._kaizLogs || [];

function createLogItemElement(item) {
    const div = document.createElement('div');
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
    
    div.style.cssText = `padding: 6px 10px; border-left: 3px solid ${badgeColor}; background: rgba(255,255,255,0.03); border-radius: 4px; display: flex; gap: 8px; align-items: flex-start; word-break: break-all; margin-bottom: 4px;`;
    div.innerHTML = `
        <span style="color: #666; font-size: 0.85em; white-space: nowrap;">[${item.time}]</span>
        <span style="color: ${badgeColor}; background: ${badgeBg}; padding: 1px 6px; border-radius: 3px; font-size: 0.8em; font-weight: bold; white-space: nowrap;">${badgeText}</span>
        <span style="color: var(--SmartThemeBodyColor, #eee); flex: 1;">${item.message}</span>
    `;
    return div;
}

function formatLogArgs(args) {
    return args.map(a => {
        if (typeof a === 'string') return a;
        if (typeof a !== 'object' || a === null) return String(a);
        try {
            // Giới hạn độ dài stringify để tránh đơ lag khi gặp array/object quá lớn của SillyTavern
            const str = JSON.stringify(a);
            return str.length > 1500 ? str.substring(0, 1500) + '... [truncated]' : str;
        } catch (e) {
            return '[Object/Circular]';
        }
    }).join(' ');
}

function logToKaiz(argsOrMsg, type = 'info') {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    const message = Array.isArray(argsOrMsg) ? formatLogArgs(argsOrMsg) : String(argsOrMsg);
    const logItem = { time: timeStr, message: message, type: type };
    
    window._kaizLogs.push(logItem);
    if (window._kaizLogs.length > 800) window._kaizLogs.shift(); // Giữ tối đa 800 dòng log

    // Nếu UI log đang mở/tồn tại trong DOM, cập nhật ngay vào khung log (O(1) append, không re-render lại toàn bộ)
    const logBox = document.getElementById('kaiz_log_box');
    if (logBox) {
        if (logBox.children.length === 1 && logBox.children[0].textContent.includes('Chưa có nhật ký')) {
            logBox.innerHTML = '';
        }
        logBox.appendChild(createLogItemElement(logItem));
        if (logBox.children.length > 800) {
            logBox.removeChild(logBox.children[0]);
        }
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
    // TỐI ƯU HIỆU SUẤT: Chỉ kiểm tra string/number argument để tìm prefix, tuyệt đối không JSON.stringify các object khổng lồ (context, char list) gây nghẽn CPU
    for (let i = 0; i < args.length; i++) {
        if (typeof args[i] === 'string' || typeof args[i] === 'number') {
            const str = String(args[i]).toLowerCase();
            if (kaizPrefixes.some(prefix => str.includes(prefix))) return true;
        }
    }
    return false;
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
            logToKaiz(args, 'info');
            if (window._kaizSilentF12) return;
        }
        origLog.apply(targetConsole, args);
    };

    targetConsole.warn = function(...args) {
        if (isKaizLog(args)) {
            logToKaiz(args, 'warn');
            if (window._kaizSilentF12) return;
        }
        origWarn.apply(targetConsole, args);
    };

    targetConsole.error = function(...args) {
        if (isKaizLog(args)) {
            logToKaiz(args, 'error');
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
    { file: 'lore_world_map.js', path: './modules/lore_world_map.js', name: 'Bản Đồ Thế Giới (Graph AI)', desc: 'AI tự động dựng đồ thị bản đồ từ lịch sử chat, có bóng con riêng' },
    { file: 'shimeji.js', path: './modules/shimeji.js', name: 'Shimeji v14.21', desc: 'Thú cưng tương tác chạy nhảy trên màn hình' },
    { file: 'storage_inspector.js', path: './modules/storage_inspector.js', name: 'Storage Inspector', desc: 'Kiểm tra và quản lý dung lượng lưu trữ' },
    { file: 'visual_novel_dialogue.js', path: './modules/visual_novel_dialogue.js', name: 'Visual Novel Dialogue', desc: 'Hiển thị hội thoại phong cách Visual Novel' },
    { file: 'vtuber_assistant.js', path: './modules/vtuber_assistant.js', name: 'Vtuber Assistant', desc: 'Trợ lý ảo Vtuber hỗ trợ tương tác' }
];

function getPhoneConfig() {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.auto_check_update === undefined) parsed.auto_check_update = true;
            return parsed;
        }
    } catch (e) {
        // Không gọi console.error để tránh đệ quy log vô tận
    }
    return {
        enabled: true,
        disabled_modules: [],
        auto_check_update: true
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
// HỆ THỐNG KIỂM TRA BẢN CẬP NHẬT TỰ ĐỘNG
// ==========================================
const KAIZ_CURRENT_VERSION = '1.4.0.1';

function compareVersions(vA, vB) {
    if (vA === vB) return 0;
    const clean = v => String(v || '0').trim().split(/[.-]/).map(x => {
        const n = parseInt(x, 10);
        return isNaN(n) ? 0 : n;
    });
    const partsA = clean(vA);
    const partsB = clean(vB);
    const len = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < len; i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;
        if (numA > numB) return 1;
        if (numA < numB) return -1;
    }
    return 0;
}

async function getKaizLocalVersion() {
    let localCurrentVersion = KAIZ_CURRENT_VERSION;
    try {
        let selfFolder = 'kaiz-collection';
        try {
            if (typeof import.meta !== 'undefined' && import.meta.url) {
                const parts = import.meta.url.split('/');
                const folder = parts[parts.length - 2];
                if (folder && !['third-party', 'extensions', 'scripts'].includes(folder)) {
                    selfFolder = decodeURIComponent(folder);
                }
            }
        } catch (e) {}

        const localPathsToTry = [];
        try {
            if (typeof import.meta !== 'undefined' && import.meta.url) {
                localPathsToTry.push(new URL('manifest.json', import.meta.url).href);
            }
        } catch (e) {}
        localPathsToTry.push(
            `/scripts/extensions/third-party/${selfFolder}/manifest.json`,
            `/scripts/extensions/${selfFolder}/manifest.json`,
            './manifest.json'
        );

        for (const lp of localPathsToTry) {
            try {
                const resLocal = await fetch(`${lp}?t=${Date.now()}`, { cache: 'no-store' });
                if (resLocal.ok) {
                    const localData = await resLocal.json();
                    if (localData && localData.version) {
                        localCurrentVersion = localData.version;
                        break;
                    }
                }
            } catch (e) {}
        }
    } catch (e) {}
    return localCurrentVersion;
}

async function getKaizCurrentGitBranch(targetWin) {
    const win = targetWin || window;
    let reqHeaders = { 'Content-Type': 'application/json' };
    try {
        if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
            const ctx = win.SillyTavern.getContext();
            if (ctx && typeof ctx.getRequestHeaders === 'function') {
                reqHeaders = Object.assign(reqHeaders, ctx.getRequestHeaders());
            }
        } else if (typeof win.getRequestHeaders === 'function') {
            reqHeaders = Object.assign(reqHeaders, win.getRequestHeaders());
        } else {
            let token = win.token || win.SillyTavern?.token;
            if (!token) {
                const meta = (win.document || document).querySelector('meta[name="csrf-token"]');
                if (meta) token = meta.content;
            }
            if (token) reqHeaders['X-CSRF-Token'] = token;
        }
    } catch (e) {}

    let selfFolder = 'kaiz-collection';
    try {
        if (typeof import.meta !== 'undefined' && import.meta.url) {
            const parts = import.meta.url.split('/');
            const folder = parts[parts.length - 2];
            if (folder && !['third-party', 'extensions', 'scripts'].includes(folder)) {
                selfFolder = decodeURIComponent(folder);
            }
        }
    } catch (e) {}

    const namesToTry = [selfFolder, 'kaiz-collection', 'kaiz_collection', 'kaiz-collection-master', 'kaiz-collection-beta'].filter((v, i, a) => v && a.indexOf(v) === i);
    for (const extName of namesToTry) {
        try {
            const res = await fetch('/api/extensions/version', {
                method: 'POST',
                headers: reqHeaders,
                body: JSON.stringify({ extensionName: extName, global: false })
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.currentBranchName) {
                    return data.currentBranchName;
                }
            }
        } catch (e) {}
    }
    return 'master';
}

async function checkKaizCollectionUpdate(targetWin, manualCheck = false) {
    const doc = targetWin.document || document;
    if (!manualCheck) {
        const config = getPhoneConfig();
        if (config.auto_check_update === false) {
            console.log('[KAIZ Collection] Tự động kiểm tra bản cập nhật khi mở web đang bị TẮT trong cài đặt.');
            return;
        }
    }

    try {
        const currentBranch = await getKaizCurrentGitBranch(targetWin);
        if (manualCheck && targetWin.toastr) {
            targetWin.toastr.info(`Đang kiểm tra bản cập nhật từ GitHub (nhánh: ${currentBranch})...`);
        }
        console.log(`[KAIZ Collection] Đang kiểm tra cập nhật trên nhánh Git hiện tại: "${currentBranch}"`);

        // Lấy chính xác phiên bản cục bộ đang chạy (ưu tiên đọc trực tiếp từ manifest.json cục bộ)
        let localCurrentVersion = await getKaizLocalVersion();

        // Lấy manifest từ đúng nhánh Git hiện tại (beta, master, ...) để tránh xung đột
        let remoteManifest = null;
        try {
            const resRef = await fetch(`https://raw.githubusercontent.com/Khanhhpk/kaiz-collection/refs/heads/${currentBranch}/manifest.json?t=${Date.now()}`, { cache: 'no-store' });
            if (resRef.ok) remoteManifest = await resRef.json();
        } catch (e) {}

        if (!remoteManifest || compareVersions(remoteManifest.version, localCurrentVersion) <= 0) {
            try {
                const resApi = await fetch(`https://api.github.com/repos/Khanhhpk/kaiz-collection/contents/manifest.json?ref=${currentBranch}&t=${Date.now()}`, { cache: 'no-store' });
                if (resApi.ok) {
                    const apiData = await resApi.json();
                    if (apiData && apiData.content) {
                        const decoded = JSON.parse(decodeURIComponent(escape(atob(apiData.content))));
                        if (decoded && decoded.version && compareVersions(decoded.version, remoteManifest?.version || '0') > 0) {
                            remoteManifest = decoded;
                        }
                    }
                }
            } catch (e) {}
        }

        if (!remoteManifest) {
            const res = await fetch(`https://raw.githubusercontent.com/Khanhhpk/kaiz-collection/${currentBranch}/manifest.json?t=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            remoteManifest = await res.json();
        }
        const remoteVersion = remoteManifest.version || localCurrentVersion;

        if (compareVersions(remoteVersion, localCurrentVersion) > 0) {
            const skippedVer = localStorage.getItem(`kaiz_skip_update_version_${currentBranch}`);
            const dismissedInSession = sessionStorage.getItem(`kaiz_dismissed_session_${currentBranch}_${remoteVersion}`);
            if (!manualCheck && (skippedVer === remoteVersion || dismissedInSession === 'true')) {
                console.log(`[KAIZ Collection] Bỏ qua thông báo cập nhật v${remoteVersion} trên nhánh ${currentBranch} (đã chọn bỏ qua trong phiên này).`);
                return;
            }
            showKaizUpdateModal(targetWin, remoteVersion, remoteManifest.description || '', currentBranch, localCurrentVersion);
        } else if (manualCheck) {
            if (targetWin.toastr) {
                targetWin.toastr.success(`✅ KAIZ Collection đang ở phiên bản mới nhất (v${localCurrentVersion} - nhánh ${currentBranch})!`);
            }
        }
    } catch (err) {
        console.warn('[KAIZ Collection] Lỗi kiểm tra bản cập nhật:', err);
        if (manualCheck && targetWin.toastr) {
            targetWin.toastr.error('❌ Không thể kết nối tới GitHub để kiểm tra cập nhật!');
        }
    }
}


function showKaizUpdateModal(targetWin, remoteVersion, remoteDesc, currentBranch = 'master', localCurrentVersion = KAIZ_CURRENT_VERSION) {
    const doc = targetWin.document || document;
    if (doc.getElementById('kaiz_update_modal_overlay')) {
        doc.getElementById('kaiz_update_modal_overlay').remove();
    }

    const overlay = doc.createElement('div');
    overlay.id = 'kaiz_update_modal_overlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.78); z-index: 99999999; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; overflow-y: auto; backdrop-filter: blur(8px);';

    const modal = doc.createElement('div');
    modal.style.cssText = 'margin: auto; background: linear-gradient(145deg, #1e293b, #0f172a); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 20px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; padding: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.6); color: #f8fafc; font-family: sans-serif; display: flex; flex-direction: column; gap: 16px; box-sizing: border-box; flex-shrink: 0; position: relative;';
    
    modal.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px;">
            <div style="width: 48px; height: 48px; border-radius: 14px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.5em; flex-shrink: 0;">
                <i class="fa-solid fa-cloud-arrow-up"></i>
            </div>
            <div>
                <div style="font-weight: 800; font-size: 1.15em; color: #38bdf8; letter-spacing: 0.3px;">PHÁT HIỆN BẢN CẬP NHẬT MỚI</div>
                <div style="font-size: 0.85em; color: #94a3b8; margin-top: 2px;">KAIZ Collection (<span style="color: #c084fc; font-weight: bold;">Nhánh: ${currentBranch}</span>)</div>
            </div>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);">
            <div>
                <span style="font-size: 0.78em; color: #64748b; display: block; text-transform: uppercase; font-weight: bold;">Phiên bản hiện tại</span>
                <span style="font-size: 1.1em; font-weight: 700; color: #cbd5e1;">v${localCurrentVersion}</span>
            </div>
            <i class="fa-solid fa-arrow-right-long" style="color: #38bdf8; font-size: 1.2em;"></i>
            <div style="text-align: right;">
                <span style="font-size: 0.78em; color: #64748b; display: block; text-transform: uppercase; font-weight: bold;">Phiên bản mới</span>
                <span style="font-size: 1.1em; font-weight: 800; color: #34d399;">v${remoteVersion}</span>
            </div>
        </div>
        <div style="font-size: 0.9em; color: #cbd5e1; line-height: 1.6;">
            Đã có bản cập nhật mới trên nhánh <b style="color: #c084fc;">${currentBranch}</b> với nhiều nâng cấp và tối ưu. Bạn có muốn kéo bản cập nhật của nhánh này ngay không?
        </div>
        <div id="kaiz_update_status_box" style="font-size: 0.88em;"></div>
        <div style="display: flex; gap: 10px; margin-top: 6px; flex-wrap: wrap;">
            <button id="kaiz_btn_do_update" style="flex: 1; min-width: 140px; padding: 12px 18px; background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; font-weight: 700; font-size: 0.94em; border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 16px rgba(37, 99, 235, 0.4); display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform 0.15s;">
                <i class="fa-solid fa-bolt"></i> CẬP NHẬT NHÁNH "${currentBranch.toUpperCase()}"
            </button>
            <button id="kaiz_btn_skip_update" style="padding: 12px 16px; background: rgba(255,255,255,0.05); color: #f87171; font-weight: 600; font-size: 0.9em; border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 12px; cursor: pointer; transition: all 0.15s;">
                Bỏ qua bản này
            </button>
            <button id="kaiz_btn_close_modal" style="padding: 12px 16px; background: rgba(255,255,255,0.05); color: #94a3b8; font-weight: 600; font-size: 0.9em; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; cursor: pointer; transition: all 0.15s;">
                Để sau
            </button>
        </div>
    `;

    overlay.appendChild(modal);
    (doc.documentElement || doc.body).appendChild(overlay);

    const statusBox = modal.querySelector('#kaiz_update_status_box');
    const btnUpdate = modal.querySelector('#kaiz_btn_do_update');
    const btnSkip = modal.querySelector('#kaiz_btn_skip_update');
    const btnClose = modal.querySelector('#kaiz_btn_close_modal');

    btnUpdate.addEventListener('click', async () => {
        btnUpdate.disabled = true;
        btnUpdate.style.opacity = '0.6';
        statusBox.innerHTML = `<div style="color: #38bdf8; padding: 8px 0;"><i class="fa-solid fa-spinner fa-spin"></i> Đang yêu cầu máy chủ SillyTavern tự động kéo bản cập nhật nhánh <b>${currentBranch}</b>...</div>`;
        try {
            // Lấy header chuẩn từ SillyTavern (bao gồm X-CSRF-Token bắt buộc cho POST API)
            const win = targetWin || window;
            let reqHeaders = { 'Content-Type': 'application/json' };
            try {
                if (win.SillyTavern && typeof win.SillyTavern.getContext === 'function') {
                    const ctx = win.SillyTavern.getContext();
                    if (ctx && typeof ctx.getRequestHeaders === 'function') {
                        reqHeaders = Object.assign(reqHeaders, ctx.getRequestHeaders());
                    }
                } else if (typeof win.getRequestHeaders === 'function') {
                    reqHeaders = Object.assign(reqHeaders, win.getRequestHeaders());
                } else {
                    let token = win.token || win.SillyTavern?.token;
                    if (!token) {
                        const meta = (win.document || document).querySelector('meta[name="csrf-token"]');
                        if (meta) token = meta.content;
                    }
                    if (token) reqHeaders['X-CSRF-Token'] = token;
                }
            } catch (e) {}

            // Tự động nhận diện thư mục cài đặt hiện tại của Extension
            let selfFolder = 'kaiz-collection';
            try {
                if (typeof import.meta !== 'undefined' && import.meta.url) {
                    const parts = import.meta.url.split('/');
                    const folder = parts[parts.length - 2];
                    if (folder && !['third-party', 'extensions', 'scripts'].includes(folder)) {
                        selfFolder = decodeURIComponent(folder);
                    }
                }
            } catch (e) {}

            const namesToTry = [selfFolder, 'kaiz-collection', 'kaiz_collection', 'kaiz-collection-master', 'kaiz-collection-beta'].filter((v, i, a) => v && a.indexOf(v) === i);
            let updatedOk = false;

            for (const extName of namesToTry) {
                try {
                    let res = await fetch('/api/extensions/update', {
                        method: 'POST',
                        headers: reqHeaders,
                        body: JSON.stringify({ extensionName: extName, global: false })
                    });
                    if (res.ok) {
                        updatedOk = true;
                        break;
                    }
                } catch (e) {
                    console.warn(`[KAIZ Collection] Thử cập nhật folder "${extName}" thất bại:`, e);
                }
            }

            if (updatedOk) {
                statusBox.innerHTML = `<div style="color: #34d399; font-weight: bold; padding: 8px 0;"><i class="fa-solid fa-circle-check"></i> 🎉 Đã cập nhật thành công nhánh ${currentBranch} lên v${remoteVersion}! Đang tải lại web...</div>`;
                if (targetWin.toastr) targetWin.toastr.success(`🎉 Đã cập nhật KAIZ Collection (nhánh ${currentBranch}) thành công lên v${remoteVersion}!`);
                setTimeout(() => targetWin.location.reload(), 1600);
                return;
            }
        } catch (err) {
            console.warn('[KAIZ Collection] Lỗi gọi API update:', err);
        }
        statusBox.innerHTML = `
            <div style="color: #fbbf24; font-size: 0.92em; line-height: 1.5; background: rgba(251, 191, 36, 0.12); padding: 12px; border-radius: 10px; border: 1px solid rgba(251, 191, 36, 0.35);">
                <b>⚠️ Chưa thể cập nhật tự động qua máy chủ SillyTavern.</b><br>
                Vui lòng kiểm tra trong tab Extensions của SillyTavern hoặc bấm nút bên dưới để mở nhánh <b>${currentBranch}</b> trên GitHub!
            </div>
            <div style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
                <a href="https://github.com/Khanhhpk/kaiz-collection/tree/${currentBranch}" target="_blank" style="padding: 8px 16px; background: #38bdf8; color: #0f172a; font-weight: bold; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa-brands fa-github"></i> Mở nhánh "${currentBranch}" trên GitHub
                </a>
                <button onclick="window.location.reload()" style="padding: 8px 16px; background: #475569; color: #fff; border-radius: 8px; border: none; cursor: pointer; font-weight: bold;">Làm mới trang</button>
            </div>
        `;
    });

    btnSkip.addEventListener('click', () => {
        localStorage.setItem(`kaiz_skip_update_version_${currentBranch}`, remoteVersion);
        sessionStorage.setItem(`kaiz_dismissed_session_${currentBranch}_${remoteVersion}`, 'true');
        overlay.remove();
        if (targetWin.toastr) targetWin.toastr.info(`Đã bỏ qua thông báo cập nhật v${remoteVersion} của nhánh ${currentBranch}.`);
    });

    btnClose.addEventListener('click', () => {
        sessionStorage.setItem(`kaiz_dismissed_session_${currentBranch}_${remoteVersion}`, 'true');
        overlay.remove();
    });
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
            <div class="pe-module-item" style="display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; margin: 6px 0; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; transition: all 0.25s ease;">
                <label style="display: flex; align-items: center; gap: 14px; cursor: pointer; flex: 1; margin: 0; user-select: none;">
                    <input type="checkbox" class="pe_module_checkbox" data-file="${mod.file}" ${isChecked ? 'checked' : ''} style="width: 17px; height: 17px; cursor: pointer; accent-color: #38bdf8; flex-shrink: 0;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #f8fafc; font-size: 0.94em; letter-spacing: 0.2px;">${mod.name}</div>
                        <div style="font-size: 0.78em; color: #64748b; margin-top: 3px; line-height: 1.3;">${mod.desc}</div>
                    </div>
                </label>
                <span class="pe-status-badge" style="font-size: 0.72em; font-weight: 600; padding: 4px 12px; border-radius: 20px; background: ${isChecked ? 'rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.25);' : 'rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.25);'}; white-space: nowrap; transition: all 0.2s; display: flex; align-items: center; gap: 6px;">
                    <i class="fa-solid ${isChecked ? 'fa-circle-check' : 'fa-circle-xmark'}"></i><span>${isChecked ? 'Đang bật' : 'Đã tắt'}</span>
                </span>
            </div>`;
        }).join('');
    }

    function buildAccordionHtml(id, iconHtml, title, subtitle, colorTheme, modulesList) {
        const count = modulesList.length;
        const activeCount = modulesList.filter(m => !(config.disabled_modules && config.disabled_modules.includes(m.file))).length;
        return `
        <div class="kaiz-accordion-section" style="background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.3); transition: border-color 0.3s ease;">
            <div class="kaiz-accordion-header" data-target="kaiz_acc_body_${id}" style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: rgba(255, 255, 255, 0.025); cursor: pointer; user-select: none; transition: background 0.2s; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="width: 38px; height: 38px; border-radius: 10px; background: ${colorTheme}1a; border: 1px solid ${colorTheme}33; display: flex; align-items: center; justify-content: center; color: ${colorTheme}; font-size: 1.15em;">
                        ${iconHtml}
                    </div>
                    <div>
                        <div style="font-weight: 700; font-size: 0.96em; color: #f8fafc; letter-spacing: 0.2px;">${title}</div>
                        <div style="font-size: 0.76em; color: #64748b; margin-top: 2px;">${subtitle}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="kaiz-acc-badge-${id}" style="font-size: 0.75em; background: rgba(0,0,0,0.45); color: #cbd5e1; padding: 4px 12px; border-radius: 14px; font-weight: 600; border: 1px solid rgba(255,255,255,0.08);">
                        <span style="color: #34d399; font-weight: bold;">${activeCount}</span>/${count} bật
                    </span>
                    <span id="kaiz_acc_icon_${id}" style="font-size: 0.8em; color: #64748b; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: rotate(-90deg); display: inline-block;">▼</span>
                </div>
            </div>
            <div id="kaiz_acc_body_${id}" class="kaiz-accordion-body" style="display: none; padding: 12px 14px; background: rgba(0,0,0,0.25); flex-direction: column; gap: 6px;">
                ${buildModuleListHtml(modulesList)}
            </div>
        </div>`;
    }

    section.innerHTML = `
    <style>
        .kaiz-tab-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .pe-module-item:hover { background: rgba(255,255,255,0.06) !important; border-color: rgba(56,189,248,0.3) !important; transform: translateX(3px); }
        .kaiz-accordion-header:hover { background: rgba(255,255,255,0.06) !important; }
        #pe_reload_btn:hover { background: rgba(56, 189, 248, 0.18) !important; border-color: #38bdf8 !important; color: #ffffff !important; box-shadow: 0 0 16px rgba(56, 189, 248, 0.3) !important; transform: translateY(-1px); }
        #pe_enable_all_btn:hover { background: rgba(16, 185, 129, 0.22) !important; border-color: #34d399 !important; box-shadow: 0 0 12px rgba(52, 211, 153, 0.25); }
        #pe_disable_all_btn:hover { background: rgba(239, 68, 68, 0.22) !important; border-color: #f87171 !important; box-shadow: 0 0 12px rgba(248, 113, 113, 0.25); }
        #kaiz_log_clear_btn:hover { background: rgba(239, 68, 68, 0.22) !important; border-color: #f87171 !important; }
    </style>
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header" style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fa-solid fa-layer-group" style="color: #38bdf8; font-size: 1.1em;"></i>
                <b style="font-size: 1.02em; color: #f8fafc; letter-spacing: 0.3px;">KAIZ Collection <span id="kaiz_version_display" style="font-size:11.5px;color:#38bdf8;background:rgba(56,189,248,0.15);padding:2px 8px;border-radius:12px;margin-left:6px;border:1px solid rgba(56,189,248,0.3);vertical-align:middle;font-weight:700;">v...</span></b>
            </div>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down" style="color: #64748b;"></div>
        </div>
        <div class="inline-drawer-content" style="display: none; padding: 16px; flex-direction: column; gap: 18px;">
            <!-- Tab Navigation Buttons -->
            <div style="display: flex; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px;">
                <button id="kaiz_tab_btn_modules" class="kaiz-tab-btn" style="flex: 1; padding: 11px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; border: 1px solid rgba(56, 189, 248, 0.35); background: rgba(56, 189, 248, 0.12); color: #38bdf8; transition: all 0.2s; box-shadow: 0 0 12px rgba(56, 189, 248, 0.12); font-size: 0.92em; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid fa-cubes-stacked"></i><span>Quản lý Module (28)</span>
                </button>
                <button id="kaiz_tab_btn_logs" class="kaiz-tab-btn" style="flex: 1; padding: 11px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.07); background: rgba(255, 255, 255, 0.03); color: #94a3b8; transition: all 0.2s; font-size: 0.92em; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-solid fa-terminal"></i><span>Nhật ký & Console</span>
                </button>
            </div>

            <!-- TAB 1: MODULES MANAGEMENT -->
            <div id="kaiz_tab_content_modules" style="display: flex; flex-direction: column; gap: 16px;">
                <!-- Master Control Block -->
                <div style="padding: 18px; background: rgba(18, 24, 36, 0.7); border: 1px solid rgba(56, 189, 248, 0.22); border-radius: 14px; box-shadow: 0 6px 24px rgba(0,0,0,0.4); backdrop-filter: blur(10px);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 12px;">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 1.3em; box-shadow: 0 0 12px rgba(56, 189, 248, 0.2);">
                                <i class="fa-solid fa-sliders"></i>
                            </div>
                            <div>
                                <div style="font-size: 1.05em; font-weight: 700; color: #f8fafc; letter-spacing: 0.3px;">Công tắc Chính (Master Switch)</div>
                                <div style="font-size: 0.78em; color: #64748b; margin-top: 3px;">Điều khiển toàn bộ hệ sinh thái KAIZ Collection</div>
                            </div>
                        </div>
                        <label class="checkbox_label" style="margin: 0; cursor: pointer; display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); padding: 7px 16px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.08);">
                            <input type="checkbox" id="pe_master_toggle" ${config.enabled ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer; accent-color: #34d399;">
                            <span id="pe_master_status_text" style="font-weight: 700; font-size: 0.88em; color: ${config.enabled ? '#34d399' : '#f87171'}; display: flex; align-items: center; gap: 6px;">
                                <i class="fa-solid ${config.enabled ? 'fa-circle-check' : 'fa-circle-xmark'}"></i><span>${config.enabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}</span>
                            </span>
                        </label>
                    </div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px;">
                        <button id="pe_enable_all_btn" style="flex: 1; min-width: 130px; padding: 10px 14px; font-size: 0.88em; background: rgba(16, 185, 129, 0.12) !important; color: #34d399 !important; border: 1px solid rgba(52, 211, 153, 0.3) !important; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-check-double"></i><span>Bật tất cả</span>
                        </button>
                        <button id="pe_disable_all_btn" style="flex: 1; min-width: 130px; padding: 10px 14px; font-size: 0.88em; background: rgba(239, 68, 68, 0.12) !important; color: #f87171 !important; border: 1px solid rgba(248, 113, 113, 0.3) !important; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-power-off"></i><span>Tắt tất cả</span>
                        </button>
                    </div>
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 14px;">
                        <button id="pe_reload_btn" style="flex: 1; min-width: 140px; padding: 12px 16px; background: rgba(30, 41, 59, 0.85) !important; color: #38bdf8 !important; border: 1px solid rgba(56, 189, 248, 0.4) !important; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 0.9em; letter-spacing: 0.3px; transition: all 0.25s ease; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-rotate-right" style="font-size: 1.1em;"></i>
                            <span>LÀM MỚI TRANG (F5)</span>
                        </button>
                        <button id="pe_check_update_btn" style="flex: 1; min-width: 160px; padding: 12px 16px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2)) !important; color: #c084fc !important; border: 1px solid rgba(192, 132, 252, 0.4) !important; border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 0.9em; letter-spacing: 0.3px; transition: all 0.25s ease; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-cloud-arrow-down" style="font-size: 1.1em;"></i>
                            <span>KIỂM TRA CẬP NHẬT</span>
                        </button>
                    </div>
                    <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span style="font-size: 0.84em; color: #cbd5e1; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-bell" style="color: #c084fc;"></i>
                            <span>Tự động kiểm tra và thông báo bản cập nhật mới khi mở/làm mới trang:</span>
                        </span>
                        <label class="checkbox_label" style="margin: 0; cursor: pointer; display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.35); padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.06);">
                            <input type="checkbox" id="kaiz_auto_check_update_cb" ${config.auto_check_update !== false ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #c084fc;">
                            <span id="kaiz_auto_check_update_status" style="font-weight: 700; font-size: 0.84em; color: ${config.auto_check_update !== false ? '#c084fc' : '#94a3b8'};">
                                ${config.auto_check_update !== false ? 'Đang Bật' : 'Đã Tắt'}
                            </span>
                        </label>
                    </div>
                </div>

                <!-- Accordion Section 1: Core Modules -->
                ${buildAccordionHtml('core', '<i class="fa-solid fa-microchip"></i>', 'Lõi Hệ thống (Core Masters)', 'Các module nền tảng và quản lý cốt lõi', '#fbbf24', CORE_MODULES)}

                <!-- Accordion Section 2: Phone Apps -->
                ${buildAccordionHtml('apps', '<i class="fa-solid fa-mobile-screen-button"></i>', 'Ứng dụng Điện thoại (Phone Apps)', 'Hệ sinh thái ứng dụng giả lập điện thoại', '#38bdf8', PHONE_APPS)}

                <!-- Accordion Section 3: Utilities -->
                ${buildAccordionHtml('utils', '<i class="fa-solid fa-toolbox"></i>', 'Tiện ích Độc lập (Utilities & Assistants)', 'Thú cưng, trợ lý ảo, kiểm tra dung lượng', '#a855f7', UTILITY_MODULES)}
            </div>

            <!-- TAB 2: LOGS & CONSOLE -->
            <div id="kaiz_tab_content_logs" style="display: none; flex-direction: column; gap: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(18, 24, 36, 0.7); padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); flex-wrap: wrap; gap: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 0.9em; font-weight: 700; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
                            <i class="fa-solid fa-terminal" style="color: #38bdf8;"></i><span>Nhật ký Hệ thống (Real-time Console):</span>
                        </span>
                        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.82em; color: #94a3b8; cursor: pointer; user-select: none;">
                            <input type="checkbox" id="kaiz_silent_f12_cb" ${config.silent_f12 ? 'checked' : ''} style="cursor: pointer; accent-color: #38bdf8; width: 16px; height: 16px;">
                            <span>Ẩn log khỏi Console Web (F12) để giảm rác</span>
                        </label>
                    </div>
                    <button id="kaiz_log_clear_btn" style="padding: 8px 14px; font-size: 0.85em; border-radius: 8px; border: 1px solid rgba(248, 113, 113, 0.3) !important; background: rgba(239, 68, 68, 0.12) !important; color: #f87171 !important; cursor: pointer; font-weight: 600; transition: all 0.2s; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-trash-can"></i><span>Xóa Log</span>
                    </button>
                </div>
                <div id="kaiz_log_box" style="height: 420px; overflow-y: auto; background: rgba(10, 14, 23, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; font-family: 'Consolas', 'Courier New', monospace; font-size: 0.86em; display: flex; flex-direction: column; gap: 6px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.6);">
                    <div style="color: #64748b; text-align: center; padding: 30px;"><i class="fa-solid fa-inbox" style="font-size: 2em; margin-bottom: 8px; display: block; opacity: 0.5;"></i>Chưa có nhật ký hoạt động nào.</div>
                </div>
            </div>
        </div>
    </div>`;

    container.appendChild(section);

    getKaizLocalVersion().then(v => {
        const span = doc.getElementById('kaiz_version_display');
        if (span) span.innerText = 'v' + v;
    });

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
            logBox.innerHTML = '<div style="color: #64748b; text-align: center; padding: 30px;"><i class="fa-solid fa-inbox" style="font-size: 2em; margin-bottom: 8px; display: block; opacity: 0.5;"></i>Chưa có nhật ký hoạt động nào.</div>';
            return;
        }
        logs.forEach(item => {
            logBox.appendChild(createLogItemElement(item));
        });
        logBox.scrollTop = logBox.scrollHeight;
    }

    if (tabBtnModules && tabBtnLogs) {
        tabBtnModules.addEventListener('click', () => {
            tabBtnModules.style.background = 'rgba(56, 189, 248, 0.12)';
            tabBtnModules.style.color = '#38bdf8';
            tabBtnModules.style.borderColor = 'rgba(56, 189, 248, 0.35)';
            tabBtnModules.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.12)';
            
            tabBtnLogs.style.background = 'rgba(255, 255, 255, 0.03)';
            tabBtnLogs.style.color = '#94a3b8';
            tabBtnLogs.style.borderColor = 'rgba(255, 255, 255, 0.07)';
            tabBtnLogs.style.boxShadow = 'none';

            contentModules.style.display = 'flex';
            contentLogs.style.display = 'none';
        });

        tabBtnLogs.addEventListener('click', () => {
            tabBtnLogs.style.background = 'rgba(56, 189, 248, 0.12)';
            tabBtnLogs.style.color = '#38bdf8';
            tabBtnLogs.style.borderColor = 'rgba(56, 189, 248, 0.35)';
            tabBtnLogs.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.12)';
            
            tabBtnModules.style.background = 'rgba(255, 255, 255, 0.03)';
            tabBtnModules.style.color = '#94a3b8';
            tabBtnModules.style.borderColor = 'rgba(255, 255, 255, 0.07)';
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
                badge.style.background = isChecked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)';
                badge.style.color = isChecked ? '#34d399' : '#f87171';
                badge.style.border = isChecked ? '1px solid rgba(52, 211, 153, 0.25)' : '1px solid rgba(248, 113, 113, 0.25)';
                badge.innerHTML = `<i class="fa-solid ${isChecked ? 'fa-circle-check' : 'fa-circle-xmark'}"></i><span>${isChecked ? 'Đang bật' : 'Đã tắt'}</span>`;
            }
        });

        // Cập nhật số lượng active trên các header accordion
        const updateCount = (id, list) => {
            const badgeEl = section.querySelector(`.kaiz-acc-badge-${id}`);
            if (badgeEl) {
                const active = list.filter(m => !(config.disabled_modules && config.disabled_modules.includes(m.file))).length;
                badgeEl.innerHTML = `<span style="color: #34d399; font-weight: bold;">${active}</span>/${list.length} bật`;
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
                masterStatusText.innerHTML = `<i class="fa-solid ${config.enabled ? 'fa-circle-check' : 'fa-circle-xmark'}"></i><span>${config.enabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}</span>`;
                masterStatusText.style.color = config.enabled ? '#34d399' : '#f87171';
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

    const checkUpdateBtn = doc.getElementById('pe_check_update_btn');
    if (checkUpdateBtn) {
        checkUpdateBtn.addEventListener('click', () => {
            checkKaizCollectionUpdate(targetWin, true);
        });
    }

    const autoCheckUpdateCb = doc.getElementById('kaiz_auto_check_update_cb');
    if (autoCheckUpdateCb) {
        autoCheckUpdateCb.addEventListener('change', (e) => {
            config.auto_check_update = e.target.checked;
            const statusText = doc.getElementById('kaiz_auto_check_update_status');
            if (statusText) {
                statusText.textContent = e.target.checked ? 'Đang Bật' : 'Đã Tắt';
                statusText.style.color = e.target.checked ? '#c084fc' : '#94a3b8';
            }
            savePhoneConfig(config);
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
    checkKaizCollectionUpdate(targetWin, false);

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

    // TỐI ƯU HIỆU SUẤT: Nạp song song (concurrently) để giảm thời gian load từ 3s xuống 0.3s
    // Bước 1: Nạp song song Core Modules trước để đảm bảo nền tảng sẵn sàng
    await Promise.all(CORE_MODULES.map(async (app) => {
        if (config.disabled_modules && config.disabled_modules.includes(app.file)) {
            console.log(`[KAIZ Collection] ⏸️ Bỏ qua module đã tắt: ${app.name}`);
            skipCount++;
            return;
        }
        const ok = await safeImport(app.path, app.name);
        if (ok) successCount++; else failCount++;
    }));

    // Bước 2: Nạp song song toàn bộ Phone Apps & Utilities
    const otherModules = [...PHONE_APPS, ...UTILITY_MODULES];
    await Promise.all(otherModules.map(async (app) => {
        if (config.disabled_modules && config.disabled_modules.includes(app.file)) {
            console.log(`[KAIZ Collection] ⏸️ Bỏ qua module đã tắt: ${app.name}`);
            skipCount++;
            return;
        }
        const ok = await safeImport(app.path, app.name);
        if (ok) successCount++; else failCount++;
    }));

    console.log(`[KAIZ Collection] Hoàn tất nạp bộ sưu tập: ${successCount} thành công, ${skipCount} bỏ qua, ${failCount} lỗi.`);
});
