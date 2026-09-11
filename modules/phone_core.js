/**
 * Module chính Điện thoại nhỏ - Phiên bản Script JS Trợ thủ Quán rượu 
 * Đã Mod: Z-index, thu phóng, Cài đặt độ to màn hình, Cỡ chữ, Độ to Icon.
 * Nâng cấp: Phân trang App, Lướt chuyển trang, Chấm chỉ báo, Hỗ trợ lăn chuột.
 * MỚI: Tùy chỉnh số lượng App/Trang, Fix vị trí chấm chỉ báo, Thêm tiện ích Sandbox cho Dev.
 * BỔ SUNG: Giao diện và Logic cấu hình Temperature, Top P, Max Tokens.
 * DỌN DẸP: Code dư thừa.
 */

// ============ Tham số cấu hình mặc định ============
const PHONE_CONFIG = {
    id: 'tavern-phone-system',
    phoneWidth: 408,
    phoneHeight: 880,
    iconSize: 60, 
    appsPerPage: 20, // Số App mỗi trang mặc định
    frameImage: '/scripts/extensions/third-party/kaiz-collection/assets/phone-frame.png',
    defaultWallpaper: '/scripts/extensions/third-party/kaiz-collection/assets/wallpaper.jpg',
    storageKey: 'tavernPhoneSettings',
};

// ============ Lấy document của trang cha ============
const parentDocument = window.parent.document;

// ============ Hàm tiện ích ============
function getStorageKey(suffix) {
    let characterName = 'default';
    try {
        if (typeof getCharacterName === 'function') {
            characterName = getCharacterName() || 'default';
        }
    } catch (e) { }
    return PHONE_CONFIG.storageKey + '_' + characterName + (suffix ? '_' + suffix : '');
}

// ============ Quản lý trạng thái toàn cục ============
window.parent.PhoneSystem = window.parent.PhoneSystem || {
    isOpen: false,
    currentApp: null,
    registeredApps: new Map(),
    appRenderers: {},
    settings: null,
    eventListeners: new Map(),
    iframeWindow: null,
    holdTriggered: false,

    // TÍCH HỢP SANDBOX SUPPORT CHO TƯƠNG LAI (KHÔNG PHÁ VỠ CẤU TRÚC CŨ)
    utils: {
        /**
         * Tiện ích giúp các Dev App tương lai bọc nội dung App của họ vào một iframe cách ly (Sandbox).
         * Ngăn chặn việc CSS hoặc JS của App can thiệp/phá vỡ giao diện hệ thống Phone hoặc SillyTavern.
         * Cách dùng: window.parent.PhoneSystem.utils.createAppSandbox(container, "<h1>Hello</h1>", false);
         */
        createAppSandbox: function(container, urlOrHtml, isUrl) {
            if (!container) return null;
            container.innerHTML = ''; // Dọn dẹp container trống
            var iframe = document.createElement('iframe');
            iframe.style.cssText = 'width:100%;height:100%;border:none;background:#fff;';
            if (isUrl) iframe.src = urlOrHtml;
            else iframe.srcdoc = urlOrHtml;
            container.appendChild(iframe);
            return iframe.contentWindow; // Trả về window của iframe để dev có thể tương tác sâu hơn nếu cần
        }
    },

    registerApp: function (appConfig) {
        var id = appConfig.id;
        var name = appConfig.name;
        var icon = appConfig.icon;
        var color = appConfig.color;
        var order = appConfig.order || 99;
        if (!id || !name) {
            console.error('[PhoneSystem] Đăng ký APP thất bại: thiếu tham số bắt buộc');
            return false;
        }
        this.registeredApps.set(id, { id: id, name: name, icon: icon, color: color, order: order });
        console.log('[PhoneSystem] APP đã đăng ký:', name);
        this.emit('app-registered', { id: id, name: name });
        if (this.iframeWindow) {
            this.iframeWindow.postMessage({ type: 'render-apps' }, '*');
        }
        return true;
    },

    registerRenderer: function(appId, rendererFunction) {
        if (!appId || typeof rendererFunction !== 'function') return false;
        this.appRenderers[appId] = rendererFunction;
        return true;
    },

    openApp: function (appId) {
        var app = this.registeredApps.get(appId);
        if (!app) return;
        this.currentApp = appId;
        this.emit('app-opened', { id: appId, app: app });
        if (this.iframeWindow) {
            this.iframeWindow.postMessage({ type: 'open-app', appId: appId }, '*');
        }
    },

    goHome: function () {
        this.currentApp = null;
        this.emit('go-home');
        if (this.iframeWindow) {
            this.iframeWindow.postMessage({ type: 'go-home' }, '*');
        }
    },

    getSettings: function () {
        if (!this.settings) this.loadSettings();
        return this.settings;
    },

    loadSettings: function () {
        try {
            var saved = localStorage.getItem(getStorageKey());
            this.settings = saved ? JSON.parse(saved) : this.getDefaultSettings();
            if (!this.settings.wallpaper || this.settings.wallpaper.includes('wallpaperflare.com')) { this.settings.wallpaper = PHONE_CONFIG.defaultWallpaper; }
            if (!this.settings.phoneWidth) this.settings.phoneWidth = PHONE_CONFIG.phoneWidth;
            if (!this.settings.phoneHeight) this.settings.phoneHeight = PHONE_CONFIG.phoneHeight;
            if (this.settings.fontScale === undefined) this.settings.fontScale = 1.0;
            if (this.settings.iconSize === undefined) this.settings.iconSize = PHONE_CONFIG.iconSize || 60;
            if (this.settings.appsPerPage === undefined) this.settings.appsPerPage = PHONE_CONFIG.appsPerPage || 20;
            if (this.settings.isMultitasking === undefined) this.settings.isMultitasking = false;
            
            // Đảm bảo các thông số API mới tồn tại
            if (!this.settings.apiConfig) this.settings.apiConfig = this.getDefaultSettings().apiConfig;
            if (this.settings.apiConfig.topP === undefined) this.settings.apiConfig.topP = 1.0;
            if (this.settings.apiConfig.temperature === undefined) this.settings.apiConfig.temperature = 0.85;
            if (this.settings.apiConfig.maxTokens === undefined) this.settings.apiConfig.maxTokens = 6000;
        } catch (e) {
            this.settings = this.getDefaultSettings();
        }
        return this.settings;
    },

    saveSettings: function (newSettings) {
        this.settings = Object.assign({}, this.settings, newSettings);
        try {
            localStorage.setItem(getStorageKey(), JSON.stringify(this.settings));
            this.emit('settings-changed', this.settings);
        } catch (e) { }
    },

    getDefaultSettings: function () {
        return {
            wallpaper: PHONE_CONFIG.defaultWallpaper,
            phoneWidth: PHONE_CONFIG.phoneWidth,
            phoneHeight: PHONE_CONFIG.phoneHeight,
            fontScale: 1.0,
            iconSize: PHONE_CONFIG.iconSize || 60,
            appsPerPage: PHONE_CONFIG.appsPerPage || 20,
            isMultitasking: false,
            apiConfig: { provider: 'openai', apiKey: '', apiUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', maxTokens: 6000, temperature: 0.85, topP: 1.0 },
        };
    },

    on: function (event, callback) {
        if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
        this.eventListeners.get(event).push(callback);
    },

    off: function (event, callback) {
        if (!this.eventListeners.has(event)) return;
        var listeners = this.eventListeners.get(event);
        var index = listeners.indexOf(callback);
        if (index > -1) listeners.splice(index, 1);
    },

    emit: function (event, data) {
        if (!this.eventListeners.has(event)) return;
        this.eventListeners.get(event).forEach(function (cb) {
            try { cb(data); } catch (e) {}
        });
    },

    callExternalAPI: async function (messages, options) {
        options = options || {};
        var settings = this.getSettings();
        var config = settings.apiConfig;
        if (!config.apiKey) throw new Error('Vui lòng cấu hình API Key trong phần cài đặt trước');
        var apiUrl = config.apiUrl || 'https://api.openai.com/v1/chat/completions';
        apiUrl = apiUrl.trim();
        while (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
        if (!apiUrl.includes('/chat/completions')) {
            apiUrl += (!apiUrl.includes('/v1')) ? '/v1/chat/completions' : '/chat/completions';
        }
        var requestBody = { 
            model: options.model || config.model, 
            messages: messages, 
            max_tokens: options.maxTokens || config.maxTokens, 
            temperature: options.temperature !== undefined ? options.temperature : config.temperature, 
            top_p: options.topP !== undefined ? options.topP : config.topP,
            stream: false 
        };
        var response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + config.apiKey }, body: JSON.stringify(requestBody) });
        var contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) throw new Error('API trả về HTML thay vì JSON');
        if (!response.ok) throw new Error('Yêu cầu API thất bại: ' + response.status);
        var data = await response.json();
        return data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
    },

    getAppsForRender: function () {
        return Array.from(this.registeredApps.values()).sort(function (a, b) { return a.order - b.order; });
    }
};

// ============ Dọn dẹp instance cũ ============
$('#' + PHONE_CONFIG.id + '-fab').remove();
$('#' + PHONE_CONFIG.id + '-overlay').remove();
$('#' + PHONE_CONFIG.id + '-container').remove();
$('#' + PHONE_CONFIG.id + '-styles').remove();
$(parentDocument).off('.stphone'); 

function isMobile() { return window.parent.innerWidth <= 1024 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent); }

function calculateOptimalScale() {
    var settings = window.parent.PhoneSystem.getSettings();
    var pWidth = settings.phoneWidth || PHONE_CONFIG.phoneWidth;
    var pHeight = settings.phoneHeight || PHONE_CONFIG.phoneHeight;
    var vw = window.parent.innerWidth; var vh = window.parent.innerHeight;
    var scaleByWidth = (vw - 40) / pWidth;
    var scaleByHeight = (vh - 80) / pHeight;
    return Math.min(1.0, Math.min(scaleByWidth, scaleByHeight)); 
}

// ============ Tạo style ============
var styleId = PHONE_CONFIG.id + '-styles';
var styles = '\
#' + PHONE_CONFIG.id + '-fab { position: fixed; width: 56px; height: 56px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: grab; z-index: 99990; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3); user-select: none; transition: transform 0.2s ease; font-size: 28px; touch-action: none; }\
#' + PHONE_CONFIG.id + '-fab:hover { transform: scale(1.1); }\
#' + PHONE_CONFIG.id + '-fab.dragging { cursor: grabbing; transition: none; }\
#' + PHONE_CONFIG.id + '-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 99998; opacity: 0; visibility: hidden; pointer-events: none; transition: all 0.3s; }\
#' + PHONE_CONFIG.id + '-overlay.show { opacity: 1; visibility: visible; pointer-events: auto; }\
#' + PHONE_CONFIG.id + '-overlay.multitask-mode { background: transparent !important; backdrop-filter: none !important; pointer-events: none !important; }\
#' + PHONE_CONFIG.id + '-container { position: fixed; z-index: 99999; background: transparent; opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 0.3s, visibility 0.3s; }\
#' + PHONE_CONFIG.id + '-container.show { opacity: 1; visibility: visible; pointer-events: auto; }\
#' + PHONE_CONFIG.id + '-wrapper { position: relative; background: #000; border-radius: 40px; box-shadow: 0 0 0 12px #222, 0 30px 60px rgba(0,0,0,0.6); overflow: hidden; z-index: 2; }\
#' + PHONE_CONFIG.id + '-wrapper.is-dragging-phone iframe { pointer-events: none !important; }\
#' + PHONE_CONFIG.id + '-iframe { width: 100%; height: 100%; border: none; background: transparent; overflow: hidden; touch-action: auto; pointer-events: auto; }\
#' + PHONE_CONFIG.id + '-quick-actions { position: absolute; top: 60px; left: calc(100% + 4px); display: flex; flex-direction: column; gap: 8px; background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(10px); padding: 10px 8px 10px 14px; border-radius: 0 16px 16px 0; border: 1px solid rgba(255,255,255,0.15); border-left: none; z-index: -1; box-shadow: 4px 4px 15px rgba(0,0,0,0.5); }\
#' + PHONE_CONFIG.id + '-quick-actions .qa-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #e2e8f0; font-size: 18px; cursor: pointer; border-radius: 8px; background: rgba(255, 255, 255, 0.08); transition: all 0.2s; user-select: none; }\
#' + PHONE_CONFIG.id + '-quick-actions .qa-btn:hover { background: rgba(255, 255, 255, 0.25); color: white; transform: scale(1.05); }\
#' + PHONE_CONFIG.id + '-quick-actions .qa-btn.active { background: #3B82F6; color: white; }';

$('<style>').attr('id', styleId).text(styles).appendTo('head');

var settings = window.parent.PhoneSystem.getSettings();
var currentWallpaper = settings.wallpaper || PHONE_CONFIG.defaultWallpaper;

function generateAppsHTML() {
    return '<div class="home-slider" id="home-slider"></div><div class="page-indicators" id="page-indicators"></div>';
}

