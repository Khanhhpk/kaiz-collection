/**
 * Module: App Terminal Debug - 10
 * ID: ef99c6e4-2cf2-456b-877e-e9733424154e
 * Converted for SillyTavern Native Extension
 */

// ==================== APP Trình gỡ lỗi ====================
// Cung cấp chức năng xem nhật ký bảng điều khiển và xem từ nhắc API
// Phụ thuộc: phone_main.js

(function () {
    'use strict';

    // ==================== Cấu hình APP ====================
    const APP_ID = 'debugger';
    const APP_NAME = 'Terminal gỡ lỗi';
    const APP_ICON = '<img src="https://api.iconify.design/ri:bug-fill.svg?color=white" style="width:70%;height:70%">';
    const APP_COLOR = 'linear-gradient(135deg, #2d3436, #000000)';

    // ==================== Lưu trữ dữ liệu ====================
    const DebugData = {
        consoleLogs: [],      // Nhật ký bảng điều khiển
        apiCalls: [],         // Ghi chép lệnh gọi API
        maxLogs: 500,         // Số lượng nhật ký tối đa
        maxApiCalls: 100      // Số lượng ghi chép API tối đa
    };

    // ==================== Định nghĩa kiểu dáng (Style) ====================
    const APP_STYLES = `
        .debug-app {
            display: flex;
            flex-direction: column;
            height: 100%;
            background: #0f0f12;
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            padding-top: 44px;
            box-sizing: border-box;
            color: #dcdde1;
        }

        .debug-header {
            background: rgba(20, 20, 23, 0.8);
            backdrop-filter: blur(12px);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            z-index: 10;
        }

        .debug-back-btn {
            width: 30px;
            height: 30px;
            border: none;
            background: rgba(255,255,255,0.1);
            border-radius: 8px;
            color: #fff;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .debug-back-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: translateX(-2px);
        }

        .debug-title {
            flex: 1;
            font-size: 15px;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.5px;
        }

        .debug-clear-btn {
            background: rgba(231, 76, 60, 0.2);
            border: 1px solid rgba(231, 76, 60, 0.3);
            padding: 6px 12px;
            border-radius: 6px;
            color: #ff6b6b;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
            transition: all 0.2s;
        }

        .debug-clear-btn:hover {
            background: rgba(231, 76, 60, 0.3);
            transform: scale(1.05);
        }

        /* Thẻ (Tab) */
        .debug-tabs {
            display: flex;
            background: #141416;
            padding: 4px;
            margin: 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .debug-tab {
            flex: 1;
            padding: 10px;
            text-align: center;
            cursor: pointer;
            color: #718093;
            font-size: 13px;
            border: none;
            background: none;
            transition: all 0.3s;
            position: relative;
            font-weight: 600;
        }

        .debug-tab.active {
            color: #a8e6cf;
        }
        
        .debug-tab.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 20%;
            width: 60%;
            height: 2px;
            background: #a8e6cf;
            box-shadow: 0 0 8px rgba(168, 230, 207, 0.6);
            border-radius: 2px;
        }

        .debug-tab-badge {
            background: #ff4757;
            color: #fff;
            padding: 1px 5px;
            border-radius: 4px;
            font-size: 9px;
            margin-left: 6px;
            vertical-align: middle;
            font-weight: 700;
        }

        /* Khu vực nội dung */
        .debug-content {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
            scroll-behavior: smooth;
        }

        .debug-content::-webkit-scrollbar {
            width: 4px;
        }

        .debug-content::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.15);
            border-radius: 2px;
        }

        /* Mục nhật ký */
        .log-item {
            padding: 8px;
            margin-bottom: 6px;
            border-radius: 6px;
            font-size: 11px;
            line-height: 1.5;
            word-break: break-all;
            background: rgba(255,255,255,0.02);
            border-left: 3px solid transparent;
            font-family: 'Menlo', monospace;
        }

        .log-item:hover {
            background: rgba(255,255,255,0.05);
        }

        .log-item.log { border-left-color: #3498db; }
        .log-item.warn { border-left-color: #f1c40f; background: rgba(241, 196, 15, 0.05); }
        .log-item.error { border-left-color: #ff4757; background: rgba(255, 71, 87, 0.08); }
        .log-item.info { border-left-color: #2ecc71; }

        .log-time {
            color: #57606f;
            font-size: 10px;
            margin-bottom: 4px;
            font-family: 'Arial', sans-serif;
        }

        .log-type {
            display: inline-block;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 9px;
            margin-right: 6px;
            text-transform: uppercase;
            font-weight: bold;
            opacity: 0.8;
        }

        .log-type.log { background: #3498db; color: #fff; }
        .log-type.warn { background: #f1c40f; color: #000; }
        .log-type.error { background: #ff4757; color: #fff; }
        .log-type.info { background: #2ecc71; color: #fff; }

        .log-message {
            color: #ced6e0;
            white-space: pre-wrap;
        }
        
        /* Tô sáng JSON bản đơn giản */
        .json-key { color: #5352ed; }
        .json-string { color: #ffa502; }
        .json-number { color: #ff6b81; }
        .json-boolean { color: #2ed573; }

        /* Mục lệnh gọi API */
        .api-item {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 8px;
            margin-bottom: 12px;
            overflow: hidden;
            transition: all 0.2s;
        }

        .api-header {
            padding: 10px 12px;
            background: rgba(255,255,255,0.02);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }

        .api-header:hover {
            background: rgba(255,255,255,0.05);
        }

        .api-method {
            background: #2f3542;
            color: #a4b0be;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            margin-right: 8px;
            font-weight: bold;
            border: 1px solid rgba(255,255,255,0.1);
        }

        .api-model {
            color: #7bed9f;
            font-size: 11px;
            font-weight: 500;
        }

        .api-time {
            color: #57606f;
            font-size: 10px;
            margin-right: 8px;
        }

        .api-toggle {
            color: #747d8c;
            font-size: 12px;
            transition: transform 0.2s;
        }
        
        .api-item.expanded .api-toggle {
            transform: rotate(180deg);
        }

        .api-body {
            display: none;
            padding: 0;
            border-top: 1px solid rgba(255,255,255,0.05);
            background: rgba(0,0,0,0.2);
        }

        .api-body.expanded {
            display: block;
            animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .api-section {
            padding: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        
        .api-section:last-child {
            border-bottom: none;
        }

        .api-section-title {
            color: #a4b0be;
            font-size: 10px;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .api-section-content {
            background: #000;
            padding: 10px;
            border-radius: 4px;
            font-size: 11px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-all;
            max-height: 400px;
            overflow-y: auto;
            color: #dcdde1;
            font-family: 'Consolas', monospace;
            border: 1px solid rgba(255,255,255,0.05);
        }

        /* Trạng_thái trống */
        .debug-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 300px;
            color: #57606f;
        }

        .debug-empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.3;
            filter: grayscale(100%);
        }

        .debug-empty-text {
            font-size: 12px;
            opacity: 0.6;
        }

        /* Bộ lọc */
        .debug-filter {
            padding: 6px 12px;
            background: #141416;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .filter-btn {
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 10px;
            cursor: pointer;
            border: 1px solid rgba(255,255,255,0.1);
            background: none;
            color: #747d8c;
            transition: all 0.2s;
        }

        .filter-btn:hover {
            color: #fff;
            border-color: rgba(255,255,255,0.3);
        }

        .filter-btn.active {
            background: #3742fa;
            color: #fff;
            border-color: #3742fa;
            box-shadow: 0 2px 8px rgba(55, 66, 250, 0.4);
        }
        
        /* Bong bóng vai trò */
        .role-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            margin-bottom: 4px;
            font-weight: bold;
        }
        .role-user { background: #2f3542; color: #fff; }
        .role-assistant { background: #1e90ff; color: #fff; }
        .role-system { background: #ff4757; color: #fff; }
    `;

    // ==================== Đánh chặn bảng điều khiển ====================
    let currentIframeDoc = null;
    let originalConsole = {};

    function setupConsoleInterceptor() {
        const targetWindow = window.parent;

        // Lưu các phương thức gốc
        originalConsole = {
            log: targetWindow.console.log.bind(targetWindow.console),
            warn: targetWindow.console.warn.bind(targetWindow.console),
            error: targetWindow.console.error.bind(targetWindow.console),
            info: targetWindow.console.info.bind(targetWindow.console)
        };

        // Đánh chặn phương thức console
        ['log', 'warn', 'error', 'info'].forEach(type => {
            targetWindow.console[type] = function (...args) {
                // Gọi phương thức gốc
                originalConsole[type](...args);

                // Ghi vào DebugData
                addLog(type, args);
            };
        });

        console.log('[Trình gỡ lỗi] Đã khởi động đánh chặn bảng điều khiển');
    }

    function addLog(type, args) {
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');

        DebugData.consoleLogs.push({
            type,
            message,
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false })
        });

        // Giới hạn số lượng
        if (DebugData.consoleLogs.length > DebugData.maxLogs) {
            DebugData.consoleLogs.shift();
        }

        // Nếu hiện tại đang ở dạng xem bảng điều khiển, tự động làm mới
        updateLogCount();

        // Làm mới theo Thời_gian thực (nếu mở)
        if (currentIframeDoc && currentIframeDoc.querySelector('.debug-tab.active[data-tab="console"]')) {
            requestAnimationFrame(() => renderConsoleLogs('all', true)); // Chỉ nối thêm hoặc làm mới đơn giản
        }
    }

    // ==================== Đánh chặn API ====================
    function setupAPIInterceptor() {
        const PhoneSystem = window.parent.PhoneSystem;
        if (!PhoneSystem) {
            setTimeout(setupAPIInterceptor, 500);
            return;
        }

        // Lưu phương thức gốc
        const originalCallAPI = PhoneSystem.callExternalAPI.bind(PhoneSystem);

        // Đánh chặn lệnh gọi API
        PhoneSystem.callExternalAPI = async function (messages, options) {
            const startTime = Date.now();
            const apiRecord = {
                id: Date.now(),
                time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                model: options?.model || PhoneSystem.getSettings()?.apiConfig?.model || 'unknown',
                messages: messages,
                options: options,
                response: null,
                error: null,
                duration: 0
            };

            try {
                const result = await originalCallAPI(messages, options);
                apiRecord.response = result;
                apiRecord.duration = Date.now() - startTime;
                return result;
            } catch (e) {
                apiRecord.error = e.message;
                apiRecord.duration = Date.now() - startTime;
                throw e;
            } finally {
                DebugData.apiCalls.unshift(apiRecord);
                if (DebugData.apiCalls.length > DebugData.maxApiCalls) {
                    DebugData.apiCalls.pop();
                }
                updateApiCount();
                // Làm mới theo Thời_gian thực
                if (currentIframeDoc && currentIframeDoc.querySelector('.debug-tab.active[data-tab="api"]')) {
                    renderApiCalls();
                }
            }
        };

        // Đồng thời đánh chặn lệnh gọi API của ChatCore (nếu tồn tại)
        if (window.parent.ChatCore) {
            const originalChatCoreAPI = window.parent.ChatCore.callAPI.bind(window.parent.ChatCore);
            window.parent.ChatCore.callAPI = async function (prompt) {
                const startTime = Date.now();
                const apiRecord = {
                    id: Date.now(),
                    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                    model: this.getAPIConfig()?.model || 'unknown',
                    messages: [{ role: 'user', content: prompt }],
                    options: { source: 'ChatCore' },
                    response: null,
                    error: null,
                    duration: 0
                };

                try {
                    const result = await originalChatCoreAPI(prompt);
                    apiRecord.response = result;
                    apiRecord.duration = Date.now() - startTime;
                    return result;
                } catch (e) {
                    apiRecord.error = e.message;
                    apiRecord.duration = Date.now() - startTime;
                    throw e;
                } finally {
                    DebugData.apiCalls.unshift(apiRecord);
                    if (DebugData.apiCalls.length > DebugData.maxApiCalls) {
                        DebugData.apiCalls.pop();
                    }
                    updateApiCount();
                }
            };
        }

        console.log('[Trình gỡ lỗi] Đã khởi động đánh chặn API');
    }

    // ==================== Cập nhật UI ====================
    function updateLogCount() {
        if (!currentIframeDoc) return;
        const badge = currentIframeDoc.getElementById('console-badge');
        if (badge) {
            const errorCount = DebugData.consoleLogs.filter(l => l.type === 'error').length;
            badge.textContent = errorCount > 0 ? errorCount : '';
            badge.style.display = errorCount > 0 ? 'inline-block' : 'none';
        }
    }

    function updateApiCount() {
        if (!currentIframeDoc) return;
        const badge = currentIframeDoc.getElementById('api-badge');
        if (badge) {
            badge.textContent = DebugData.apiCalls.length;
            badge.style.display = DebugData.apiCalls.length > 0 ? 'inline-block' : 'none';
        }
    }

    // ==================== Tạo HTML ====================
    function generateAppHTML() {
        const errorCount = DebugData.consoleLogs.filter(l => l.type === 'error').length;

        return `
            <div class="debug-app">
                <div class="debug-header">
                    <button class="debug-back-btn" id="btn-debug-home">‹</button>
                    <span class="debug-title">DEBUGGER TERMINAL</span>
                    <button class="debug-clear-btn" id="btn-clear-logs">CLEAR</button>
                </div>
                <div class="debug-tabs">
                    <button class="debug-tab active" data-tab="console">
                        CONSOLE
                        <span class="debug-tab-badge" id="console-badge" style="display:${errorCount > 0 ? 'inline-block' : 'none'}">${errorCount || ''}</span>
                    </button>
                    <button class="debug-tab" data-tab="api">
                        API TRACE
                        <span class="debug-tab-badge" id="api-badge" style="display:${DebugData.apiCalls.length > 0 ? 'inline-block' : 'none'}">${DebugData.apiCalls.length || ''}</span>
                    </button>
                </div>
                <div class="debug-filter" id="debug-filter">
                    <button class="filter-btn active" data-filter="all">ALL</button>
                    <button class="filter-btn" data-filter="log">LOG</button>
                    <button class="filter-btn" data-filter="info">INFO</button>
                    <button class="filter-btn" data-filter="warn">WARN</button>
                    <button class="filter-btn" data-filter="error">ERR</button>
                </div>
                <div class="debug-content" id="debug-content">
                    </div>
            </div>
        `;
    }

    function renderConsoleLogs(filter = 'all', append = false) {
        const doc = currentIframeDoc || document;
        const container = doc.getElementById('debug-content');
        if (!container) return;

        // Lấy Trạng_thái bộ lọc hiện tại (nếu không được chỉ định bắt buộc)
        if (filter === 'all') {
            const activeBtn = doc.querySelector('.filter-btn.active');
            if (activeBtn) filter = activeBtn.dataset.filter;
        }

        const logs = filter === 'all'
            ? DebugData.consoleLogs
            : DebugData.consoleLogs.filter(l => l.type === filter);

        if (logs.length === 0) {
            container.innerHTML = `
                <div class="debug-empty">
                    <div class="debug-empty-icon">_</div>
                    <div class="debug-empty-text">NO LOGS AVAILABLE</div>
                    <div style="font-size:10px;color:#333;margin-top:10px">SYSTEM READY</div>
                </div>
            `;
            return;
        }

        // Hiển thị theo thứ tự đảo ngược (mới nhất ở trên)
        const reversedLogs = [...logs].reverse();

        container.innerHTML = reversedLogs.map(log => `
            <div class="log-item ${log.type}">
                <div class="log-time">[${log.time}]</div>
                <div style="display:flex;align-items:center;margin-bottom:2px;">
                     <span class="log-type ${log.type}">${log.type}</span>
                </div>
                <div class="log-message">${escapeHtml(log.message)}</div>
            </div>
        `).join('');
    }

    function renderApiCalls() {
        const doc = currentIframeDoc || document;
        const container = doc.getElementById('debug-content');
        const filterDiv = doc.getElementById('debug-filter');

        if (!container) return;

        // Ẩn bộ lọc (Trang API không cần)
        if (filterDiv) filterDiv.style.display = 'none';

        if (DebugData.apiCalls.length === 0) {
            container.innerHTML = `
                <div class="debug-empty">
                    <div class="debug-empty-icon">⚡</div>
                    <div class="debug-empty-text">NO API REQUESTS</div>
                </div>
            `;
            return;
        }

        container.innerHTML = DebugData.apiCalls.map((api, index) => `
            <div class="api-item ${index === 0 ? 'latest' : ''}" data-id="${api.id}">
                <div class="api-header">
                    <div style="display:flex;align-items:center">
                        <span class="api-method">POST</span>
                        <span class="api-model">${api.model}</span>
                    </div>
                    <div style="display:flex;align-items:center">
                        <span class="api-time">${api.time} • ${api.duration}ms</span>
                        <span class="api-toggle">▼</span>
                    </div>
                </div>
                <div class="api-body">
                    <div class="api-section">
                        <div class="api-section-title">📤 MESSAGES (${api.messages?.length || 0})</div>
                        <div class="api-section-content">${formatMessages(api.messages)}</div>
                    </div>
                    ${api.response ? `
                    <div class="api-section">
                        <div class="api-section-title">📥 RESPONSE</div>
                        <div class="api-section-content" style="color:#a8e6cf">${escapeHtml(api.response)}</div>
                    </div>
                    ` : ''}
                    ${api.error ? `
                    <div class="api-section">
                        <div class="api-section-title">❌ ERROR</div>
                        <div class="api-section-content" style="color:#ff4757;border-color:#ff4757">${escapeHtml(api.error)}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Liên kết sự kiện mở rộng/thu gọn
        container.querySelectorAll('.api-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const item = header.closest('.api-item');
                const body = item.querySelector('.api-body');
                body.classList.toggle('expanded');
                item.classList.toggle('expanded');
            });
        });
    }

    function formatMessages(messages) {
        if (!messages || messages.length === 0) return '(EMPTY)';

        return messages.map((msg, i) => {
            const role = msg.role || 'unknown';
            const content = msg.content || '';
            const roleClass = `role-${role}`;
            return `<span class="role-badge ${roleClass}">${role.toUpperCase()}</span>\n${escapeHtml(content)}`;
        }).join('\n\n');
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== Liên kết sự kiện ====================
    function bindEvents() {
        const doc = currentIframeDoc || document;

        // Quay lại màn hình chính
        doc.getElementById('btn-debug-home')?.addEventListener('click', () => {
            const PhoneSystem = window.parent.PhoneSystem;
            if (PhoneSystem) PhoneSystem.goHome();
        });

        // Nút xóa sạch
        doc.getElementById('btn-clear-logs')?.addEventListener('click', () => {
            const activeTab = doc.querySelector('.debug-tab.active')?.dataset.tab;
            if (activeTab === 'console') {
                DebugData.consoleLogs = [];
                renderConsoleLogs();
            } else {
                DebugData.apiCalls = [];
                renderApiCalls();
            }
            updateLogCount();
            updateApiCount();
        });

        // Chuyển đổi thẻ
        doc.querySelectorAll('.debug-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                doc.querySelectorAll('.debug-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const filterDiv = doc.getElementById('debug-filter');

                if (tab.dataset.tab === 'console') {
                    if (filterDiv) filterDiv.style.display = 'flex';
                    renderConsoleLogs();
                } else {
                    renderApiCalls();
                }
            });
        });

        // Nút lọc
        doc.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                doc.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderConsoleLogs(btn.dataset.filter);
            });
        });
    }

    // ==================== Tích hợp PhoneSystem ====================
    function waitForPhoneSystem(callback) {
        if (window.parent.PhoneSystem) {
            callback();
        } else {
            setTimeout(() => waitForPhoneSystem(callback), 100);
        }
    }

    function openApp() {
        const phoneSystem = window.parent.PhoneSystem;
        if (!phoneSystem || !phoneSystem.iframeWindow) {
            setTimeout(openApp, 200);
            return;
        }

        const iframeDoc = phoneSystem.iframeWindow.document;
        currentIframeDoc = iframeDoc;

        const appContainer = iframeDoc.getElementById('app-container');
        const homeScreen = iframeDoc.getElementById('home-screen');
        const statusBar = iframeDoc.getElementById('status-bar');

        if (!appContainer) {
            console.error('[Trình gỡ lỗi] Không tìm thấy app-container');
            return;
        }

        if (homeScreen) homeScreen.style.display = 'none';
        appContainer.innerHTML = '';
        appContainer.style.display = 'block';
        appContainer.style.pointerEvents = 'auto';

        if (statusBar) {
            statusBar.classList.remove('light');
            statusBar.classList.add('dark');
        }

        // Tiêm kiểu dáng (Style)
        if (!iframeDoc.getElementById('debug-app-styles')) {
            const style = iframeDoc.createElement('style');
            style.id = 'debug-app-styles';
            style.textContent = APP_STYLES;
            iframeDoc.head.appendChild(style);
        } else {
            iframeDoc.getElementById('debug-app-styles').textContent = APP_STYLES;
        }

        // Tạo nội dung APP
        const appDiv = iframeDoc.createElement('div');
        appDiv.id = 'debug-app-wrapper';
        appDiv.style.cssText = 'width:100%;height:100%;';
        appDiv.innerHTML = generateAppHTML();
        appContainer.appendChild(appDiv);

        // Liên kết sự kiện và kết xuất
        setTimeout(() => {
            bindEvents();
            renderConsoleLogs();
        }, 50);

        console.log('[Trình gỡ lỗi] APP đã mở');
    }

    function closeApp() {
        if (!window.parent) return;
        const phoneSystem = window.parent.PhoneSystem;
        if (!phoneSystem || !phoneSystem.iframeWindow) return;

        try {
            const iframeDoc = phoneSystem.iframeWindow.document;

            const appContainer = iframeDoc.getElementById('app-container');
            if (appContainer) {
                appContainer.innerHTML = '';
                appContainer.style.pointerEvents = 'none';
            }

            const homeScreen = iframeDoc.getElementById('home-screen');
            if (homeScreen) homeScreen.style.display = 'block';

            const statusBar = iframeDoc.getElementById('status-bar');
            if (statusBar) {
                statusBar.classList.remove('dark');
                statusBar.classList.add('light');
            }

            currentIframeDoc = null;
        } catch (e) {
            console.error('[Trình gỡ lỗi] closeApp thất bại:', e);
        }
    }

    // Đăng ký APP
    waitForPhoneSystem(() => {
        console.log('[Trình gỡ lỗi] PhoneSystem đã sẵn sàng, bắt đầu đăng ký');

        window.parent.PhoneSystem.registerApp({
            id: APP_ID,
            name: APP_NAME,
            icon: APP_ICON,
            color: APP_COLOR,
            order: 10
        });

        window.parent.PhoneSystem.on('app-opened', (data) => {
            if (data.id === APP_ID) openApp();
        });

        window.parent.PhoneSystem.on('go-home', closeApp);

        // Khởi động trình đánh chặn
        setupConsoleInterceptor();
        setupAPIInterceptor();

        console.log('[Trình gỡ lỗi] APP đã đăng ký:', APP_NAME);
    });

    // Xuất ra toàn cục
    window.parent.DebugApp = {
        getData: () => DebugData,
        clearLogs: () => { DebugData.consoleLogs = []; },
        clearApiCalls: () => { DebugData.apiCalls = []; }
    };

    console.log('✅ DebugApp Module trình gỡ lỗi đã được tải');

})();