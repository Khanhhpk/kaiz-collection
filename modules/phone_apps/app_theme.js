/**
 * Điện thoại nhỏ - APP Cá nhân hóa (Theme & App Manager) v1.2
 * Tính năng:
 * - Đổi hình nền (Wallpaper) cho Home Screen.
 * - Sắp xếp thứ tự (Order), Đổi Tên, Đổi Icon cho MỌI App.
 * - Nâng cấp v1.1: Monkey Patch getAppsForRender.
 * - Nâng cấp v1.2: Tự động nhận diện Link Ảnh thô (URL) và convert thành HTML Image Tag, giúp người dùng không cần biết code.
 */

(function () {
    'use strict';

    function waitForPhoneSystem(callback) {
        if (window.parent.PhoneSystem) {
            callback();
        } else {
            console.log('[Theme Manager] Đang đợi PhoneSystem tải...');
            setTimeout(function () { waitForPhoneSystem(callback); }, 100);
        }
    }

    waitForPhoneSystem(function () {
        console.log('[Theme Manager] Khởi tạo...');

        const APP_ID = 'theme_manager';
        const APP_NAME = 'Cá nhân hóa';
        const APP_ICON = '<img src="https://api.iconify.design/ri:palette-line.svg?color=white" style="width:70%;height:70%">';
        const APP_COLOR = 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)';
        const STORAGE_KEY = 'phone_theme_settings_v1';

        // ==================== HỆ THỐNG DỮ LIỆU ====================

        function getSettings() {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { wallpaper: '', apps: {} }; } 
            catch (e) { return { wallpaper: '', apps: {} }; }
        }

        function saveSettings(settings) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }

        function clearSettings() {
            localStorage.removeItem(STORAGE_KEY);
        }

        function getRegisteredApps() {
            let apps = [];
            try {
                if (window.parent.PhoneSystem.registeredApps instanceof Map) {
                    apps = Array.from(window.parent.PhoneSystem.registeredApps.values());
                } else if (typeof window.parent.PhoneSystem.getAppsForRender === 'function') {
                    apps = window.parent.PhoneSystem.getAppsForRender();
                }
            } catch(e) {}

            if (!apps.find(a => a.id === 'settings')) {
                apps.push({ id: 'settings', name: 'Cài đặt', icon: '⚙️', order: 999 });
            }
            return apps;
        }

        // ==================== MONKEY PATCHING ====================
        if (!window.parent.PhoneSystem._isThemePatched) {
            const originalGetAppsForRender = window.parent.PhoneSystem.getAppsForRender;
            
            window.parent.PhoneSystem.getAppsForRender = function() {
                let apps = originalGetAppsForRender.call(this);
                const themeSettings = getSettings();
                
                if (themeSettings && themeSettings.apps) {
                    apps = apps.map(app => {
                        const override = themeSettings.apps[app.id];
                        if (override) {
                            return Object.assign({}, app, {
                                name: override.name && override.name.trim() !== '' ? override.name : app.name,
                                icon: override.icon && override.icon.trim() !== '' ? override.icon : app.icon,
                                order: override.order !== undefined && override.order !== '' ? parseInt(override.order) : app.order
                            });
                        }
                        return app;
                    });
                    apps.sort((a, b) => a.order - b.order);
                }
                return apps;
            };
            window.parent.PhoneSystem._isThemePatched = true;
        }

        function applyDOMOverrides(iframeDoc) {
            const settings = getSettings();
            if (!iframeDoc) return;

            let styleEl = iframeDoc.getElementById('custom-theme-override-styles');
            if (!styleEl) {
                styleEl = iframeDoc.createElement('style');
                styleEl.id = 'custom-theme-override-styles';
                iframeDoc.head.appendChild(styleEl);
            }

            let cssRules = '';
            if (settings.wallpaper && settings.wallpaper.trim() !== '') {
                cssRules += `
                    #home-screen {
                        background-image: url('${settings.wallpaper}') !important;
                        background-size: cover !important;
                        background-position: center !important;
                        background-color: transparent !important;
                    }
                    #home-screen::before {
                        content: ''; position: absolute; inset: 0; 
                        background: rgba(0,0,0,0.2); z-index: -1; pointer-events: none;
                    }
                `;
            }
            styleEl.innerHTML = cssRules;

            if (settings.apps && settings.apps['settings']) {
                const conf = settings.apps['settings'];
                const settingsDock = iframeDoc.querySelector('.dock [data-app-id="settings"]');
                if (settingsDock) {
                    if (conf.icon && conf.icon.trim() !== '') {
                        const iconContainer = settingsDock.querySelector('.dock-icon');
                        if (iconContainer) {
                            if (conf.icon.startsWith('<')) iconContainer.innerHTML = conf.icon;
                            else iconContainer.innerHTML = `<img src="${conf.icon}" style="width:100%;height:100%;border-radius:inherit;object-fit:cover;">`;
                        }
                    }
                }
            }
        }

        // ==================== GIAO DIỆN APP ====================

        function generateCSS() {
            return `
            <style id="theme-manager-styles">
                #theme-app * { box-sizing: border-box; font-family: -apple-system, sans-serif; }
                .theme-header {
                    height: 60px; display: flex; align-items: center; padding: 0 16px;
                    background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
                    border-bottom: 1px solid rgba(0,0,0,0.1); flex-shrink: 0;
                }
                .theme-tabs { display: flex; background: #fff; border-bottom: 1px solid #eee; }
                .theme-tab {
                    flex: 1; text-align: center; padding: 12px 0; font-size: 14px; font-weight: 600;
                    color: #888; cursor: pointer; border-bottom: 2px solid transparent; transition: 0.3s;
                }
                .theme-tab.active { color: #a18cd1; border-bottom: 2px solid #a18cd1; }
                
                .theme-content { flex: 1; overflow-y: auto; padding: 16px; background: #f5f7fa; }
                .theme-pane { display: none; }
                .theme-pane.active { display: block; animation: fadeIn 0.3s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

                .input-group { margin-bottom: 16px; background: #fff; padding: 12px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
                .input-group label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 8px; }
                .input-group input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; transition: 0.2s; }
                .input-group input:focus { border-color: #a18cd1; box-shadow: 0 0 0 2px rgba(161, 140, 209, 0.2); }

                .app-edit-card { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 8px; }
                .app-edit-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; font-weight: 600; font-size: 15px; color:#333; }
                .app-row { display: flex; gap: 10px; }
                .app-row > div { flex: 1; }
                .app-row input { width: 100%; padding: 8px; border: 1px solid #eee; border-radius: 6px; font-size: 13px; outline: none; }
                
                .bottom-bar { display: flex; padding: 12px 16px; background: #fff; border-top: 1px solid #eee; gap: 12px; }
                .btn { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: 600; font-size: 15px; cursor: pointer; transition: 0.2s; text-align: center; }
                .btn-save { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); color: white; box-shadow: 0 4px 12px rgba(161,140,209,0.3); }
                .btn-save:active { transform: scale(0.96); }
                .btn-reset { background: #f0f0f0; color: #ff4d4f; }
                .btn-reset:active { background: #ffe5e5; }
            </style>
            `;
        }

        function generateHTML(appsList, currentSettings) {
            let appsHTML = '';
            appsList.forEach(app => {
                const conf = currentSettings.apps[app.id] || {};
                const nameVal = conf.name || '';
                let iconVal = conf.icon || '';
                const orderVal = conf.order !== undefined ? conf.order : '';

                // Bóc lớp vỏ <img> ra để UI nhìn gọn gàng nếu đó là link ảnh đã bọc
                if (iconVal.startsWith('<img src="') && iconVal.includes('data-auto="true"')) {
                    const match = iconVal.match(/src="([^"]+)"/);
                    if (match) iconVal = match[1];
                }

                appsHTML += `
                    <div class="app-edit-card" data-appid="${app.id}">
                        <div class="app-edit-header">
                            <span style="font-size:12px; background:#eee; padding:2px 6px; border-radius:4px; color:#666;">ID: ${app.id}</span>
                            ${escapeHtml(app.name)}
                        </div>
                        <div class="app-row">
                            <div><input type="text" class="inp-name" placeholder="Tên hiển thị mới..." value="${escapeHtml(nameVal)}"></div>
                            <div style="flex:0.4"><input type="number" class="inp-order" placeholder="Thứ tự..." value="${orderVal}"></div>
                        </div>
                        <div class="app-row">
                            <div><input type="text" class="inp-icon" placeholder="Dán URL ảnh hoặc Code SVG..." value="${escapeHtml(iconVal)}"></div>
                        </div>
                    </div>
                `;
            });

            return `
            <div id="theme-app" style="position:absolute;inset:0;background:#f5f7fa;display:flex;flex-direction:column;z-index:400; overflow:hidden;">
                <div class="theme-header">
                    <div id="theme-back-btn" style="color:#a18cd1; display:flex; align-items:center; gap:4px; cursor:pointer; width:60px;">
                        <span style="font-size:24px;line-height:1">‹</span> Đóng
                    </div>
                    <div style="flex:1; text-align:center; font-weight:bold; font-size:17px; color:#111;">Cá nhân hóa</div>
                    <div style="width:60px;"></div>
                </div>

                <div class="theme-tabs">
                    <div class="theme-tab active" data-tab="tab-bg">Hình nền</div>
                    <div class="theme-tab" data-tab="tab-apps">Ứng dụng</div>
                </div>

                <div class="theme-content">
                    <div id="tab-bg" class="theme-pane active">
                        <div class="input-group">
                            <label>URL Hình nền (Wallpaper)</label>
                            <input type="text" id="inp-wallpaper" placeholder="https://..." value="${escapeHtml(currentSettings.wallpaper || '')}">
                            <div style="margin-top:12px; font-size:12px; color:#888;">Để trống nếu muốn dùng nền mặc định từ Cài đặt hệ thống. Khuyên dùng ảnh tỉ lệ màn hình dọc.</div>
                        </div>
                        <div style="width:100%; height:300px; border-radius:12px; background:#ddd; border:2px dashed #bbb; overflow:hidden; display:flex; justify-content:center; align-items:center; position:relative;">
                            <img id="wallpaper-preview" src="${escapeHtml(currentSettings.wallpaper || '')}" style="width:100%;height:100%;object-fit:cover; display:${currentSettings.wallpaper ? 'block' : 'none'};">
                            <span id="wallpaper-placeholder" style="color:#888; font-size:14px; display:${currentSettings.wallpaper ? 'none' : 'block'};">Xem trước hình nền</span>
                        </div>
                    </div>

                    <div id="tab-apps" class="theme-pane">
                        <div style="font-size:13px; color:#666; margin-bottom:12px; text-align:center;">
                            Hệ thống tự nhận diện Link Ảnh. Nhập trống để giữ nguyên mặc định.
                        </div>
                        ${appsHTML}
                    </div>
                </div>

                <div class="bottom-bar">
                    <button id="btn-theme-reset" class="btn btn-reset">Khôi phục</button>
                    <button id="btn-theme-save" class="btn btn-save">Lưu & Áp dụng</button>
                </div>
            </div>
            `;
        }

        function escapeHtml(str) {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        // ============ Vòng đời App ============

        function openApp() {
            const phoneSystem = window.parent.PhoneSystem;
            if (!phoneSystem || !phoneSystem.iframeWindow) return;
            const iframeDoc = phoneSystem.iframeWindow.document;

            const homeScreen = iframeDoc.getElementById('home-screen');
            if (homeScreen) homeScreen.style.display = 'none';

            let appContainer = iframeDoc.getElementById('app-container');
            if (!appContainer) {
                const screen = iframeDoc.querySelector('.screen');
                if (screen) {
                    appContainer = iframeDoc.createElement('div');
                    appContainer.id = 'app-container';
                    appContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:300;pointer-events:none';
                    screen.appendChild(appContainer);
                }
            }

            const currentSettings = getSettings();
            const appsList = getRegisteredApps();

            appContainer.innerHTML = generateCSS() + generateHTML(appsList, currentSettings);
            appContainer.style.pointerEvents = 'auto';

            iframeDoc.getElementById('theme-back-btn').onclick = () => window.parent.PhoneSystem.goHome();

            const tabs = iframeDoc.querySelectorAll('.theme-tab');
            const panes = iframeDoc.querySelectorAll('.theme-pane');
            tabs.forEach(tab => {
                tab.onclick = () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    panes.forEach(p => p.classList.remove('active'));
                    tab.classList.add('active');
                    iframeDoc.getElementById(tab.dataset.tab).classList.add('active');
                };
            });

            const inpWallpaper = iframeDoc.getElementById('inp-wallpaper');
            const previewImg = iframeDoc.getElementById('wallpaper-preview');
            const previewPlaceholder = iframeDoc.getElementById('wallpaper-placeholder');
            inpWallpaper.oninput = () => {
                const val = inpWallpaper.value.trim();
                if (val) { previewImg.src = val; previewImg.style.display = 'block'; previewPlaceholder.style.display = 'none'; } 
                else { previewImg.style.display = 'none'; previewPlaceholder.style.display = 'block'; }
            };

            iframeDoc.getElementById('btn-theme-save').onclick = () => {
                let newSettings = { wallpaper: inpWallpaper.value.trim(), apps: {} };
                
                iframeDoc.querySelectorAll('.app-edit-card').forEach(card => {
                    const id = card.dataset.appid;
                    const name = card.querySelector('.inp-name').value.trim();
                    let icon = card.querySelector('.inp-icon').value.trim();
                    const order = card.querySelector('.inp-order').value.trim();

                    // SMART FIX: Tự động phát hiện và bọc Link Ảnh thành HTML Tag
                    if (icon && !icon.startsWith('<') && (icon.startsWith('http') || icon.startsWith('data:image'))) {
                        icon = `<img src="${icon}" data-auto="true" style="width:100%;height:100%;border-radius:14px;object-fit:cover;">`;
                    }

                    if (name || icon || order !== '') {
                        newSettings.apps[id] = {};
                        if (name) newSettings.apps[id].name = name;
                        if (icon) newSettings.apps[id].icon = icon;
                        if (order !== '') newSettings.apps[id].order = parseInt(order);
                    }
                });

                saveSettings(newSettings);
                if (window.parent.toastr) window.parent.toastr.success('Đã lưu Tùy chỉnh Theme!');
                
                applyDOMOverrides(iframeDoc);
                
                if (window.parent.PhoneSystem.iframeWindow) {
                    const patchedApps = window.parent.PhoneSystem.getAppsForRender();
                    window.parent.PhoneSystem.iframeWindow.postMessage({ type: 'render-apps', apps: patchedApps }, '*');
                }

                window.parent.PhoneSystem.goHome();
            };

            iframeDoc.getElementById('btn-theme-reset').onclick = () => {
                if(confirm('Xóa sạch cá nhân hóa và khôi phục về cấu hình mặc định?')) {
                    clearSettings();
                    const styleEl = iframeDoc.getElementById('custom-theme-override-styles');
                    if (styleEl) styleEl.remove();
                    
                    if (window.parent.PhoneSystem.iframeWindow) {
                        const originalApps = window.parent.PhoneSystem.getAppsForRender();
                        window.parent.PhoneSystem.iframeWindow.postMessage({ type: 'render-apps', apps: originalApps }, '*');
                    }

                    if (window.parent.toastr) window.parent.toastr.success('Đã khôi phục cài đặt gốc! Mở lại trang nếu icon Settings chưa đổi.');
                    window.parent.PhoneSystem.goHome();
                }
            };
        }

        function closeApp() {
            const phoneSystem = window.parent?.PhoneSystem;
            if (!phoneSystem?.iframeWindow) return;
            const iframeDoc = phoneSystem.iframeWindow.document;
            
            const appContainer = iframeDoc.getElementById('app-container');
            if (appContainer) { appContainer.innerHTML = ''; appContainer.style.pointerEvents = 'none'; }
            const homeScreen = iframeDoc.getElementById('home-screen');
            if (homeScreen) homeScreen.style.display = 'block';
        }

        window.parent.PhoneSystem.registerApp({
            id: APP_ID,
            name: APP_NAME,
            icon: APP_ICON,
            color: APP_COLOR,
            order: 19
        });

        window.parent.PhoneSystem.on('app-opened', function (data) {
            if (data.id === APP_ID) openApp();
        });

        window.parent.PhoneSystem.on('go-home', function () {
            closeApp();
            const iframeDoc = window.parent.PhoneSystem.iframeWindow?.document;
            if (iframeDoc) applyDOMOverrides(iframeDoc);
        });

        setTimeout(() => {
            const iframeDoc = window.parent.PhoneSystem.iframeWindow?.document;
            if (iframeDoc) applyDOMOverrides(iframeDoc);
        }, 1500);

        console.log('[Theme Manager] App Cá nhân hóa v1.2 đã sẵn sàng!');
    });
})();