var statusIconsSVG = '<svg width="88" height="14" viewBox="0 0 88 14" fill="none" xmlns="http://www.w3.org/2000/svg"><g><path opacity="0.2" d="M19.511 14.4102H21.512C22.035 14.4102 22.383 14.0449 22.383 13.5054V11.7783C22.383 11.2388 22.035 10.8818 21.512 10.8818H19.511C18.988 10.8818 18.64 11.2388 18.64 11.7783V13.5054C18.64 14.0449 18.988 14.4102 19.511 14.4102Z" fill="currentColor"/><path d="M19.515 14.4102H21.532C22.047 14.4102 22.395 14.0449 22.395 13.5054V0.9048C22.395 0.3652 22.047 0 21.532 0H19.515C19 0 18.644 0.3652 18.644 0.9048V13.5054C18.644 14.0449 19 14.4102 19.515 14.4102Z" fill="currentColor"/><path opacity="0.2" d="M13.301 14.4102H15.302C15.825 14.4102 16.173 14.0449 16.173 13.5054V11.7783C16.173 11.2388 15.825 10.8818 15.302 10.8818H13.301C12.778 10.8818 12.43 11.2388 12.43 11.7783V13.5054C12.43 14.0449 12.778 14.4102 13.301 14.4102Z" fill="currentColor"/><path d="M13.306 14.4107H15.307C15.821 14.4107 16.178 14.0454 16.178 13.5059V4.1841C16.178 3.6445 15.821 3.2793 15.307 3.2793H13.306C12.783 3.2793 12.435 3.6445 12.435 4.1841V13.5059C12.435 14.0454 12.783 14.4107 13.306 14.4107Z" fill="currentColor"/><path opacity="0.2" d="M7.091 14.4102H9.092C9.615 14.4102 9.963 14.0449 9.963 13.5054V11.7783C9.963 11.2388 9.615 10.8818 9.092 10.8818H7.091C6.568 10.8818 6.22 11.2388 6.22 11.7783V13.5054C6.22 14.0449 6.568 14.4102 7.091 14.4102Z" fill="currentColor"/><path d="M7.089 14.4097H9.09C9.613 14.4097 9.961 14.0444 9.961 13.5049V7.188C9.961 6.6484 9.613 6.2832 9.09 6.2832H7.089C6.566 6.2832 6.218 6.6484 6.218 7.188V13.5049C6.218 14.0444 6.566 14.4097 7.089 14.4097Z" fill="currentColor"/><path opacity="0.2" d="M0.872 14.4102H2.872C3.395 14.4102 3.744 14.0449 3.744 13.5054V11.7783C3.744 11.2388 3.395 10.8818 2.872 10.8818H0.872C0.349 10.8818 0 11.2388 0 11.7783V13.5054C0 14.0449 0.349 14.4102 0.872 14.4102Z" fill="currentColor"/><path d="M0.872 14.4102H2.872C3.395 14.4102 3.744 14.0449 3.744 13.5054V9.7783C3.744 9.2388 3.395 8.8818 2.872 8.8818H0.872C0.349 8.8818 0 9.2388 0 9.7783V13.5054C0 14.0449 0.349 14.4102 0.872 14.4102Z" fill="currentColor"/></g><g transform="translate(30, 0)"><path d="M11.5555 13.8037C11.7381 13.8037 11.8958 13.7207 12.2195 13.4053L14.2449 11.4629C14.3694 11.3384 14.4026 11.1557 14.2864 11.0063C13.7469 10.3091 12.7259 9.7031 11.5555 9.7031C10.3519 9.7031 9.33085 10.334 8.7913 11.0561C8.7083 11.189 8.7415 11.3384 8.87431 11.4629L10.8914 13.4053C11.2151 13.7124 11.3729 13.8037 11.5555 13.8037ZM6.69951 9.2881C6.88212 9.4624 7.10624 9.4375 7.27226 9.2549C8.26835 8.1509 9.89531 7.3457 11.5555 7.354C13.2322 7.3457 14.8592 8.1758 15.8719 9.2798C16.0213 9.4541 16.2288 9.4458 16.4114 9.2798L17.698 8.0015C17.8309 7.8687 17.8475 7.686 17.7229 7.5366C16.4695 6.001 14.1453 4.8472 11.5555 4.8472C8.96562 4.8472 6.6414 6.001 5.38798 7.5366C5.26347 7.686 5.27177 7.8521 5.41288 8.0015L6.69951 9.2881ZM3.25468 5.8184C3.4207 5.9761 3.65312 5.9761 3.81083 5.8101C5.85283 3.6436 8.54228 2.4981 11.5555 2.4981C14.5852 2.4981 17.2913 3.6519 19.3167 5.8184C19.4661 5.9678 19.6902 5.9595 19.8562 5.8018L21.0018 4.6563C21.1512 4.5068 21.1429 4.3242 21.0267 4.1831C19.076 1.7759 15.407 0.0078 11.5555 0.0078C7.7122 0.0078 4.02665 1.7759 2.08427 4.1831C1.96806 4.3242 1.96806 4.5068 2.10917 4.6563L3.25468 5.8184Z" fill="currentColor"/></g><g transform="translate(57, 0)"><path opacity="0.4" d="M5.522 13.9548H22.203C24.149 13.9548 25.54 13.7363 26.532 12.7438C27.528 11.7513 27.733 10.3858 27.733 8.4323V5.5391C27.733 3.5856 27.528 2.2134 26.532 1.2242C25.537 0.2318 24.149 0.0166 22.203 0.0166H5.461C3.59 0.0166 2.196 0.2351 1.204 1.2309C0.208 2.2234 0 3.5997 0 5.4702V8.4323C0 10.3858 0.204 11.7546 1.197 12.7438C2.196 13.7363 3.58 13.9548 5.522 13.9548ZM5.239 12.6249C3.973 12.6249 2.833 12.4245 2.171 11.77C1.519 11.1081 1.33 9.9852 1.33 8.7156V5.3138C1.33 3.9927 1.519 2.8566 2.167 2.1947C2.829 1.5294 3.987 1.3432 5.305 1.3432H22.493C23.76 1.3432 24.9 1.5468 25.551 2.198C26.213 2.86 26.403 3.9753 26.403 5.2449V8.7156C26.403 9.9852 26.21 11.1081 25.551 11.77C24.9 12.4279 23.76 12.6249 22.493 12.6249H5.239ZM28.977 9.601C29.772 9.5506 30.848 8.5256 30.848 6.9819C30.848 5.4424 29.772 4.4174 28.977 4.367V9.601Z" fill="currentColor"/><path d="M4.863 11.5222H22.881C23.844 11.5222 24.417 11.3715 24.781 11.0074C25.145 10.64 25.303 10.0638 25.303 9.0995V4.869C25.303 3.898 25.145 3.3284 24.785 2.961C24.417 2.6003 23.838 2.4463 22.881 2.4463H4.932C3.903 2.4463 3.309 2.597 2.959 2.9577C2.599 3.3251 2.44 3.9187 2.44 4.9304V9.0995C2.44 10.0738 2.599 10.64 2.959 11.0074C3.327 11.3681 3.906 11.5222 4.863 11.5222Z" fill="currentColor"/></g></svg>';

var iframeHTML = '<!DOCTYPE html>' +
    '<html lang="vi">' +
    '<head>' +
    '<meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">' +
    '<title>Điện thoại</title>' +
    '<style>' +
    '*{box-sizing:border-box}' +
    ':root { --font-scale: ' + (settings.fontScale || 1.0) + '; --icon-size: ' + (settings.iconSize || 60) + 'px; }' +
    '#app-container * { font-size: calc(100% * var(--font-scale, 1)) !important; }' +
    'html,body{background:#000!important;margin:0!important;padding:0!important;width:100%!important;height:100%!important;overflow:hidden!important}' +
    '.phone-frame{width:100%!important;height:100%!important;background:#000!important;position:relative!important;display:flex!important;flex-direction:column!important;font-family:-apple-system,sans-serif!important}' +
    '.phone-overlay{display:none!important}' +
    '.notch{width:180px!important;height:30px!important;background:#000!important;border-radius:0 0 20px 20px!important;position:absolute!important;top:0!important;left:50%!important;transform:translateX(-50%)!important;z-index:100!important}' +
    '.screen{flex:1!important;background:#333!important;position:relative!important;overflow:hidden!important}' +
    '.status-bar{height:clamp(32px,6vh,44px)!important;width:100%;display:flex!important;justify-content:space-between!important;align-items:center!important;padding:0 clamp(16px,4vw,28px) 0 clamp(20px,5vw,32px)!important;z-index:500;position:absolute;top:0;left:0;right:0;pointer-events:none;color:#fff;font-size:clamp(12px,2vw,14px);-webkit-font-smoothing:antialiased}' +
    '.status-bar.light .status-icons{filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));color:white}' +
    '.status-bar.dark #clock{color:#000;text-shadow:none;font-weight:600}' +
    '.status-bar.dark .status-icons{filter:none;color:#000}' +
    '#clock{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;font-weight:600;cursor:pointer}' +
    '.status-icons{display:flex;gap:6px;color:white}' +
    '.status-icons svg{height:12px;width:auto;display:block;opacity:1}' +
    '.app-view{position:absolute;top:0;left:0;width:100%;height:100%;background-color:#fff;transform:translateX(100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);z-index:200;display:flex;flex-direction:column}' +
    '.app-view.active{transform:translateX(0)}' +
    '.home-screen{height:100%;background:url(' + currentWallpaper + ') center/cover no-repeat;position:relative;overflow:hidden}' +
    '.home-screen::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.05) 60%,rgba(0,0,0,0.2));pointer-events:none}' +
    
    /* ---- CSS CHO TRƯỢT PHÂN TRANG ---- */
    '.home-slider{display:flex;width:100%;height:100%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;-ms-overflow-style:none}' +
    '.home-slider::-webkit-scrollbar{display:none}' +
    '.home-page{flex:0 0 100%;width:100%;height:max-content;display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:max-content;gap:clamp(16px, 3vh, 24px) clamp(10px, 2vw, 16px);padding:70px 16px 134px;scroll-snap-align:start}' +
    '.page-indicators{position:absolute;bottom:140px;left:0;width:100%;display:flex;justify-content:center;gap:8px;z-index:60;pointer-events:none}' +
    '.page-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.4);transition:all 0.3s;box-shadow:0 1px 2px rgba(0,0,0,0.3)}' +
    '.page-dot.active{background:rgba(255,255,255,0.9);transform:scale(1.2)}' +
    /* -------------------------------------- */

    '.app-icon-container{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;z-index:10;transition:transform 0.1s;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
    '.app-icon-container:active{transform:scale(0.95);opacity:0.9}' +
    '.app-icon{width:var(--icon-size, 60px);height:var(--icon-size, 60px);max-width:20vw;max-height:20vw;border-radius:14px;display:flex;justify-content:center;align-items:center;color:white;font-size:28px;box-shadow:0 4px 10px rgba(0,0,0,0.2);background:rgba(255,255,255,0.25);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.4)}' +
    '.app-name{font-size:12px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,0.8);font-weight:500;margin-top:2px;text-align:center;word-break:break-word}' +
    '.dock{position:absolute;bottom:34px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:340px;height:90px;background:rgba(255,255,255,0.15);backdrop-filter:blur(50px) saturate(200%) brightness(1.05);-webkit-backdrop-filter:blur(50px) saturate(200%) brightness(1.05);border-radius:26px;padding:8px 18px;display:flex;align-items:center;justify-content:space-around;gap:8px;box-shadow:0 10px 40px rgba(0,0,0,0.06),0 2px 6px rgba(0,0,0,0.03),inset 0 0 0 0.5px rgba(255,255,255,0.2);z-index:50}' +
    '.dock-icon-container{display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;transition:transform 0.2s;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
    '.dock-icon-container:active{transform:scale(0.92)}' +
    '.dock-icon{width:var(--icon-size, 60px);height:var(--icon-size, 60px);max-width:20vw;max-height:20vw;border-radius:13.8px;display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 4px 12px rgba(0,0,0,0.15)}' +
    '.dock-icon img{width:100%;height:100%;border-radius:13.8px}' +
    '#settings-app{background:#F2F2F7;overflow-y:auto;padding-top:50px;padding-bottom:40px}' +
    '.settings-title{padding:20px 20px 8px}' +
    '.settings-title h1{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif;font-size:34px;font-weight:700;line-height:41px;margin:0;color:#000}' +
    '.settings-group{margin:16px 0 20px}' +
    '.settings-card{background:white;border-radius:10px;overflow:hidden;margin:0 16px}' +
    '.settings-row{min-height:44px;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:0.33px solid #C7C7CC;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
    '.settings-row:last-child{border-bottom:none}' +
    '.settings-row-label{font-family:-apple-system,"SF Pro Text";font-size:17px;color:#000}' +
    '.settings-row-desc{font-family:-apple-system,"SF Pro Text";font-size:13px;color:#8E8E93;margin-top:2px}' +
    '.settings-row-center{justify-content:center}' +
    '.settings-row-blue{font-family:-apple-system,"SF Pro Text";font-size:17px;color:#007AFF}' +
    '.settings-row-red{font-family:-apple-system,"SF Pro Text";font-size:17px;color:#FF3B30}' +
    '.settings-hint{font-family:-apple-system,"SF Pro Text";font-size:13px;color:#8E8E93;padding:8px 20px;margin-left:16px}' +
    '.settings-input{font-family:-apple-system,"SF Pro Text";font-size:15px;color:#000;text-align:right;border:none;background:transparent;width:180px;outline:none}' +
    '.settings-select{font-family:-apple-system,"SF Pro Text";font-size:15px;color:#8E8E93;text-align:right;border:none;background:transparent;outline:none;min-width:140px}' +
    '.wallpaper-preview{width:32px;height:32px;border-radius:6px;background:#E5E5EA;background-size:cover;background-position:center}' +
    '::-webkit-scrollbar{width:0}' +
    '.hidden{display:none}' +
    '#app-container{position:absolute;top:0;left:0;width:100%;height:100%;z-index:200;pointer-events:none;overflow:hidden}' +
    '#app-container>*{pointer-events:auto}' +
    '.crop-modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:none;flex-direction:column;align-items:center;justify-content:center}' +
    '.crop-modal.show{display:flex}' +
    '.crop-container{position:relative;width:90%;max-width:360px;aspect-ratio:9/19.5;overflow:hidden;border:2px solid #fff;border-radius:10px;background:#000}' +
    '.crop-image{position:absolute;cursor:move;max-width:none;max-height:none}' +
    '.crop-buttons{display:flex;gap:20px;margin-top:20px}' +
    '.crop-btn{padding:12px 30px;border:none;border-radius:20px;font-size:16px;cursor:pointer;font-weight:500}' +
    '.crop-btn-cancel{background:#555;color:#fff}' +
    '.crop-btn-confirm{background:#007AFF;color:#fff}' +
    '.crop-hint{color:#999;font-size:12px;margin-top:10px}' +
    '@media (max-width: 640px){.phone-frame{width:100vw!important;height:100vh!important}.screen{width:100%!important;height:100%!important}.notch{display:none!important}}' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="phone-frame">' +
    '<div class="notch"></div>' +
    '<div class="screen">' +
    '<div class="status-bar light" id="status-bar">' +
    '<span id="clock"></span>' +
    '<div></div>' +
    '<div class="status-icons" id="status-icons-container">' + statusIconsSVG + '</div>' +
    '</div>' +
    '<div class="home-screen" id="home-screen">' +
    generateAppsHTML() +
    '<div class="dock">' +
    '<div class="dock-icon-container" data-app-id="settings">' +
    '<div class="dock-icon" style="background:linear-gradient(135deg,#8e8e93,#636366);">' +
    '<img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iMTMuMzU5NCIgZmlsbD0idXJsKCNwYWludDBfbGluZWFyXzQ1MDNfNDU1NikiLz4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMjYuMjUiIGZpbGw9IiMyRTJFMkYiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yOS44NTk3IDE0LjQxMzdDMjkuODg4MyAxNC4yNTc4IDMwLjExMTggMTQuMjU3OCAzMC4xNDA0IDE0LjQxMzdMMzAuNTUxNCAxNi42NTRDMzAuNzAzMiAxNi42NjAyIDMwLjg1NDIgMTYuNjY4OCAzMS4wMDQ2IDE2LjY4TDMxLjY3MzMgMTQuNTAyOEMzMS43MTk5IDE0LjM1MTIgMzEuOTQxOCAxNC4zNzcyIDMxLjk1MjEgMTQuNTM1NEwzMi4wOTk3IDE2LjgwNjRDMzIuMjQ5OSAxNi44MyAzMi4zOTkyIDE2Ljg1NjEgMzIuNTQ3NyAxNi44ODQ3TDMzLjQ2NDMgMTQuODAxNUMzMy41MjgyIDE0LjY1NjQgMzMuNzQ1NiAxNC43MDggMzMuNzM3NCAxNC44NjYzTDMzLjYyIDE3LjEzNzRDMzMuNzY2NSAxNy4xNzg0IDMzLjkxMTkgMTcuMjIxOSAzNC4wNTYzIDE3LjI2NzdMMzUuMjA4NCAxNS4zMDU4QzM1LjI4ODcgMTUuMTY5MSAzNS40OTg3IDE1LjI0NTYgMzUuNDcyMiAxNS40MDE5TDM1LjA5MTQgMTcuNjQzOEMzNS4yMzIgMTcuNzAxNiAzNS4zNzE0IDE3Ljc2MTcgMzUuNTA5NSAxNy44MjQxTDM2Ljg4MjEgMTYuMDA4OEMzNi45Nzc3IDE1Ljg4MjMgMzcuMTc3NCAxNS45ODI4IDM3LjEzMjggMTYuMTM0OUwzNi40OTM3IDE4LjMxODVDMzYuNjI2MyAxOC4zOTIxIDM2Ljc1NzYgMTguNDY3OSAzNi44ODc0IDE4LjU0NThMMzguNDYyNiAxNi45MDFDMzguNTcyMyAxNi43ODY1IDM4Ljc1OSAxNi45MDk1IDM4LjY5NyAxNy4wNTU0TDM3LjgwNzcgMTkuMTUxM0MzNy45MzA3IDE5LjIzOTcgMzguMDUyMSAxOS4zMyAzOC4xNzE4IDE5LjQyMjNMMzkuOTI4NyAxNy45NzA0QzQwLjA1MDkgMTcuODY5NCA0MC4yMjIxIDE4LjAxMzIgNDAuMTQzNiAxOC4xNTFMMzkuMDE2MiAyMC4xMzAzQzM5LjEyNzkgMjAuMjMyMSAzOS4yMzc5IDIwLjMzNTcgMzkuMzQ2MiAyMC40NDEyTDQxLjI2MDUgMTkuMjAyNEM0MS4zOTM2IDE5LjExNjMgNDEuNTQ2OSAxOS4yNzkgNDEuNDUyOSAxOS40MDY3TDQwLjEwMzEgMjEuMjQxOEM0MC4yMDI0IDIxLjM1NTggNDAuMjk5NyAyMS40NzE0IDQwLjM5NTEgMjEuNTg4N0w0Mi40Mzk5IDIwLjU4MDRDNDIuNTgyMSAyMC41MTAzIDQyLjcxNTUgMjAuNjg5OCA0Mi42MDc0IDIwLjgwNTdMNDEuMDU0MSAyMi40NzFDNDEuMTM5NiAyMi41OTU4IDQxLjIyMyAyMi43MjIxIDQxLjMwNDIgMjIuODQ5OEw0My40NTExIDIyLjA4NThDNDMuNjAwNSAyMi4wMzI2IDQzLjcxMjIgMjIuMjI2NCA0My41OTEzIDIyLjMyOUw0MS44NTYxIDIzLjgwMkM0MS45MjY2IDIzLjkzNiA0MS45OTQ4IDI0LjA3MTMgNDIuMDYwNyAyNC4yMDc5TDQ0LjI4MDQgMjMuNjk4MkM0NC40MzUgMjMuNjYyNyA0NC41MjM0IDIzLjg2ODEgNDQuMzkxNCAyMy45NTZMNDIuNDk3NiAyNS4yMTc0QzQyLjU1MTkgMjUuMzU4NiA0Mi42MDM4IDI1LjUwMTEgNDIuNjUzNCAyNS42NDQ2TDQ0LjkxNjYgMjUuMzk1N0M0NS4wNzQyIDI1LjM3ODQgNDUuMTM4MyAyNS41OTI2IDQ0Ljk5NyAyNS42NjQ3TDQyLjk2ODkgMjYuNjk4MkM0My4wMDYyIDI2Ljg0NDYgNDMuMDQxMSAyNi45OTIxIDQzLjA3MzUgMjcuMTQwNEw0NS4zNTExIDI3LjE1NTVDNDUuNTA5NyAyNy4xNTY1IDQ1LjU0ODUgMjcuMzc2OCA0NS4zOTk3IDI3LjQzMTlMNDMuMjYzNyAyOC4yMjRDNDMuMjgzNiAyOC4zNzM0IDQzLjMwMSAyOC41MjM3IDQzLjMxNTkgMjguNjc0Nkw0NS41NzggMjguOTUzN0M0NS43MzU0IDI4Ljk3MzEgNDUuNzQ4NCAyOS4xOTY0IDQ1LjU5NDMgMjkuMjMzOUw0My4zNzkxIDI5Ljc3MzVDNDMuMzgwMyAyOS44NDg5IDQzLjM4MDkgMjkuOTI0NiA0My4zODA5IDMwLjAwMDNDNDMuMzgwOSAzMC4wNzU5IDQzLjM4MDMgMzAuMTUxMiA0My4zNzkxIDMwLjIyNjVMNDUuNTk0MyAzMC43NjZDNDUuNzQ4NCAzMC44MDM1IDQ1LjczNTQgMzEuMDI2OCA0NS41NzggMzEuMDQ2M0w0My4zMTU5IDMxLjMyNTNDNDMuMzAxMSAzMS40NzYzIDQzLjI4MzYgMzEuNjI2NSA0My4yNjM4IDMxLjc3Nkw0NS4zOTk3IDMyLjU2OEM0NS41NDg0IDMyLjYyMzEgNDUuNTA5NyAzMi44NDM0IDQ1LjM1MTEgMzIuODQ0NUw0My4wNzM3IDMyLjg1OTVDNDMuMDQxMyAzMy4wMDc5IDQzLjAwNjQgMzMuMTU1MyA0Mi45NjkxIDMzLjMwMThMNDQuOTk3IDM0LjMzNTNDNDUuMTM4MyAzNC40MDczIDQ1LjA3NDIgMzQuNjIxNiA0NC45MTY2IDM0LjYwNDJMNDIuNjUzNiAzNC4zNTUzQzQyLjYwNCAzNC40OTg5IDQyLjU1MjEgMzQuNjQxNCA0Mi40OTc4IDM0Ljc4MjdMNDQuMzkxNCAzNi4wNDM5QzQ0LjUyMzQgMzYuMTMxOSA0NC40MzUgMzYuMzM3MyA0NC4yODA0IDM2LjMwMThMNDIuMDYxIDM1Ljc5MjFDNDEuOTk1MSAzNS45Mjg4IDQxLjkyNjggMzYuMDY0MSA0MS44NTY0IDM2LjE5ODJMNDMuNTkxMyAzNy42NzA5QzQzLjcxMjIgMzcuNzczNiA0My42MDA1IDM3Ljk2NzMgNDMuNDUxMSAzNy45MTQxTDQxLjMwNDYgMzcuMTUwMkM0MS4yMjMzIDM3LjI3OCA0MS4xMzk5IDM3LjQwNDQgNDEuMDU0NCAzNy41MjkyTDQyLjYwNzQgMzkuMTk0MkM0Mi43MTU1IDM5LjMxMDIgNDIuNTgyMSAzOS40ODk2IDQyLjQzOTkgMzkuNDE5NUw0MC4zOTU1IDM4LjQxMTRDNDAuMzAwMSAzOC41Mjg4IDQwLjIwMjcgMzguNjQ0NSA0MC4xMDM0IDM4Ljc1ODVMNDEuNDUyOSA0MC41OTMyQzQxLjU0NjkgNDAuNzIwOSA0MS4zOTM2IDQwLjg4MzcgNDEuMjYwNSA0MC43OTc1TDM5LjM0NjYgMzkuNTU5QzM5LjIzODMgMzkuNjY0NSAzOS4xMjgzIDM5Ljc2ODIgMzkuMDE2NCAzOS44NzAxTDQwLjE0MzYgNDEuODQ5QzQwLjIyMjEgNDEuOTg2NyA0MC4wNTA5IDQyLjEzMDYgMzkuOTI4NyA0Mi4wMjk2TDM4LjE3MjMgNDAuNTc4QzM4LjA1MjQgNDAuNjcwNCAzNy45MzEgNDAuNzYwOCAzNy44MDggNDAuODQ5MUwzOC42OTcgNDIuOTQ0NUMzOC43NTkgNDMuMDkwNSAzOC41NzIzIDQzLjIxMzQgMzguNDYyNiA0My4wOTg5TDM2Ljg4NzggNDEuNDU0NUMzNi43NTc5IDQxLjUzMjUgMzYuNjI2NiA0MS42MDg0IDM2LjQ5MzkgNDEuNjgyMUwzNy4xMzI4IDQzLjg2NUMzNy4xNzc0IDQ0LjAxNzIgMzYuOTc3NyA0NC4xMTc2IDM2Ljg4MjEgNDMuOTkxMkwzNS41MDk5IDQyLjE3NjRDMzUuMzcxNyA0Mi4yMzg4IDM1LjIzMjIgNDIuMjk4OSAzNS4wOTE1IDQyLjM1NjhMMzUuNDcyMiA0NC41OThDMzUuNDk4NyA0NC43NTQzIDM1LjI4ODcgNDQuODMwOSAzNS4yMDg0IDQ0LjY5NDJMMzQuMDU2NyA0Mi43MzI5QzMzLjkxMjIgNDIuNzc4NyAzMy43NjY2IDQyLjgyMjIgMzMuNjIgNDIuODYzMkwzMy43Mzc0IDQ1LjEzMzZDMzMuNzQ1NiA0NS4yOTE5IDMzLjUyODIgNDUuMzQzNSAzMy40NjQzIDQ1LjE5ODRMMzIuNTQ4IDQzLjExNTlDMzIuMzk5NCA0My4xNDQ1IDMyLjI0OTkgNDMuMTcwNiAzMi4wOTk3IDQzLjE5NDNMMzEuOTUyMSA0NS40NjQ1QzMxLjk0MTggNDUuNjIyNyAzMS43MTk5IDQ1LjY0ODcgMzEuNjczMyA0NS40OTcyTDMxLjAwNDkgNDMuMzIwN0MzMC44NTQzIDQzLjMzMTggMzAuNzAzMSA0My4zNDA1IDMwLjU1MTMgNDMuMzQ2NkwzMC4xNDA0IDQ1LjU4NjJDMzAuMTExOCA0NS43NDIyIDI5Ljg4ODMgNDUuNzQyMiAyOS44NTk3IDQ1LjU4NjJMMjkuNDQ4OCA0My4zNDY2QzI5LjI5NjkgNDMuMzQwNSAyOS4xNDU3IDQzLjMzMTggMjguOTk1MiA0My4zMjA3TDI4LjMyNjggNDUuNDk3MkMyOC4yODAyIDQ1LjY0ODcgMjguMDU4MyA0NS42MjI3IDI4LjA0OCA0NS40NjQ1TDI3LjkwMDQgNDMuMTk0M0MyNy43NTAxIDQzLjE3MDcgMjcuNjAwNyA0My4xNDQ1IDI3LjQ1MjEgNDMuMTE1OUwyNi41MzU4IDQ1LjE5ODRDMjYuNDcxOSA0NS4zNDM1IDI2LjI1NDUgNDUuMjkxOSAyNi4yNjI3IDQ1LjEzMzZMMjYuMzgwMSA0Mi44NjMzQzI2LjIzMzUgNDIuODIyMiAyNi4wODc5IDQyLjc3ODggMjUuOTQzMyA0Mi43MzI5TDI0Ljc5MTcgNDQuNjk0MkMyNC43MTE0IDQ0LjgzMDkgMjQuNTAxNCA0NC43NTQzIDI0LjUyNzkgNDQuNTk4TDI0LjkwODUgNDIuMzU2OUMyNC43Njc5IDQyLjI5OTEgMjQuNjI4NCA0Mi4yMzg5IDI0LjQ5MDEgNDIuMTc2NUwyMy4xMTggNDMuOTkxMkMyMy4wMjI0IDQ0LjExNzYgMjIuODIyNyA0NC4wMTcyIDIyLjg2NzIgNDMuODY1TDIzLjUwNjIgNDEuNjgyMkMyMy4zNzM1IDQxLjYwODUgMjMuMjQyMSA0MS41MzI3IDIzLjExMjIgNDEuNDU0N0wyMS41Mzc1IDQzLjA5ODlDMjEuNDI3OCA0My4yMTM0IDIxLjI0MTEgNDMuMDkwNSAyMS4zMDMxIDQyLjk0NDVMMjIuMTkyIDQwLjg0OTNDMjIuMDY5IDQwLjc2MDkgMjEuOTQ3NSA0MC42NzA1IDIxLjgyNzcgNDAuNTc4MUwyMC4wNzE0IDQyLjAyOTZDMTkuOTQ5MiA0Mi4xMzA2IDE5Ljc3OCA0MS45ODY3IDE5Ljg1NjUgNDEuODQ5TDIwLjk4MzUgMzkuODcwM0MyMC44NzE3IDM5Ljc2ODQgMjAuNzYxNiAzOS42NjQ3IDIwLjY1MzMgMzkuNTU5MUwxOC43Mzk2IDQwLjc5NzVDMTguNjA2NSA0MC44ODM3IDE4LjQ1MzIgNDAuNzIwOSAxOC41NDcyIDQwLjU5MzJMMTkuODk2NiAzOC43NTg3QzE5Ljc5NzMgMzguNjQ0NiAxOS42OTk5IDM4LjUyODkgMTkuNjA0NCAzOC40MTE1TDE3LjU2MDIgMzkuNDE5NUMxNy40MTggMzkuNDg5NiAxNy4yODQ2IDM5LjMxMDIgMTcuMzkyNyAzOS4xOTQyTDE4Ljk0NTUgMzcuNTI5NEMxOC44NiAzNy40MDQ1IDE4Ljc3NjYgMzcuMjc4MiAxOC42OTUzIDM3LjE1MDNMMTYuNTQ5IDM3LjkxNDFDMTYuMzk5NiAzNy45NjczIDE2LjI4NzkgMzcuNzczNiAxNi40MDg4IDM3LjY3MDlMMTguMTQzNSAzNi4xOTgzQzE4LjA3MyAzNi4wNjQzIDE4LjAwNDggMzUuOTI4OSAxNy45Mzg4IDM1Ljc5MjJMMTUuNzE5NyAzNi4zMDE4QzE1LjU2NTEgMzYuMzM3MyAxNS40NzY3IDM2LjEzMTkgMTUuNjA4NyAzNi4wNDM5TDE3LjUwMjEgMzQuNzgyOUMxNy40NDc4IDM0LjY0MTUgMTcuMzk1OCAzNC40OTkgMTcuMzQ2MiAzNC4zNTUzTDE1LjA4MzUgMzQuNjA0MkMxNC45MjU5IDM0LjYyMTYgMTQuODYxOCAzNC40MDczIDE1LjAwMzEgMzQuMzM1M0wxNy4wMzA3IDMzLjMwMkMxNi45OTM0IDMzLjE1NTQgMTYuOTU4NSAzMy4wMDc5IDE2LjkyNjEgMzIuODU5NUwxNC42NDkgMzIuODQ0NUMxNC40OTA0IDMyLjg0MzQgMTQuNDUxNiAzMi42MjMxIDE0LjYwMDQgMzIuNTY4TDE2LjczNjEgMzEuNzc2MUMxNi43MTYyIDMxLjYyNjYgMTYuNjk4NyAzMS40NzYzIDE2LjY4MzkgMzEuMzI1M0wxNC40MjIxIDMxLjA0NjNDMTQuMjY0NyAzMS4wMjY4IDE0LjI1MTcgMzAuODAzNSAxNC40MDU4IDMwLjc2NkwxNi42MjA3IDMwLjIyNjZDMTYuNjE5NSAzMC4xNTEzIDE2LjYxODkgMzAuMDc1OSAxNi42MTg5IDMwLjAwMDNDMTYuNjE4OSAyOS45MjQ1IDE2LjYxOTUgMjkuODQ4OSAxNi42MjA3IDI5Ljc3MzRMMTQuNDA1OCAyOS4yMzM5QzE0LjI1MTcgMjkuMTk2NCAxNC4yNjQ3IDI4Ljk3MzEgMTQuNDIyMSAyOC45NTM3TDE2LjY4MzkgMjguNjc0NkMxNi42OTg4IDI4LjUyMzYgMTYuNzE2MiAyOC4zNzM0IDE2LjczNjEgMjguMjIzOUwxNC42MDA0IDI3LjQzMTlDMTQuNDUxNiAyNy4zNzY4IDE0LjQ5MDQgMjcuMTU2NSAxNC42NDkgMjcuMTU1NUwxNi45MjYzIDI3LjE0MDRDMTYuOTU4NyAyNi45OTIgMTYuOTkzNiAyNi44NDQ2IDE3LjAzMDkgMjYuNjk4TDE1LjAwMzEgMjUuNjY0N0MxNC44NjE4IDI1LjU5MjYgMTQuOTI1OSAyNS4zNzg0IDE1LjA4MzUgMjUuMzk1N0wxNy4zNDY0IDI1LjY0NDZDMTcuMzk2IDI1LjUwMSAxNy40NDggMjUuMzU4NSAxNy41MDIzIDI1LjIxNzJMMTUuNjA4NyAyMy45NTZDMTUuNDc2NyAyMy44NjgxIDE1LjU2NTEgMjMuNjYyNyAxNS43MTk3IDIzLjY5ODJMMTcuOTM5MSAyNC4yMDc4QzE4LjAwNTEgMjQuMDcxMiAxOC4wNzMzIDIzLjkzNTggMTguMTQzOCAyMy44MDE4TDE2LjQwODggMjIuMzI5QzE2LjI4NzkgMjIuMjI2NCAxNi4zOTk2IDIyLjAzMjYgMTYuNTQ5IDIyLjA4NThMMTguNjk1NiAyMi44NDk3QzE4Ljc3NjkgMjIuNzIyIDE4Ljg2MDMgMjIuNTk1NiAxOC45NDU4IDIyLjQ3MDhMMTcuMzkyNyAyMC44MDU3QzE3LjI4NDYgMjAuNjg5OCAxNy40MTggMjAuNTEwMyAxNy41NjAyIDIwLjU4MDRMMTkuNjA0OCAyMS41ODg2QzE5LjcwMDIgMjEuNDcxMyAxOS43OTc2IDIxLjM1NTYgMTkuODk2OCAyMS4yNDE2TDE4LjU0NzIgMTkuNDA2N0MxOC40NTMyIDE5LjI3OSAxOC42MDY1IDE5LjExNjMgMTguNzM5NiAxOS4yMDI0TDIwLjY1MzcgMjAuNDQxMUMyMC43NjIgMjAuMzM1NiAyMC44NzIgMjAuMjMxOSAyMC45ODM4IDIwLjEzMDFMMTkuODU2NSAxOC4xNTFDMTkuNzc4IDE4LjAxMzIgMTkuOTQ5MiAxNy44Njk0IDIwLjA3MTQgMTcuOTcwNEwyMS44MjgxIDE5LjQyMjJDMjEuOTQ3OSAxOS4zMjk5IDIyLjA2OTMgMTkuMjM5NSAyMi4xOTIzIDE5LjE1MTJMMjEuMzAzMSAxNy4wNTU0QzIxLjI0MTEgMTYuOTA5NSAyMS40Mjc4IDE2Ljc4NjUgMjEuNTM3NSAxNi45MDFMMjMuMTEyNiAxOC41NDU3QzIzLjI0MjUgMTguNDY3OCAyMy4zNzM3IDE4LjM5MiAyMy41MDY0IDE4LjMxODNMMjIuODY3MiAxNi4xMzQ5QzIyLjgyMjcgMTUuOTgyOCAyMy4wMjI0IDE1Ljg4MjMgMjMuMTE4IDE2LjAwODhMMjQuNDkwNSAxNy44MjRDMjQuNjI4NyAxNy43NjE2IDI0Ljc2ODEgMTcuNzAxNSAyNC45MDg3IDE3LjY0MzdMMjQuNTI3OSAxNS40MDE5QzI0LjUwMTQgMTUuMjQ1NiAyNC43MTE0IDE1LjE2OTEgMjQuNzkxNyAxNS4zMDU4TDI1Ljk0MzcgMTcuMjY3NkMyNi4wODgxIDE3LjIyMTggMjYuMjMzNiAxNy4xNzg0IDI2LjM4MDEgMTcuMTM3NEwyNi4yNjI3IDE0Ljg2NjNDMjYuMjU0NSAxNC43MDggMjYuNDcxOSAxNC42NTY0IDI2LjUzNTggMTQuODAxNUwyNy40NTI0IDE2Ljg4NDdDMjcuNjAwOCAxNi44NTYxIDI3Ljc1MDIgMTYuODMgMjcuOTAwNCAxNi44MDYzTDI4LjA0OCAxNC41MzU0QzI4LjA1ODMgMTQuMzc3MiAyOC4yODAyIDE0LjM1MTIgMjguMzI2OCAxNC41MDI4TDI4Ljk5NTQgMTYuNjc5OUMyOS4xNDU4IDE2LjY2ODggMjkuMjk2OSAxNi42NjAxIDI5LjQ0ODcgMTYuNjU0TDI5Ljg1OTcgMTQuNDEzN1pNMzAgNDEuMjVDMzYuMjEzMiA0MS4yNSA0MS4yNSAzNi4yMTMyIDQxLjI1IDMwQzQxLjI1IDIzLjc4NjcgMzYuMjEzMiAxOC43NDk5IDMwIDE4Ljc0OTlDMjMuNzg2OCAxOC43NDk5IDE4Ljc1IDIzLjc4NjcgMTguNzUgMzBDMTguNzUgMzYuMjEzMiAyMy43ODY4IDQxLjI1IDMwIDQxLjI1WiIgZmlsbD0idXJsKCNwYWludDFfbGluZWFyXzQ1MDNfNDU1NikiLz4KPGcgZmlsdGVyPSJ1cmwoI2ZpbHRlcjBfZF80NTAzXzQ1NTYpIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0zMC4xNzA1IDUuOTQ5NTVDMzAuMTQxMyA1Ljc1MzYzIDI5Ljg1ODggNS43NTM2MyAyOS44Mjk2IDUuOTQ5NTVMMjkuMjY1NCA5LjczOTdDMjguOTY3NyA5Ljc1MDMgMjguNjcxNyA5Ljc2NzMyIDI4LjM3NzQgOS43OTA2MkwyNy4zNzcyIDYuMDkyMzhDMjcuMzI1NSA1LjkwMTE4IDI3LjA0NDkgNS45MzM5OCAyNy4wMzg3IDYuMTMxOTZMMjYuOTE4NCA5Ljk1OTM1QzI2LjYyMzggMTAuMDA0MyAyNi4zMzE0IDEwLjA1NTUgMjYuMDQxMiAxMC4xMTNMMjQuNjE5NSA2LjU1ODUzQzI0LjU0NTkgNi4zNzQ2MiAyNC4yNzEgNi40Mzk3NyAyNC4yODc4IDYuNjM3MTNMMjQuNjEyNCAxMC40NTAzQzI0LjMyNTIgMTAuNTI5MyAyNC4wNDA0IDEwLjYxNDUgMjMuNzU4NCAxMC43MDU2TDIxLjkzNDUgNy4zNDE2OEMyMS44NCA3LjE2NzU1IDIxLjU3NDUgNy4yNjQxOCAyMS42MTQxIDcuNDU4MjZMMjIuMzc5MiAxMS4yMDc3QzIyLjEwMzQgMTEuMzE5NyAyMS44MzA2IDExLjQzNzUgMjEuNTYxIDExLjU2MTFMMTkuMzU4NSA4LjQzMTI0QzE5LjI0NDUgOC4yNjkyNiAxOC45OTIgOC4zOTYwNSAxOS4wNTM5IDguNTg0MjJMMjAuMjQ5NiAxMi4yMjFDMTkuOTg5MSAxMi4zNjQyIDE5LjczMjEgMTIuNTEyOSAxOS40Nzg4IDEyLjY2N0wxNi45MjY1IDkuODEyNDlDMTYuNzk0NSA5LjY2NDgzIDE2LjU1ODQgOS44MjAwOSAxNi42NDE3IDkuOTk5OEwxOC4yNTI0IDEzLjQ3NTJDMTguMDEwNyAxMy42NDc0IDE3Ljc3MjkgMTMuODI0NyAxNy41MzkzIDE0LjAwN0wxNC42NzEzIDExLjQ2NjdDMTQuNTIzIDExLjMzNTQgMTQuMzA2NiAxMS41MTcgMTQuNDEwMSAxMS42ODU4TDE2LjQxNDIgMTQuOTUyQzE2LjE5NDMgMTUuMTUwOCAxNS45Nzg3IDE1LjM1NDIgMTUuNzY3NiAxNS41NjIzTDEyLjYyMzMgMTMuMzcxNkMxMi40NjA4IDEzLjI1ODQgMTIuMjY2OSAxMy40NjM5IDEyLjM4OTQgMTMuNjE5NUwxNC43NTkxIDE2LjYzMDlDMTQuNTYzNSAxNi44NTM2IDE0LjM3MjggMTcuMDgwNyAxNC4xODcxIDE3LjMxMTlMMTAuODEwNCAxNS41MDE0QzEwLjYzNTggMTUuNDA3OCAxMC40NjcxIDE1LjYzNDQgMTAuNjA2OCAxNS43NzQ4TDEzLjMwODkgMTguNDg5NUMxMy4xNDA0IDE4LjczMzQgMTIuOTc3MSAxOC45ODEyIDEyLjgxOTEgMTkuMjMyN0w5LjI1Njk0IDE3LjgyNzJDOS4wNzI2OSAxNy43NTQ1IDguOTMxNDMgMTcuOTk5MiA5LjA4NjUxIDE4LjEyMjRMMTIuMDgzOCAyMC41MDM3QzExLjk0NDYgMjAuNzY1NiAxMS44MTExIDIxLjAzMSAxMS42ODMzIDIxLjI5OTZMNy45ODQwMiAyMC4zMTc2QzcuNzkyNTggMjAuMjY2OCA3LjY4MDY3IDIwLjUyNjIgNy44NDkwMSAyMC42MzA2TDExLjEwMTIgMjIuNjQ3MUMxMC45OTM2IDIyLjkyMzQgMTAuODkxOSAyMy4yMDI3IDEwLjc5NjMgMjMuNDg0N0w3LjAwODgyIDIyLjkzOUM2LjgxMjc4IDIyLjkxMDcgNi43MzE3NSAyMy4xODE0IDYuOTExMDcgMjMuMjY1NUwxMC4zNzU5IDI0Ljg5MTFDMTAuMzAxNCAyNS4xNzc3IDEwLjIzMzEgMjUuNDY2OCAxMC4xNzExIDI1Ljc1ODJMNi4zNDQ1NSAyNS42NTU5QzYuMTQ2NTUgMjUuNjUwNiA2LjA5NzQ5IDI1LjkyODggNi4yODUzNiAyNS45OTE1TDkuOTE3ODEgMjcuMjA0NkM5Ljg3NzQ0IDI3LjQ5NzQgOS44NDMzMSAyNy43OTIxIDkuODE1NTggMjguMDg4N0w2LjAwMDE3IDI4LjQzMTVDNS44MDI4OSAyOC40NDkyIDUuNzg2NDcgMjguNzMxMiA1Ljk4MDM1IDI4Ljc3MThMOS43MzE0MyAyOS41NTU0QzkuNzI4MjUgMjkuNzAzMyA5LjcyNjY2IDI5Ljg1MTUgOS43MjY2NiAzMC4wMDAxQzkuNzI2NjYgMzAuMTQ4NiA5LjcyODI1IDMwLjI5NjggOS43MzE0MyAzMC40NDQ2TDUuOTgwMzUgMzEuMjI4M0M1Ljc4NjQ3IDMxLjI2ODggNS44MDI4OSAzMS41NTA4IDYuMDAwMTcgMzEuNTY4Nkw5LjgxNTU3IDMxLjkxMTRDOS44NDMzIDMyLjIwOCA5Ljg3NzQyIDMyLjUwMjcgOS45MTc4IDMyLjc5NTRMNi4yODUzNiAzNC4wMDg1QzYuMDk3NDkgMzQuMDcxMiA2LjE0NjU1IDM0LjM0OTUgNi4zNDQ1NSAzNC4zNDQyTDEwLjE3MTEgMzQuMjQxOEMxMC4yMzMxIDM0LjUzMzIgMTAuMzAxNCAzNC44MjIzIDEwLjM3NTggMzUuMTA5TDYuOTExMDcgMzYuNzM0NUM2LjczMTc1IDM2LjgxODYgNi44MTI3OCAzNy4wODkzIDcuMDA4ODMgMzcuMDYxTDEwLjc5NjMgMzYuNTE1M0MxMC44OTE5IDM2Ljc5NzQgMTAuOTkzNiAzNy4wNzY2IDExLjEwMTIgMzcuMzUyOUw3Ljg0OTAxIDM5LjM2OTRDNy42ODA2NyAzOS40NzM4IDcuNzkyNTggMzkuNzMzMiA3Ljk4NDAyIDM5LjY4MjRMMTEuNjgzMiAzOC43MDA1QzExLjgxMTEgMzguOTY5MSAxMS45NDQ2IDM5LjIzNDQgMTIuMDgzNyAzOS40OTY0TDkuMDg2NTEgNDEuODc3N0M4LjkzMTQzIDQyLjAwMDkgOS4wNzI2OSA0Mi4yNDU2IDkuMjU2OTQgNDIuMTcyOUwxMi44MTkxIDQwLjc2NzNDMTIuOTc3IDQxLjAxODggMTMuMTQwNCA0MS4yNjY2IDEzLjMwODkgNDEuNTEwNUwxMC42MDY4IDQ0LjIyNTNDMTAuNDY3MSA0NC4zNjU2IDEwLjYzNTggNDQuNTkyMyAxMC44MTA0IDQ0LjQ5ODdMMTQuMTg3IDQyLjY4ODJDMTQuMzcyOCA0Mi45MTk0IDE0LjU2MzUgNDMuMTQ2NCAxNC43NTkgNDMuMzY5MkwxMi4zODk0IDQ2LjM4MDVDMTIuMjY2OSA0Ni41MzYyIDEyLjQ2MDggNDYuNzQxNyAxMi42MjMzIDQ2LjYyODRMMTUuNzY3NSA0NC40Mzc4QzE1Ljk3ODYgNDQuNjQ1OCAxNi4xOTQyIDQ0Ljg0OTMgMTYuNDE0MiA0NS4wNDgxTDE0LjQxMDEgNDguMzE0MkMxNC4zMDY2IDQ4LjQ4MyAxNC41MjMgNDguNjY0NiAxNC42NzEzIDQ4LjUzMzNMMTcuNTM5MiA0NS45OTNDMTcuNzcyOSA0Ni4xNzU0IDE4LjAxMDcgNDYuMzUyNyAxOC4yNTI0IDQ2LjUyNDlMMTYuNjQxNyA1MC4wMDAyQzE2LjU1ODQgNTAuMTggMTYuNzk0NSA1MC4zMzUyIDE2LjkyNjUgNTAuMTg3NUwxOS40Nzg3IDQ3LjMzMzFDMTkuNzMyMSA0Ny40ODcyIDE5Ljk4OTEgNDcuNjM1OSAyMC4yNDk2IDQ3Ljc3OTFMMTkuMDUzOSA1MS40MTU4QzE4Ljk5MjEgNTEuNjA0IDE5LjI0NDUgNTEuNzMwOCAxOS4zNTg1IDUxLjU2ODhMMjEuNTYxIDQ4LjQzOUMyMS44MzA2IDQ4LjU2MjYgMjIuMTAzNCA0OC42ODA0IDIyLjM3OTIgNDguNzkyNEwyMS42MTQxIDUyLjU0MThDMjEuNTc0NSA1Mi43MzU5IDIxLjg0IDUyLjgzMjUgMjEuOTM0NCA1Mi42NTg0TDIzLjc1ODQgNDkuMjk0NUMyNC4wNDA0IDQ5LjM4NTcgMjQuMzI1MSA0OS40NzA4IDI0LjYxMjQgNDkuNTQ5OEwyNC4yODc4IDUzLjM2MjlDMjQuMjcxIDUzLjU2MDMgMjQuNTQ1OSA1My42MjU0IDI0LjYxOTUgNTMuNDQxNUwyNi4wNDExIDQ5Ljg4NzJDMjYuMzMxNCA0OS45NDQ2IDI2LjYyMzggNDkuOTk1OSAyNi45MTg0IDUwLjA0MDhMMjcuMDM4NyA1My44NjgxQzI3LjA0NDkgNTQuMDY2MSAyNy4zMjU1IDU0LjA5ODkgMjcuMzc3MiA1My45MDc3TDI4LjM3NzQgNTAuMjA5NUMyOC42NzE3IDUwLjIzMjggMjguOTY3NyA1MC4yNDk4IDI5LjI2NTQgNTAuMjYwNEwyOS44Mjk2IDU0LjA1MDVDMjkuODU4OCA1NC4yNDY0IDMwLjE0MTMgNTQuMjQ2NCAzMC4xNzA1IDU0LjA1MDVMMzAuNzM0NyA1MC4yNjA0QzMxLjAzMjQgNTAuMjQ5OCAzMS4zMjg0IDUwLjIzMjggMzEuNjIyNyA1MC4yMDk1TDMyLjYyMjkgNTMuOTA3N0MzMi42NzQ2IDU0LjA5ODkgMzIuOTU1MiA1NC4wNjYxIDMyLjk2MTQgNTMuODY4MUwzMy4wODE3IDUwLjA0MDhDMzMuMzc2MyA0OS45OTU5IDMzLjY2ODcgNDkuOTQ0NiAzMy45NTkgNDkuODg3MkwzNS4zODA2IDUzLjQ0MTVDMzUuNDU0MiA1My42MjU0IDM1LjcyOTEgNTMuNTYwMyAzNS43MTIzIDUzLjM2MjlMMzUuMzg3NyA0OS41NDk4QzM1LjY3NSA0OS40NzA4IDM1Ljk1OTcgNDkuMzg1NyAzNi4yNDE3IDQ5LjI5NDVMMzguMDY1NiA1Mi42NTg0QzM4LjE2MDEgNTIuODMyNSAzOC40MjU1IDUyLjczNTkgMzguMzg1OSA1Mi41NDE4TDM3LjYyMDkgNDguNzkyNEMzNy44OTY3IDQ4LjY4MDUgMzguMTY5NSA0OC41NjI2IDM4LjQzOTEgNDguNDM5TDQwLjY0MTYgNTEuNTY4OEM0MC43NTU2IDUxLjczMDggNDEuMDA4IDUxLjYwNCA0MC45NDYyIDUxLjQxNThMMzkuNzUwNSA0Ny43NzkxQzQwLjAxMSA0Ny42MzYgNDAuMjY4IDQ3LjQ4NzIgNDAuNTIxNCA0Ny4zMzMxTDQzLjA3MzYgNTAuMTg3NUM0My4yMDU2IDUwLjMzNTIgNDMuNDQxNyA1MC4xOCA0My4zNTg0IDUwLjAwMDJMNDEuNzQ3NyA0Ni41MjQ5QzQxLjk4OTQgNDYuMzUyOCA0Mi4yMjcyIDQ2LjE3NTQgNDIuNDYwOSA0NS45OTMxTDQ1LjMyODggNDguNTMzM0M0NS40NzcxIDQ4LjY2NDYgNDUuNjkzNSA0OC40ODMgNDUuNTkgNDguMzE0Mkw0My41ODU5IDQ1LjA0ODFDNDMuODA1OSA0NC44NDk0IDQ0LjAyMTUgNDQuNjQ1OSA0NC4yMzI2IDQ0LjQzNzhMNDcuMzc2OCA0Ni42Mjg0QzQ3LjUzOTMgNDYuNzQxNyA0Ny43MzMyIDQ2LjUzNjIgNDcuNjEwNyA0Ni4zODA1TDQ1LjI0MTEgNDMuMzY5MkM0NS40MzY2IDQzLjE0NjUgNDUuNjI3NCA0Mi45MTk0IDQ1LjgxMzEgNDIuNjg4Mkw0OS4xODk3IDQ0LjQ5ODdDNDkuMzY0MyA0NC41OTIzIDQ5LjUzMyA0NC4zNjU2IDQ5LjM5MzMgNDQuMjI1M0w0Ni42OTEzIDQxLjUxMDZDNDYuODU5OCA0MS4yNjY3IDQ3LjAyMzEgNDEuMDE4OSA0Ny4xODExIDQwLjc2NzRMNTAuNzQzMSA0Mi4xNzI5QzUwLjkyNzQgNDIuMjQ1NiA1MS4wNjg3IDQyLjAwMDkgNTAuOTEzNiA0MS44Nzc3TDQ3LjkxNjQgMzkuNDk2NEM0OC4wNTU2IDM5LjIzNDUgNDguMTg5MSAzOC45NjkxIDQ4LjMxNjkgMzguNzAwNUw1Mi4wMTYxIDM5LjY4MjRDNTIuMjA3NSAzOS43MzMyIDUyLjMxOTQgMzkuNDczOCA1Mi4xNTExIDM5LjM2OTRMNDguODk5IDM3LjM1M0M0OS4wMDY2IDM3LjA3NjcgNDkuMTA4MyAzNi43OTc0IDQ5LjIwMzkgMzYuNTE1M0w1Mi45OTEzIDM3LjA2MUM1My4xODczIDM3LjA4OTMgNTMuMjY4MyAzNi44MTg2IDUzLjA4OSAzNi43MzQ1TDQ5LjYyNDMgMzUuMTA5QzQ5LjY5ODggMzQuODIyNCA0OS43NjcxIDM0LjUzMzIgNDkuODI5MSAzNC4yNDE4TDUzLjY1NTUgMzQuMzQ0MkM1My44NTM1IDM0LjM0OTUgNTMuOTAyNiAzNC4wNzEyIDUzLjcxNDcgMzQuMDA4NUw1MC4wODI0IDMyLjc5NTRDNTAuMTIyOCAzMi41MDI3IDUwLjE1NjkgMzIuMjA4IDUwLjE4NDYgMzEuOTExNEw1My45OTk5IDMxLjU2ODZDNTQuMTk3MiAzMS41NTA4IDU0LjIxMzYgMzEuMjY4OCA1NC4wMTk3IDMxLjIyODNMNTAuMjY4OCAzMC40NDQ2QzUwLjI3MTkgMzAuMjk2OCA1MC4yNzM1IDMwLjE0ODYgNTAuMjczNSAzMC4wMDAxQzUwLjI3MzUgMjkuODUxNSA1MC4yNzE5IDI5LjcwMzMgNTAuMjY4NyAyOS41NTU0TDU0LjAxOTcgMjguNzcxOEM1NC4yMTM2IDI4LjczMTIgNTQuMTk3MiAyOC40NDkyIDUzLjk5OTkgMjguNDMxNUw1MC4xODQ2IDI4LjA4ODdDNTAuMTU2OSAyNy43OTIxIDUwLjEyMjcgMjcuNDk3MyA1MC4wODI0IDI3LjIwNDZMNTMuNzE0NyAyNS45OTE1QzUzLjkwMjYgMjUuOTI4OCA1My44NTM1IDI1LjY1MDYgNTMuNjU1NSAyNS42NTU5TDQ5LjgyOTEgMjUuNzU4MkM0OS43NjcgMjUuNDY2OCA0OS42OTg3IDI1LjE3NzcgNDkuNjI0MyAyNC44OTFMNTMuMDg5IDIzLjI2NTVDNTMuMjY4MyAyMy4xODE0IDUzLjE4NzMgMjIuOTEwNyA1Mi45OTEzIDIyLjkzOUw0OS4yMDM5IDIzLjQ4NDdDNDkuMTA4MiAyMy4yMDI3IDQ5LjAwNjUgMjIuOTIzNCA0OC44OTg5IDIyLjY0NzFMNTIuMTUxMSAyMC42MzA2QzUyLjMxOTQgMjAuNTI2MiA1Mi4yMDc1IDIwLjI2NjggNTIuMDE2MSAyMC4zMTc2TDQ4LjMxNjkgMjEuMjk5NkM0OC4xODkxIDIxLjAzMDkgNDguMDU1NSAyMC43NjU2IDQ3LjkxNjQgMjAuNTAzN0w1MC45MTM2IDE4LjEyMjRDNTEuMDY4NyAxNy45OTkyIDUwLjkyNzQgMTcuNzU0NSA1MC43NDMxIDE3LjgyNzJMNDcuMTgxIDE5LjIzMjdDNDcuMDIzMSAxOC45ODEyIDQ2Ljg1OTggMTguNzMzNCA0Ni42OTEyIDE4LjQ4OTVMNDkuMzkzMyAxNS43NzQ4QzQ5LjUzMyAxNS42MzQ0IDQ5LjM2NDMgMTUuNDA3OCA0OS4xODk3IDE1LjUwMTRMNDUuODEzMSAxNy4zMTE5QzQ1LjYyNzMgMTcuMDgwNiA0NS40MzY2IDE2Ljg1MzYgNDUuMjQxMSAxNi42MzA5TDQ3LjYxMDcgMTMuNjE5NUM0Ny43MzMyIDEzLjQ2MzkgNDcuNTM5MyAxMy4yNTg0IDQ3LjM3NjggMTMuMzcxNkw0NC4yMzI2IDE1LjU2MjNDNDQuMDIxNSAxNS4zNTQyIDQzLjgwNTkgMTUuMTUwNyA0My41ODU5IDE0Ljk1Mkw0NS41OSAxMS42ODU4QzQ1LjY5MzUgMTEuNTE3IDQ1LjQ3NzEgMTEuMzM1NCA0NS4zMjg4IDExLjQ2NjdMNDIuNDYwOSAxNC4wMDdDNDIuMjI3MiAxMy44MjQ3IDQxLjk4OTQgMTMuNjQ3MyA0MS43NDc3IDEzLjQ3NTJMNDMuMzU4NCA5Ljk5OThDNDMuNDQxNyA5LjgyMDA4IDQzLjIwNTYgOS42NjQ4MyA0My4wNzM2IDkuODEyNDlMNDAuNTIxMyAxMi42NjdDNDAuMjY4IDEyLjUxMjkgNDAuMDExIDEyLjM2NDIgMzkuNzUwNSAxMi4yMjFMNDAuOTQ2MiA4LjU4NDIyQzQxLjAwOCA4LjM5NjA2IDQwLjc1NTYgOC4yNjkyNiA0MC42NDE2IDguNDMxMjRMMzguNDM5MSAxMS41NjExQzM4LjE2OTUgMTEuNDM3NSAzNy44OTY3IDExLjMxOTcgMzcuNjIwOSAxMS4yMDc3TDM4LjM4NTkgNy40NTgyNkMzOC40MjU1IDcuMjY0MTggMzguMTYwMSA3LjE2NzU1IDM4LjA2NTYgNy4zNDE2OEwzNi4yNDE3IDEwLjcwNTZDMzUuOTU5NyAxMC42MTQ0IDM1LjY3NDkgMTAuNTI5MyAzNS4zODc3IDEwLjQ1MDNMMzUuNzEyMyA2LjYzNzE0QzM1LjcyOTEgNi40Mzk3OCAzNS40NTQyIDYuMzc0NjIgMzUuMzgwNiA2LjU1ODUzTDMzLjk1ODkgMTAuMTEzQzMzLjY2ODcgMTAuMDU1NSAzMy4zNzYzIDEwLjAwNDMgMzMuMDgxNyA5Ljk1OTM0TDMyLjk2MTQgNi4xMzE5NUMzMi45NTUyIDUuOTMzOTggMzIuNjc0NiA1LjkwMTE4IDMyLjYyMjkgNi4wOTIzOEwzMS42MjI2IDkuNzkwNjFDMzEuMzI4NCA5Ljc2NzMxIDMxLjAzMjQgOS43NTAyOSAzMC43MzQ3IDkuNzM5NjlMMzAuMTcwNSA1Ljk0OTU1Wk0xNy4zOTE4IDE3LjE1NDlDMTguODAzMiAxNS43Nzk1IDIxLjA0NjQgMTYuMzIwMiAyMi4wNDU1IDE4LjAxODlMMjcuOTExNSAyNy45OTE4QzI4LjU0ODYgMjkuMDc1IDI4LjU0ODYgMzAuNDE4NSAyNy45MTE1IDMxLjUwMTdMMjEuODU2OCA0MS43OTU1QzIwLjg0NzkgNDMuNTEwNyAxOC41NzQ0IDQ0LjA0MDYgMTcuMTczIDQyLjYyOEMxMy45NDM5IDM5LjM3MzIgMTEuOTUzMSAzNC45MTYxIDExLjk1MzEgMjkuOTk5OUMxMS45NTMxIDI0Ljk3MzYgMTQuMDM0MSAyMC40MjcyIDE3LjM5MTggMTcuMTU0OVpNMzIuNzg4IDMwLjgyMzJDMzEuNTYxMyAzMC44MjMyIDMwLjQyNjMgMzEuNDcyNSAyOS44MDQzIDMyLjUyOThMMjMuNzE4NyA0Mi44NzYxQzIyLjcwOCA0NC41OTQ1IDIzLjM1NDEgNDYuODQyNyAyNS4yNzUxIDQ3LjM3NTdDMjYuODUwOCA0Ny44MTI5IDI4LjUxMjcgNDguMDQ2OCAzMC4yMyA0OC4wNDY4QzM4Ljc4NjUgNDguMDQ2OCA0NS45Njk2IDQyLjI0MDkgNDcuOTU5NCAzNC40MDEzQzQ4LjQ0NDkgMzIuNDg4NSA0Ni44MzkxIDMwLjgyMzIgNDQuODY1NiAzMC44MjMySDMyLjc4OFpNNDQuNzMxNyAyOC42NzAyQzQ2Ljc0MzggMjguNjcwMiA0OC4zNjA4IDI2Ljk0MDcgNDcuNzk4OSAyNS4wMDg3QzQ1LjYwNjEgMTcuNDY5NCAzOC41NzA0IDExLjk1MyAzMC4yMyAxMS45NTNDMjguNjIwOSAxMS45NTMgMjcuMDYwNCAxMi4xNTgzIDI1LjU3MzkgMTIuNTQzOUMyMy42MjU2IDEzLjA0OTIgMjIuOTU0NyAxNS4zMTg0IDIzLjk3NTIgMTcuMDUzNEwyOS44MDQzIDI2Ljk2MzZDMzAuNDI2MiAyOC4wMjA5IDMxLjU2MTMgMjguNjcwMiAzMi43ODggMjguNjcwMkg0NC43MzE3Wk0zMC4wMTEgMzAuOTY3QzMwLjU2MTIgMzAuOTY3IDMxLjAwNzEgMzAuNTIxIDMxLjAwNzEgMjkuOTcwOUMzMS4wMDcxIDI5LjQyMDcgMzAuNTYxMiAyOC45NzQ4IDMwLjAxMSAyOC45NzQ4QzI5LjQ2MDkgMjguOTc0OCAyOS4wMTQ5IDI5LjQyMDcgMjkuMDE0OSAyOS45NzA5QzI5LjAxNDkgMzAuNTIxIDI5LjQ2MDkgMzAuOTY3IDMwLjAxMSAzMC45NjdaIiBmaWxsPSJ1cmwoI3BhaW50Ml9saW5lYXJfNDUwM180NTU2KSIvPgo8L2c+CjxkZWZzPgo8ZmlsdGVyIGlkPSJmaWx0ZXIwX2RfNDUwM180NTU2IiB4PSI0Ljk4MTcyIiB5PSI1LjgwMjYxIiB3aWR0aD0iNTAuMDM2NiIgaGVpZ2h0PSI1MC4xMTc5IiBmaWx0ZXJVbml0cz0idXNlclNwYWNlT25Vc2UiIGNvbG9yLWludGVycG9sYXRpb24tZmlsdGVycz0ic1JHQiI+CjxmZUZsb29kIGZsb29kLW9wYWNpdHk9IjAiIHJlc3VsdD0iQmFja2dyb3VuZEltYWdlRml4Ii8+CjxmZUNvbG9yTWF0cml4IGluPSJTb3VyY2VBbHBoYSIgdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEyNyAwIiByZXN1bHQ9ImhhcmRBbHBoYSIvPgo8ZmVPZmZzZXQgZHk9IjAuODYxNTM4Ii8+CjxmZUdhdXNzaWFuQmx1ciBzdGREZXZpYXRpb249IjAuNDMwNzY5Ii8+CjxmZUNvbG9yTWF0cml4IHR5cGU9Im1hdHJpeCIgdmFsdWVzPSIwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwLjQ1IDAiLz4KPGZlQmxlbmQgbW9kZT0ibm9ybWFsIiBpbjI9IkJhY2tncm91bmRJbWFnZUZpeCIgcmVzdWx0PSJlZmZlY3QxX2Ryb3BTaGFkb3dfNDUwM180NTU2Ii8+CjxmZUJsZW5kIG1vZGU9Im5vcm1hbCIgaW49IlNvdXJjZUdyYXBoaWMiIGluMj0iZWZmZWN0MV9kcm9wU2hhZG93XzQ1MDNfNDU1NiIgcmVzdWx0PSJzaGFwZSIvPgo8L2ZpbHRlcj4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzQ1MDNfNDU1NiIgeDE9IjMwIiB5MT0iMCIgeDI9IjMwIiB5Mj0iNjAiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0VBRUFFQSIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM4RjhGOTMiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDFfbGluZWFyXzQ1MDNfNDU1NiIgeDE9IjMwIiB5MT0iMTUiIHgyPSIzMCIgeTI9IjQ0Ljk5OTkiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0I0QjRCOCIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNCNEI0QjgiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDJfbGluZWFyXzQ1MDNfNDU1NiIgeDE9IjMwLjAxOTciIHkxPSI2LjE1NzU3IiB4Mj0iMzAuMjg5MiIgeTI9IjU0LjIyNjkiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agb2Zmc2V0PSIwLjE5MzI5NCIgc3RvcC1jb2xvcj0iI0Q0RDREOCIvPgo8c3RvcCBvZmZzZXQ9IjAuODMwODc4IiBzdG9wLWNvbG9yPSIjOUQ5REExIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg==" alt="Settings" style="width:100%;height:100%;">' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="app-view" id="settings-app">' +
    '<div class="settings-title"><h1>Cài đặt</h1></div>' +
    '<div class="settings-group">' +
    '<div class="settings-card">' +
    '<div class="settings-row" style="flex-direction:column;align-items:flex-start;">' +
    '<div class="settings-row-label">Hình nền</div>' +
    '<div class="settings-row-desc">Tải ảnh lên để tùy chỉnh hình nền</div>' +
    '</div>' +
    '<div class="settings-row" id="btn-select-wallpaper">' +
    '<span class="settings-row-label">Chọn ảnh</span>' +
    '<div style="display:flex;align-items:center;gap:10px;">' +
    '<div class="wallpaper-preview" id="wallpaper-preview" style="background-image:url(' + currentWallpaper + ');"></div>' +
    '<span style="color:#C7C7CC;">›</span>' +
    '</div>' +
    '<input type="file" id="wallpaper-input" accept="image/*" class="hidden">' +
    '</div>' +
    '<div class="settings-row settings-row-center" id="btn-reset-wallpaper">' +
    '<span class="settings-row-red">Khôi phục hình nền mặc định</span>' +
    '</div>' +
    '</div>' +
    '</div>' +
    
    '<div class="settings-group">' +
    '<div style="font-family:-apple-system,SF Pro Text;font-size:13px;color:#8E8E93;text-transform:uppercase;padding:0 20px 8px;margin-left:16px;">Hiển thị điện thoại</div>' +
    '<div class="settings-card">' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">Chiều rộng</span>' +
    '<input class="settings-input" type="number" id="phone-w" value="' + (settings.phoneWidth || PHONE_CONFIG.phoneWidth) + '">' +
    '</div>' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">Chiều cao</span>' +
    '<input class="settings-input" type="number" id="phone-h" value="' + (settings.phoneHeight || PHONE_CONFIG.phoneHeight) + '">' +
    '</div>' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">Cỡ chữ (Override)</span>' +
    '<input class="settings-input" type="number" step="0.1" id="font-scale" value="' + (settings.fontScale || 1.0) + '">' +
    '</div>' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">Độ to Icon</span>' +
    '<input class="settings-input" type="number" id="icon-size" value="' + (settings.iconSize || 60) + '">' +
    '</div>' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">App mỗi trang</span>' +
    '<input class="settings-input" type="number" id="apps-per-page" value="' + (settings.appsPerPage || 20) + '">' +
    '</div>' +
    '<div class="settings-row settings-row-center" id="btn-save-display">' +
    '<span class="settings-row-blue">Lưu & Áp dụng cài đặt</span>' +
    '</div>' +
    '<div class="settings-row settings-row-center" id="btn-reset-display">' +
    '<span class="settings-row-red">Khôi phục cài đặt gốc</span>' +
    '</div>' +
    '</div>' +
    '<div class="settings-hint">Chỉ có tác dụng trên PC. Trượt thanh lăn chuột để chuyển trang ứng dụng.</div>' +
    '</div>' +

    '<div class="settings-group">' +
    '<div style="font-family:-apple-system,SF Pro Text;font-size:13px;color:#8E8E93;text-transform:uppercase;padding:0 20px 8px;margin-left:16px;">Kết nối API</div>' +
    '<div class="settings-card">' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">Kênh</span>' +
    '<select class="settings-select" id="api-provider">' +
    '<option value="openai">Tương thích OpenAI</option>' +
    '<option value="claude">Claude</option>' +
    '<option value="deepseek">DeepSeek</option>' +
    '</select>' +
    '</div>' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">URL</span>' +
    '<input class="settings-input" type="text" id="api-url" placeholder="Địa chỉ API" value="' + (settings.apiConfig.apiUrl || '') + '">' +
    '</div>' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">KEY</span>' +
    '<input class="settings-input" type="password" id="api-key" placeholder="Mã API (Key)" value="' + (settings.apiConfig.apiKey || '') + '">' +
    '</div>' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">Mô hình</span>' +
    '<div style="display:flex;align-items:center;gap:8px">' +
    '<input class="settings-input" type="text" id="api-model" placeholder="Tên mô hình" value="' + (settings.apiConfig.model || '') + '" style="width:120px">' +
    '<select class="settings-select" id="api-model-select" style="display:none;min-width:120px"></select>' +
    '</div>' +
    '</div>' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">Max Tokens</span>' +
    '<input class="settings-input" type="number" id="api-max-tokens" placeholder="6000" value="' + (settings.apiConfig.maxTokens !== undefined ? settings.apiConfig.maxTokens : 6000) + '" style="width:100px">' +
    '</div>' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">Temperature</span>' +
    '<input class="settings-input" type="number" step="0.01" id="api-temp" placeholder="0.85" value="' + (settings.apiConfig.temperature !== undefined ? settings.apiConfig.temperature : 0.85) + '" style="width:100px">' +
    '</div>' +
    '<div class="settings-row">' +
    '<span class="settings-row-label">Top P</span>' +
    '<input class="settings-input" type="number" step="0.01" id="api-topp" placeholder="1.0" value="' + (settings.apiConfig.topP !== undefined ? settings.apiConfig.topP : 1.0) + '" style="width:100px">' +
    '</div>' +
    '<div class="settings-row settings-row-center" id="btn-fetch-models">' +
    '<span class="settings-row-blue" id="btn-fetch-models-text">Lấy danh sách mô hình</span>' +
    '</div>' +
    '<div class="settings-row settings-row-center" id="btn-save-api">' +
    '<span class="settings-row-blue">Lưu cài đặt API</span>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="settings-group">' +
    '<div class="settings-card">' +
    '<div class="settings-row settings-row-center" id="btn-go-home">' +
    '<span class="settings-row-blue">Về màn hình chính</span>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div style="text-align:center;padding:20px;font-size:13px;color:#8E8E93;">' +
    'Điện thoại v1.1.4<br>Bản Mod Nâng cao: Đa nhiệm, Phân trang UI, Tùy chỉnh API Sâu' +
    '</div>' +
    '</div>' +
    '<div id="app-container"></div>' +
    '</div>' +
    '</div>' +
    '<div class="crop-modal" id="crop-modal">' +
    '<div class="crop-container" id="crop-container"><img class="crop-image" id="crop-image" src=""></div>' +
    '<div class="crop-hint">Kéo ảnh để điều chỉnh vị trí, dùng hai ngón tay để thu phóng</div>' +
    '<div class="crop-buttons">' +
    '<button class="crop-btn crop-btn-cancel" id="crop-cancel">Hủy</button>' +
    '<button class="crop-btn crop-btn-confirm" id="crop-confirm">Xác nhận</button>' +
    '</div>' +
    '</div>' +
    '<script>' +
    'window.parent.console.log("[Điện thoại iframe] Script bắt đầu thực thi");' +
    'function updateClock(){var now=new Date();var h=String(now.getHours()).padStart(2,"0");var m=String(now.getMinutes()).padStart(2,"0");document.getElementById("clock").textContent=h+":"+m;}updateClock();setInterval(updateClock,3000);' +
    'var cropState={imgX:0,imgY:0,scale:1,isDragging:false,startX:0,startY:0,lastX:0,lastY:0};' +
    'function bindTap(el,handler){var touched=false;el.ontouchend=function(e){e.preventDefault();e.stopPropagation();if(!touched){touched=true;handler();setTimeout(function(){touched=false},300)}};el.onclick=function(e){e.stopPropagation();if(!touched){handler()}}};' +
    
    // RENDER APP CÓ PHÂN TRANG (Tự đọc biến AppsPerPage)
    'function renderApps(apps){' +
    'var s=window.parent.PhoneSystem.getSettings();' +
    'var APPS_PER_PAGE=s.appsPerPage||20;' + 
    'var totalPages=Math.ceil(apps.length/APPS_PER_PAGE)||1;' +
    'var slider=document.getElementById("home-slider");' +
    'var indicators=document.getElementById("page-indicators");' +
    'if(!slider||!indicators)return;' +
    'var html="";var dots="";' +
    'for(var i=0;i<totalPages;i++){' +
    'var pageApps=apps.slice(i*APPS_PER_PAGE,(i+1)*APPS_PER_PAGE);' +
    'html+="<div class=\\"home-page\\">"+pageApps.map(function(app){return "<div class=\\"app-icon-container\\" data-app-id=\\""+app.id+"\\"><div class=\\"app-icon\\" style=\\"background:"+(app.color||"rgba(255,255,255,0.25)")+";\\">"+(app.icon||"📱")+"</div><div class=\\"app-name\\">"+app.name+"</div></div>"}).join("")+"</div>";' +
    'dots+="<div class=\\"page-dot"+(i===0?" active":"")+"\\"></div>";' +
    '}' +
    'slider.innerHTML=html;' +
    'indicators.innerHTML=dots;' +
    'slider.querySelectorAll("[data-app-id]").forEach(function(el){bindTap(el,function(){openApp(el.dataset.appId)})});' +
    '}' +

    '(function bindEvents(){' +
    'document.querySelectorAll(".dock [data-app-id]").forEach(function(el){bindTap(el,function(){openApp(el.dataset.appId)})});' +
    
    'var btnWallpaper=document.getElementById("btn-select-wallpaper");' +
    'if(btnWallpaper)bindTap(btnWallpaper,function(){document.getElementById("wallpaper-input").click()});' +
    'var btnReset=document.getElementById("btn-reset-wallpaper");' +
    'if(btnReset)bindTap(btnReset,function(){resetWallpaper()});' +
    'var btnSaveDisplay=document.getElementById("btn-save-display");' +
    'if(btnSaveDisplay)bindTap(btnSaveDisplay,function(){saveDisplaySettings()});' +
    'var btnResetDisplay=document.getElementById("btn-reset-display");' +
    'if(btnResetDisplay)bindTap(btnResetDisplay,function(){resetDisplaySettings()});' +
    'var btnFetchModels=document.getElementById("btn-fetch-models");' +
    'if(btnFetchModels)bindTap(btnFetchModels,function(){fetchApiModels()});' +
    'var btnSaveApi=document.getElementById("btn-save-api");' +
    'if(btnSaveApi)bindTap(btnSaveApi,function(){saveApiSettings()});' +
    'var modelSelect=document.getElementById("api-model-select");' +
    'if(modelSelect)modelSelect.onchange=function(){document.getElementById("api-model").value=this.value};' +
    'var btnGoHome=document.getElementById("btn-go-home");' +
    'if(btnGoHome)bindTap(btnGoHome,function(){goHome()});' +
    'var btnCropCancel=document.getElementById("crop-cancel");' +
    'if(btnCropCancel)bindTap(btnCropCancel,function(){closeCropModal()});' +
    'var btnCropConfirm=document.getElementById("crop-confirm");' +
    'if(btnCropConfirm)bindTap(btnCropConfirm,function(){confirmCrop()});' +

    'var slider=document.getElementById("home-slider");' +
    'if(slider){' +
    '  slider.addEventListener("scroll",function(){var idx=Math.round(slider.scrollLeft/slider.clientWidth);document.querySelectorAll(".page-dot").forEach(function(d,i){if(i===idx)d.classList.add("active");else d.classList.remove("active");})},{passive:true});' +
    '  slider.addEventListener("wheel",function(e){if(Math.abs(e.deltaY)>10){e.preventDefault();slider.scrollBy({left:e.deltaY>0?slider.clientWidth:-slider.clientWidth,behavior:"smooth"})}},{passive:false});' +
    '}' +
    '})();' +
    
    'function saveDisplaySettings(){' +
    'var w=parseInt(document.getElementById("phone-w").value);' +
    'var h=parseInt(document.getElementById("phone-h").value);' +
    'var fs=parseFloat(document.getElementById("font-scale").value);' +
    'var is=parseInt(document.getElementById("icon-size").value);' +
    'var appPP=parseInt(document.getElementById("apps-per-page").value);' +
    'if(w<300||h<500){if(window.parent.toastr)window.parent.toastr.warning("Kích thước quá nhỏ!");return;}' +
    'if(fs<0.5||fs>3){if(window.parent.toastr)window.parent.toastr.warning("Cỡ chữ phải từ 0.5 đến 3.0!");return;}' +
    'if(is<30||is>120){if(window.parent.toastr)window.parent.toastr.warning("Độ to Icon phải từ 30 đến 120!");return;}' +
    'if(appPP<4||appPP>50){if(window.parent.toastr)window.parent.toastr.warning("Số App/trang phải từ 4 đến 50!");return;}' +
    'window.parent.postMessage({type:"save-display-settings",width:w,height:h,fontScale:fs,iconSize:is,appsPerPage:appPP},"*");' +
    '}' +
    'function resetDisplaySettings(){' +
    'document.getElementById("phone-w").value=' + PHONE_CONFIG.phoneWidth + ';' +
    'document.getElementById("phone-h").value=' + PHONE_CONFIG.phoneHeight + ';' +
    'document.getElementById("font-scale").value=1.0;' +
    'document.getElementById("icon-size").value=60;' +
    'document.getElementById("apps-per-page").value=20;' +
    'window.parent.postMessage({type:"reset-display-settings"},"*");' +
    '}' +
    
    'document.getElementById("wallpaper-input").addEventListener("change",function(e){var file=e.target.files[0];if(!file)return;var reader=new FileReader();reader.onload=function(event){openCropModal(event.target.result)};reader.readAsDataURL(file)});' +
    'function openCropModal(src){var modal=document.getElementById("crop-modal");var img=document.getElementById("crop-image");var container=document.getElementById("crop-container");img.src=src;img.onload=function(){var cw=container.clientWidth;var ch=container.clientHeight;var iw=img.naturalWidth;var ih=img.naturalHeight;var scale=Math.max(cw/iw,ch/ih);cropState.scale=scale;cropState.imgX=(cw-iw*scale)/2;cropState.imgY=(ch-ih*scale)/2;updateCropImage()};modal.classList.add("show")}' +
    'function closeCropModal(){document.getElementById("crop-modal").classList.remove("show")}' +
    'function updateCropImage(){var img=document.getElementById("crop-image");img.style.transform="translate("+cropState.imgX+"px,"+cropState.imgY+"px) scale("+cropState.scale+")";img.style.transformOrigin="0 0"}' +
    'function confirmCrop(){var container=document.getElementById("crop-container");var img=document.getElementById("crop-image");var canvas=document.createElement("canvas");var cw=container.clientWidth;var ch=container.clientHeight;canvas.width=cw*2;canvas.height=ch*2;var ctx=canvas.getContext("2d");ctx.scale(2,2);ctx.drawImage(img,cropState.imgX,cropState.imgY,img.naturalWidth*cropState.scale,img.naturalHeight*cropState.scale);var url=canvas.toDataURL("image/jpeg",0.9);setWallpaper(url);closeCropModal()}' +
    'var cropImg=document.getElementById("crop-image");' +
    'cropImg.addEventListener("mousedown",function(e){cropState.isDragging=true;cropState.startX=e.clientX-cropState.imgX;cropState.startY=e.clientY-cropState.imgY;e.preventDefault()});' +
    'document.addEventListener("mousemove",function(e){if(!cropState.isDragging)return;cropState.imgX=e.clientX-cropState.startX;cropState.imgY=e.clientY-cropState.startY;updateCropImage()});' +
    'document.addEventListener("mouseup",function(){cropState.isDragging=false});' +
    'cropImg.addEventListener("touchstart",function(e){if(e.touches.length===1){cropState.isDragging=true;cropState.startX=e.touches[0].clientX-cropState.imgX;cropState.startY=e.touches[0].clientY-cropState.imgY}else if(e.touches.length===2){cropState.lastDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)}e.preventDefault()},{passive:false});' +
    'document.addEventListener("touchmove",function(e){if(e.touches.length===1&&cropState.isDragging){cropState.imgX=e.touches[0].clientX-cropState.startX;cropState.imgY=e.touches[0].clientY-cropState.startY;updateCropImage()}else if(e.touches.length===2){var dist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);if(cropState.lastDist){var delta=dist/cropState.lastDist;cropState.scale*=delta;cropState.scale=Math.max(0.5,Math.min(3,cropState.scale));updateCropImage()}cropState.lastDist=dist}},{passive:false});' +
    'document.addEventListener("touchend",function(){cropState.isDragging=false;cropState.lastDist=0});' +
    'cropImg.addEventListener("wheel",function(e){var delta=e.deltaY>0?0.9:1.1;cropState.scale*=delta;cropState.scale=Math.max(0.5,Math.min(3,cropState.scale));updateCropImage();e.preventDefault()},{passive:false});' +
    'function openApp(appId){console.log("[iframe] Mở APP:",appId);var statusBar=document.getElementById("status-bar");if(appId==="settings"){document.getElementById("settings-app").classList.add("active");statusBar.classList.remove("light");statusBar.classList.add("dark")}else{window.parent.postMessage({type:"open-app-request",appId:appId},"*")}}' +
    'function goHome(fromExternal){console.log("[iframe] Về màn hình chính");var statusBar=document.getElementById("status-bar");document.querySelectorAll(".app-view").forEach(function(v){v.classList.remove("active")});var appContainer=document.getElementById("app-container");if(appContainer){appContainer.innerHTML="";appContainer.style.pointerEvents="none"}document.getElementById("home-screen").style.display="block";statusBar.classList.remove("dark");statusBar.classList.add("light");if(!fromExternal){window.parent.postMessage({type:"go-home-request"},"*")}}' +
    'function setWallpaper(url){document.getElementById("home-screen").style.backgroundImage="url("+url+")";document.getElementById("wallpaper-preview").style.backgroundImage="url("+url+")";try{localStorage.setItem("phone_wallpaper",url);window.parent.console.log("[Điện thoại] Hình nền đã lưu vào localStorage")}catch(err){window.parent.console.error("[Điện thoại] Lưu hình nền thất bại:",err)}}' +
    'function resetWallpaper(){try{localStorage.removeItem("phone_wallpaper")}catch(e){}setWallpaper("' + PHONE_CONFIG.defaultWallpaper + '")}' +
    '(function loadSavedWallpaper(){try{var saved=localStorage.getItem("phone_wallpaper");if(saved){document.getElementById("home-screen").style.backgroundImage="url("+saved+")";document.getElementById("wallpaper-preview").style.backgroundImage="url("+saved+")";window.parent.console.log("[Điện thoại] Đã tải hình nền được lưu")}}catch(e){}})();' +
    'async function fetchApiModels(){' +
    'var provider=document.getElementById("api-provider").value;' +
    'if(provider!=="openai"){if(window.parent.toastr)window.parent.toastr.info("Chỉ hỗ trợ giao diện tương thích OpenAI để lấy mô hình");return}' +
    'var base=document.getElementById("api-url").value.trim();' +
    'var key=document.getElementById("api-key").value.trim();' +
    'if(!key){if(window.parent.toastr)window.parent.toastr.warning("Vui lòng điền API KEY trước");return}' +
    'var btnText=document.getElementById("btn-fetch-models-text");' +
    'var originalText=btnText?btnText.textContent:"Lấy danh sách mô hình";' +
    'if(btnText)btnText.textContent="Đang lấy...";' +
    'try{' +
    'while(base.endsWith("/"))base=base.slice(0,-1);' +
    'var apiUrl=base.indexOf("/v1")!==-1?base+"/models":base+"/v1/models";' +
    'var res=await fetch(apiUrl,{headers:{"Authorization":"Bearer "+key,"Accept":"application/json"}});' +
    'if(!res.ok)throw new Error("Kết nối thất bại, vui lòng kiểm tra URL và KEY");' +
    'var data=await res.json();' +
    'var models=[];' +
    'if(data&&data.data&&Array.isArray(data.data)){for(var i=0;i<data.data.length;i++){if(data.data[i]&&data.data[i].id)models.push(data.data[i].id)}}' +
    'if(models.length===0){if(window.parent.toastr)window.parent.toastr.warning("Không lấy được mô hình nào");return}' +
    'var modelInput=document.getElementById("api-model");' +
    'var modelSelect=document.getElementById("api-model-select");' +
    'if(modelSelect){var opts="";for(var j=0;j<models.length;j++){opts+="<option value=\\""+models[j]+"\\">"+models[j]+"</option>"}modelSelect.innerHTML=opts;modelSelect.value=models[0];modelSelect.style.display="block"}' +
    'if(modelInput){modelInput.value=models[0];modelInput.style.display="none"}' +
    'if(window.parent.toastr)window.parent.toastr.success("Lấy thành công: "+models.length+" mô hình");' +
    '}catch(e){console.error("[Cài đặt] Lấy mô hình thất bại:",e);if(window.parent.toastr)window.parent.toastr.error(e.message||"Kết nối thất bại")}' +
    'finally{if(btnText)btnText.textContent=originalText}' +
    '}' +
    
    // HÀM LƯU CONFIG MỚI (Bao gồm Temperature, Top P, Max Tokens)
    'function saveApiSettings(){' +
    'var t=parseFloat(document.getElementById("api-temp").value);' +
    'var p=parseFloat(document.getElementById("api-topp").value);' +
    'var config={' +
    'provider:document.getElementById("api-provider").value,' +
    'apiUrl:document.getElementById("api-url").value,' +
    'apiKey:document.getElementById("api-key").value,' +
    'model:document.getElementById("api-model").value,' +
    'maxTokens:parseInt(document.getElementById("api-max-tokens").value,10)||6000,' +
    'temperature:isNaN(t)?0.85:t,' +
    'topP:isNaN(p)?1.0:p' +
    '};' +
    'console.log("[iframe] Lưu cài đặt API:",config);' +
    'window.parent.postMessage({type:"save-api-config",config:config},"*");' +
    'if(window.parent.toastr)window.parent.toastr.success("Đã lưu cài đặt")}' +
    
    'window.addEventListener("message",function(event){var data=event.data;if(!data||!data.type)return;switch(data.type){case"render-apps":if(data.apps)renderApps(data.apps);break;case"go-home":goHome(true);break;case"open-app":openExternalApp(data.appId);break}});' +
    'function openExternalApp(appId){console.log("[iframe] Mở APP ngoài:",appId);var renderer=window.parent.PhoneSystem&&window.parent.PhoneSystem.appRenderers&&window.parent.PhoneSystem.appRenderers[appId];if(!renderer){console.log("[iframe] APP sử dụng chế độ sự kiện:",appId);return}var statusBar=document.getElementById("status-bar");var homeScreen=document.getElementById("home-screen");var appContainer=document.getElementById("app-container");homeScreen.style.display="none";appContainer.innerHTML="";appContainer.style.pointerEvents="auto";statusBar.classList.remove("light");statusBar.classList.add("dark");try{renderer(appContainer)}catch(e){console.error("[iframe] Render APP thất bại:",e);appContainer.innerHTML="<div style=\\"padding:20px;color:#fff;text-align:center;\\">Lỗi tải APP: "+e.message+"</div>"}}' +
    'window.parent.postMessage({type:"iframe-ready"},"*");' +
    '<\/script>' +
    '</body>' +
    '</html>';

// ============ Biến hệ thống cho Long Press ============
var fmmHoldTimer = null;

// ============ Hàm Triệu Hồi (Summon) Điện Thoại Về Giữa ============
function centerPhone() {
    isCustomPosition = false;
    if (!window.parent.PhoneSystem.isOpen) {
        openPhone();
    } else {
        applyContainerStyles();
    }
    if (window.parent.toastr) {
        window.parent.toastr.success("Đã kéo điện thoại về giữa màn hình");
    }
}
window.parent.PhoneSystem.centerPhone = centerPhone;

// ============ Lắng nghe sự kiện Bấm Giữ trên Icon FMM (SillyTavern) ============
$(parentDocument).on('mousedown.stphone touchstart.stphone', function(e) {
    var $el = $(e.target).closest('div, button, li, a, span');
    if ($el.length && $el.html() && $el.html().includes('lucide:smartphone.svg')) {
        window.parent.PhoneSystem.holdTriggered = false;
        fmmHoldTimer = setTimeout(function() {
            window.parent.PhoneSystem.holdTriggered = true;
            centerPhone();
        }, 500);
    }
});

$(parentDocument).on('mousemove.stphone touchmove.stphone mouseup.stphone touchend.stphone', function() {
    if (fmmHoldTimer) clearTimeout(fmmHoldTimer);
});

// ============ Đăng ký vào Quản lý Menu lơ lửng ============
var _phoneFmmRegistered = false;
var _phoneFmmConfig = {
    id: 'phone',
    icon: '<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiPjxyZWN0IHdpZHRoPSIxNCIgaGVpZ2h0PSIyMCIgeD0iNSIgeT0iMiIgcng9IjIiIHJ5PSIyIi8+PHBhdGggZD0iTTEyIDE4aC4wMSIvPjwvZz48L3N2Zz4=" style="width:24px;height:24px;">',
    label: 'Điện thoại',
    onClick: function() { togglePhone(); },
    color: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    order: 1
};

function _tryRegisterPhoneFMM() {
    if (_phoneFmmRegistered) return true;
    if (!window.parent.FloatingMenuManager) return false;
    try {
        window.parent.FloatingMenuManager.registerButton(_phoneFmmConfig);
        _phoneFmmRegistered = true;
        $('#' + PHONE_CONFIG.id + '-fab').remove();
        console.log('[Điện thoại] Đã đăng ký vào FloatingMenuManager');
        return true;
    } catch (e) { return false; }
}

if (!_tryRegisterPhoneFMM()) {
    var _phoneRetryCount = 0;
    var _phoneRetryTimer = setInterval(function() {
        _phoneRetryCount++;
        if (_tryRegisterPhoneFMM() || _phoneRetryCount >= 20) clearInterval(_phoneRetryTimer);
    }, 500);
}

if (!_phoneFmmRegistered) {
    console.log('[Điện thoại] FloatingMenuManager chưa được tải, sử dụng nút lơ lửng độc lập');
    var savedPos = { top: 100, left: 20 };
    try { var saved = localStorage.getItem(getStorageKey('fabPos')); if (saved) savedPos = JSON.parse(saved); } catch (e) { }

    var $fab = $('<div>')
        .attr('id', PHONE_CONFIG.id + '-fab')
        .html('📱')
        .css({ top: savedPos.top + 'px', left: savedPos.left + 'px' })
        .appendTo('body');

    var isDragging = false; var hasMoved = false; var startX, startY, initialX, initialY; var fabRafId = null;

    $fab.on('mousedown touchstart', function (e) {
        isDragging = true; hasMoved = false; window.parent.PhoneSystem.holdTriggered = false;
        var touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX; startY = touch.clientY;
        var rect = $fab[0].getBoundingClientRect();
        initialX = rect.left; initialY = rect.top;
        $fab.addClass('dragging');
        fmmHoldTimer = setTimeout(function() {
            if (!hasMoved) { window.parent.PhoneSystem.holdTriggered = true; isDragging = false; $fab.removeClass('dragging'); centerPhone(); }
        }, 500);
        e.preventDefault();
    });

    function updateFabPosition(deltaX, deltaY) {
        if (fabRafId) cancelAnimationFrame(fabRafId);
        fabRafId = requestAnimationFrame(function () {
            var newX = Math.max(0, Math.min(initialX + deltaX, window.parent.innerWidth - 56));
            var newY = Math.max(0, Math.min(initialY + deltaY, window.parent.innerHeight - 56));
            $fab.css({ left: newX + 'px', top: newY + 'px' }); fabRafId = null;
        });
    }

    parentDocument.addEventListener('mousemove', function (e) {
        if (!isDragging) return; var deltaX = e.clientX - startX; var deltaY = e.clientY - startY;
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) { hasMoved = true; if (fmmHoldTimer) clearTimeout(fmmHoldTimer); }
        updateFabPosition(deltaX, deltaY); e.preventDefault();
    });

    parentDocument.addEventListener('touchmove', function (e) {
        if (!isDragging) return; var touch = e.touches[0]; var deltaX = touch.clientX - startX; var deltaY = touch.clientY - startY;
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) { hasMoved = true; if (fmmHoldTimer) clearTimeout(fmmHoldTimer); }
        updateFabPosition(deltaX, deltaY); e.preventDefault();
    }, { passive: false });

    var fabTouched = false;
    $fab.on('touchstart', function () { fabTouched = true; });

    $(parentDocument).on('mouseup touchend', function () {
        if (fmmHoldTimer) clearTimeout(fmmHoldTimer);
        if (!isDragging) return;
        isDragging = false; $fab.removeClass('dragging');
        var rect = $fab[0].getBoundingClientRect();
        localStorage.setItem(getStorageKey('fabPos'), JSON.stringify({ top: rect.top, left: rect.left }));
        if (fabTouched && !hasMoved) togglePhone();
        hasMoved = false; fabTouched = false;
    });

    $fab.on('click', function () {
        if (hasMoved || window.parent.PhoneSystem.holdTriggered) { hasMoved = false; return; }
        togglePhone();
    });
}

var $overlay = $('<div>').attr('id', PHONE_CONFIG.id + '-overlay').appendTo('body');
$overlay.on('click', function () { var s = window.parent.PhoneSystem.getSettings(); if (!s.isMultitasking) closePhone(); });

var $container = $('<div>').attr('id', PHONE_CONFIG.id + '-container').appendTo('body');
var $wrapper = $('<div>').attr('id', PHONE_CONFIG.id + '-wrapper').appendTo($container);
var $iframe = $('<iframe>').attr('id', PHONE_CONFIG.id + '-iframe').appendTo($wrapper);

var $quickActions = $('<div>')
    .attr('id', PHONE_CONFIG.id + '-quick-actions')
    .html('<div class="qa-btn qa-drag" title="Kéo để di chuyển">✥</div><div class="qa-btn qa-multitask" title="Đa nhiệm (Không làm mờ)">◧</div><div class="qa-btn qa-resize" title="Kéo để thay đổi kích thước">⤡</div><div class="qa-btn qa-close" title="Đóng điện thoại">✖</div>')
    .appendTo($container);

var isPhoneDragging = false; var isPhoneResizing = false;
var phoneActionStartX, phoneActionStartY; var phoneInitialLeft, phoneInitialTop;
var phoneInitialWidth, phoneInitialHeight; var isCustomPosition = false;

$container.on('click', '.qa-multitask', function(e) {
    e.stopPropagation(); var s = window.parent.PhoneSystem.getSettings(); s.isMultitasking = !s.isMultitasking; window.parent.PhoneSystem.saveSettings(s);
    $(this).toggleClass('active', s.isMultitasking); $overlay.toggleClass('multitask-mode', s.isMultitasking);
    if (s.isMultitasking && window.parent.toastr) window.parent.toastr.success("Đã bật Đa nhiệm: Bấm ra ngoài để chơi tiếp");
});

$container.on('mousedown touchstart', '.qa-drag', function(e) {
    isPhoneDragging = true; $wrapper.addClass('is-dragging-phone');
    var touch = e.touches ? e.touches[0] : e; phoneActionStartX = touch.clientX; phoneActionStartY = touch.clientY;
    var rect = $container[0].getBoundingClientRect(); var scale = calculateOptimalScale();
    $container.css({ position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', transform: 'scale(' + scale + ')', transformOrigin: 'top left', right: 'auto', bottom: 'auto' });
    phoneInitialLeft = rect.left; phoneInitialTop = rect.top; isCustomPosition = true; e.preventDefault();
});

$container.on('mousedown touchstart', '.qa-resize', function(e) {
    isPhoneResizing = true; $wrapper.addClass('is-dragging-phone');
    var touch = e.touches ? e.touches[0] : e; phoneActionStartX = touch.clientX; phoneActionStartY = touch.clientY;
    var s = window.parent.PhoneSystem.getSettings(); phoneInitialWidth = s.phoneWidth || PHONE_CONFIG.phoneWidth; phoneInitialHeight = s.phoneHeight || PHONE_CONFIG.phoneHeight;
    if (!isCustomPosition) {
        var rect = $container[0].getBoundingClientRect(); var scale = calculateOptimalScale();
        $container.css({ position: 'fixed', left: rect.left + 'px', top: rect.top + 'px', transform: 'scale(' + scale + ')', transformOrigin: 'top left' });
        isCustomPosition = true;
    }
    e.preventDefault();
});

$container.on('click', '.qa-close', function(e) { e.stopPropagation(); closePhone(); });

$(parentDocument).on('mousemove touchmove', function(e) {
    if (isPhoneDragging) {
        var touch = e.touches ? e.touches[0] : e; var deltaX = touch.clientX - phoneActionStartX; var deltaY = touch.clientY - phoneActionStartY;
        $container.css({ left: (phoneInitialLeft + deltaX) + 'px', top: (phoneInitialTop + deltaY) + 'px' }); e.preventDefault();
    } else if (isPhoneResizing) {
        var touch = e.touches ? e.touches[0] : e; var deltaX = touch.clientX - phoneActionStartX; var deltaY = touch.clientY - phoneActionStartY;
        var scale = calculateOptimalScale(); var newWidth = Math.max(300, phoneInitialWidth + deltaX / scale); var newHeight = Math.max(500, phoneInitialHeight + deltaY / scale);
        $wrapper.css({ width: newWidth + 'px', height: newHeight + 'px' }); e.preventDefault();
    }
});

$(parentDocument).on('mouseup touchend', function() {
    if (isPhoneDragging || isPhoneResizing) $wrapper.removeClass('is-dragging-phone');
    if (isPhoneDragging) isPhoneDragging = false;
    if (isPhoneResizing) {
        isPhoneResizing = false; var newWidth = parseInt($wrapper.css('width')); var newHeight = parseInt($wrapper.css('height'));
        var s = window.parent.PhoneSystem.getSettings(); s.phoneWidth = newWidth; s.phoneHeight = newHeight; window.parent.PhoneSystem.saveSettings(s);
        applyContainerStyles(); 
        if(window.parent.PhoneSystem.iframeWindow) {
            var doc = window.parent.PhoneSystem.iframeWindow.document;
            var inputW = doc.getElementById('phone-w'); var inputH = doc.getElementById('phone-h');
            if(inputW) inputW.value = newWidth; if(inputH) inputH.value = newHeight;
        }
    }
});

function applyContainerStyles() {
    var s = window.parent.PhoneSystem.getSettings();
    var pWidth = s.phoneWidth || PHONE_CONFIG.phoneWidth; var pHeight = s.phoneHeight || PHONE_CONFIG.phoneHeight;
    var scale = calculateOptimalScale(); var vw = window.parent.innerWidth; var vh = window.parent.innerHeight;

    $wrapper.css({ width: pWidth + 'px', height: pHeight + 'px', transform: 'none', borderRadius: '40px', boxShadow: '0 0 0 12px #222, 0 20px 40px rgba(0,0,0,0.5)' });

    if (!isCustomPosition) {
        if (isMobile()) {
            var scaledWidth = pWidth * scale; var scaledHeight = pHeight * scale;
            var scrollTop = window.parent.pageYOffset || parentDocument.documentElement.scrollTop;
            var scrollLeft = window.parent.pageXOffset || parentDocument.documentElement.scrollLeft;
            var topPosition = Math.max(50, (vh - scaledHeight) / 2) + scrollTop;
            var leftPosition = Math.max(10, (vw - scaledWidth) / 2) + scrollLeft;
            $container.css({ position: 'absolute', top: topPosition + 'px', left: leftPosition + 'px', transform: 'scale(' + scale + ')', transformOrigin: 'top left' });
        } else {
            $container.css({ position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%) scale(' + scale + ')', transformOrigin: 'center center' });
        }
    } else {
        $container.css({ transform: 'scale(' + scale + ')', transformOrigin: 'top left' });
    }
}

applyContainerStyles();
$(window.parent).on('resize', applyContainerStyles);

$iframe.on('load', function () {
    window.parent.PhoneSystem.iframeWindow = this.contentWindow;
    setTimeout(function () {
        if (!window.parent.PhoneSystem.iframeWindow) return;
        var apps = window.parent.PhoneSystem.getAppsForRender();
        window.parent.PhoneSystem.iframeWindow.postMessage({ type: 'render-apps', apps: apps }, '*');
    }, 100);
});

$iframe[0].srcdoc = iframeHTML;

window.parent.addEventListener('message', async function (event) {
    var data = event.data;
    if (!data || !data.type) return;

    switch (data.type) {
        case 'iframe-ready':
            if (window.parent.PhoneSystem.iframeWindow) {
                var apps = window.parent.PhoneSystem.getAppsForRender();
                window.parent.PhoneSystem.iframeWindow.postMessage({ type: 'render-apps', apps: apps }, '*');
            }
            break;
        case 'open-app-request': window.parent.PhoneSystem.openApp(data.appId); break;
        case 'go-home-request': window.parent.PhoneSystem.goHome(); break;
        case 'save-wallpaper': var s1 = window.parent.PhoneSystem.getSettings(); s1.wallpaper = data.url; window.parent.PhoneSystem.saveSettings(s1); break;
        
        // Nhận dữ liệu cấu hình API từ UI Settings
        case 'save-api-config': 
            var s2 = window.parent.PhoneSystem.getSettings(); 
            s2.apiConfig = Object.assign({}, s2.apiConfig, data.config); 
            window.parent.PhoneSystem.saveSettings(s2); 
            break;
        
        case 'save-display-settings':
            var s3 = window.parent.PhoneSystem.getSettings(); 
            s3.phoneWidth = data.width; s3.phoneHeight = data.height; s3.fontScale = data.fontScale; 
            s3.iconSize = data.iconSize; s3.appsPerPage = data.appsPerPage;
            window.parent.PhoneSystem.saveSettings(s3); applyContainerStyles();
            if (window.parent.PhoneSystem.iframeWindow) {
                window.parent.PhoneSystem.iframeWindow.document.documentElement.style.setProperty('--font-scale', s3.fontScale);
                window.parent.PhoneSystem.iframeWindow.document.documentElement.style.setProperty('--icon-size', s3.iconSize + 'px');
                var appsUpdated = window.parent.PhoneSystem.getAppsForRender();
                window.parent.PhoneSystem.iframeWindow.postMessage({ type: 'render-apps', apps: appsUpdated }, '*');
            }
            if (window.parent.toastr) window.parent.toastr.success("Đã áp dụng cài đặt hiển thị");
            break;
            
        case 'reset-display-settings':
            var s4 = window.parent.PhoneSystem.getSettings(); 
            s4.phoneWidth = PHONE_CONFIG.phoneWidth; s4.phoneHeight = PHONE_CONFIG.phoneHeight; 
            s4.fontScale = 1.0; s4.iconSize = 60; s4.appsPerPage = 20;
            window.parent.PhoneSystem.saveSettings(s4); applyContainerStyles();
            if (window.parent.PhoneSystem.iframeWindow) {
                window.parent.PhoneSystem.iframeWindow.document.documentElement.style.setProperty('--font-scale', 1.0);
                window.parent.PhoneSystem.iframeWindow.document.documentElement.style.setProperty('--icon-size', '60px');
                var appsReset = window.parent.PhoneSystem.getAppsForRender();
                window.parent.PhoneSystem.iframeWindow.postMessage({ type: 'render-apps', apps: appsReset }, '*');
            }
            if (window.parent.toastr) window.parent.toastr.success("Đã khôi phục kích thước gốc");
            break;
    }
});

function togglePhone() {
    if (window.parent.PhoneSystem.holdTriggered) { window.parent.PhoneSystem.holdTriggered = false; return; }
    if (window.parent.PhoneSystem.isOpen) closePhone(); else openPhone();
}

function openPhone() {
    applyContainerStyles();
    var s = window.parent.PhoneSystem.getSettings();
    if (s.isMultitasking) { $('.qa-multitask').addClass('active'); $overlay.addClass('multitask-mode'); } 
    else { $('.qa-multitask').removeClass('active'); $overlay.removeClass('multitask-mode'); }
    $overlay.addClass('show'); $container.addClass('show'); window.parent.PhoneSystem.isOpen = true; window.parent.PhoneSystem.emit('phone-opened');
}

function closePhone() {
    $overlay.removeClass('show'); $container.removeClass('show'); window.parent.PhoneSystem.isOpen = false; window.parent.PhoneSystem.goHome(); window.parent.PhoneSystem.emit('phone-closed');
}

window.parent.PhoneSystem.on('app-registered', function () {
    if (window.parent.PhoneSystem.iframeWindow) {
        var apps = window.parent.PhoneSystem.getAppsForRender();
        window.parent.PhoneSystem.iframeWindow.postMessage({ type: 'render-apps', apps: apps }, '*');
    }
});

function cleanupPhone() {
    if (window.parent.FloatingMenuManager) window.parent.FloatingMenuManager.unregisterButton('phone');
    $('#' + PHONE_CONFIG.id + '-fab').remove(); $('#' + PHONE_CONFIG.id + '-overlay').remove(); $('#' + PHONE_CONFIG.id + '-container').remove(); $('#' + PHONE_CONFIG.id + '-styles').remove();
    $(parentDocument).off('.stphone');
    if (window.parent.PhoneSystem) { window.parent.PhoneSystem.isOpen = false; window.parent.PhoneSystem.isVisible = false; window.parent.PhoneSystem.iframeWindow = null; window.parent.PhoneSystem.eventListeners.clear(); }
}

$(window).on('pagehide', function () { cleanupPhone(); });
if (typeof eventOn === 'function') { eventOn('chat_id_changed', function (chatFileName) { if (window.parent.PhoneSystem && window.parent.PhoneSystem.isOpen) closePhone(); }); }

window.parent.PhoneSystem.emit('main-ready');
console.log('[Điện thoại] Hoàn tất khởi tạo');